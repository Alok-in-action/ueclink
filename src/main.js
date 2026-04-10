// ============================================================
// UEC Link — Main Entry Point
// ============================================================

import './styles/main.css';
import { auth, provider, db, isFirebaseConfigured } from './firebase.js';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { showScreen } from './router.js';
import { parseUECEmail } from './utils/parseEmail.js';
import { showToast } from './ui/toast.js';

// Screens
import { LandingScreen }     from './screens/LandingScreen.js';
import { AuthErrorScreen }   from './screens/AuthErrorScreen.js';
import { BanScreen }         from './screens/BanScreen.js';
import { GenderScreen }      from './screens/GenderScreen.js';
import { PreferencesScreen } from './screens/PreferencesScreen.js';
import { MatchingScreen }    from './screens/MatchingScreen.js';
import { ChatScreen }        from './screens/ChatScreen.js';
import { PostChatScreen }    from './screens/PostChatScreen.js';
import { DebugScreen }       from './screens/DebugScreen.js';

// ── App State ────────────────────────────────────────────────
let currentUser   = null;
let userProfile   = null;
let activeCleanup = null;

// ── Boot ─────────────────────────────────────────────────────
if (window.location.pathname === '/debug') {
  showScreen(DebugScreen());
} else {
  goToLanding();
}

// ── Auth listener ─────────────────────────────────────────────
onAuthStateChanged(auth, async (firebaseUser) => {
  if (window.location.pathname === '/debug') return;

  if (!firebaseUser) {
    // Signed out — go back to landing
    currentUser  = null;
    userProfile  = null;
    goToLanding();
    return;
  }

  // ── 1. Domain check (plus Admin bypass) ──────────────────
  const emailLower = (firebaseUser.email || '').toLowerCase();
  const isAdmin    = emailLower === 'ueclink@gmail.com';
  
  if (!emailLower.endsWith('@uecu.ac.in') && !isAdmin) {
    await signOut(auth);
    showScreen(AuthErrorScreen({ onRetry: goToLanding }));
    return;
  }



  currentUser = firebaseUser;

  // ── 2. Build profile from email instantly (no Firestore needed) ──
  const parsed = parseUECEmail(firebaseUser.email);
  if (!parsed) {
    showToast('Could not parse your college email. Contact admin.', 'error', 5000);
    return;
  }

  if (parsed.isBlocked) {
    showToast('Access restricted to 1st–4th year students.', 'error', 6000);
    await signOut(auth);
    return;
  }


  userProfile = {
    userId:      firebaseUser.uid,
    displayName: firebaseUser.displayName || '',
    email:       firebaseUser.email,
    photoURL:    firebaseUser.photoURL || '',
    ...parsed,
    gender:      null,
  };

  // Restore saved gender from sessionStorage (instant, no network)
  try {
    const cached = sessionStorage.getItem(`ueclink_${firebaseUser.uid}`);
    if (cached) {
      const saved = JSON.parse(cached);
      userProfile.gender = saved.gender || null;
    }
  } catch (_) {}

  // ── 3. Initialize Presence (RTDB) ───────────────────────────
  import('./presence/rtdbPresence.js').then(({ initPresence }) => {
    initPresence(firebaseUser.uid, userProfile);
  });

  // ── 4. Navigate immediately ──────────────────────────────────
  if (parsed.isAdmin) {
    import('./screens/AdminScreen.js').then(({ AdminScreen }) => {
      showScreen(AdminScreen({ onBack: goToLanding }));
    });
  } else if (!userProfile.gender) {
    goToGender();
  } else {
    goToPreferences();
  }



  // ── 4. Background tasks (non-blocking, never delay UI) ───────
  tryFirestoreProfile(firebaseUser, parsed).then(fsProfile => {
    if (fsProfile?.gender && !userProfile.gender) {
      userProfile.gender = fsProfile.gender;
    }
  }).catch(() => {});

  import('./reports/report.js').then(({ checkBanStatus }) => {
    checkBanStatus(firebaseUser.uid).then(ban => {
      if (ban.banned) {
        showScreen(BanScreen({ until: ban.until }));
      }
    }).catch(() => {});
  }).catch(() => {});

});

// ── Navigation ────────────────────────────────────────────────

function goToLanding() {
  cleanup();
  showScreen(LandingScreen({ onGoogleLogin: doGoogleLogin }), true);
}

function goToGender() {
  cleanup();
  showScreen(GenderScreen({
    profile:  userProfile,
    onBack:   () => { signOut(auth); goToLanding(); },
    onSelect: (gender) => {
      userProfile.gender = gender;
      try {
        sessionStorage.setItem(`ueclink_${currentUser.uid}`, JSON.stringify({ gender }));
      } catch (_) {}
      trySetGender(currentUser.uid, gender);
      goToPreferences();
    },
  }));
}

function goToPreferences() {
  cleanup();
  showScreen(PreferencesScreen({
    profile: userProfile,
    onBack:  () => goToGender(),
    onStart: (prefs) => goToMatching(prefs),
  }));
}

function goToMatching(prefs) {
  cleanup();
  const screen = MatchingScreen({
    profile:   userProfile,
    prefs,
    onBack:    () => goToPreferences(),
    onMatched: ({ sessionId, partnerId, partnerYear }) => goToChat(sessionId, partnerId, partnerYear),
    onCancel:  () => goToPreferences(),
  });
  activeCleanup = () => { if (screen._cleanup) screen._cleanup(); };
  showScreen(screen);
}

function goToChat(sessionId, partnerId, partnerYear) {
  cleanup();
  const screen = ChatScreen({
    sessionId,
    myUserId:         currentUser.uid,
    partnerId:        partnerId,
    partnerYearLabel: partnerYear,
    myProfile:        userProfile,

    onEnd: ({ sessionId }) => goToPostChat(sessionId),
  });
  activeCleanup = () => { if (screen._cleanup) screen._cleanup(); };
  showScreen(screen);
}

function goToPostChat() {
  cleanup();
  const screen = PostChatScreen({
    onFindNew: () => goToPreferences(),
  });
  activeCleanup = () => { if (screen._cleanup) screen._cleanup(); };
  showScreen(screen, true);
}

function cleanup() {
  if (activeCleanup) { activeCleanup(); activeCleanup = null; }
}

// ── Google Login ──────────────────────────────────────────────

async function doGoogleLogin() {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
    console.error('[UECLink] login error:', err.code, err.message);
    showToast(`Login error: ${err.code}`, 'error', 8000);
  }
}

// ── Firestore helpers (best-effort, never block UI) ───────────

async function tryFirestoreProfile(user, parsed) {
  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  
  const profileData = {
    userId:      user.uid,
    displayName: user.displayName || '',
    email:       user.email,
    ...parsed,
    // gender: null, // Don't reset gender here
    lastSeen:    serverTimestamp(),
  };

  if (snap.exists()) {
    // Update year/branch/name just in case they changed or time passed
    await setDoc(ref, profileData, { merge: true });
    return snap.data();
  }

  // Create new
  await setDoc(ref, {
    ...profileData,
    gender:      null,
    reportCount: 0,
    bannedUntil: null,
    createdAt:   serverTimestamp(),
  });
  return null;
}

async function trySetGender(uid, gender) {
  try {
    await setDoc(doc(db, 'users', uid), { gender }, { merge: true });
  } catch (_) {}
}
