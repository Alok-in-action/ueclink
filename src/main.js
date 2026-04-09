// ============================================================
// UEC Link — Main Entry Point (Stable Boot version)
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

// ── App State ────────────────────────────────────────────────
let currentUser   = null;
let userProfile   = null;
let activeCleanup = null;
let initialized   = false;

// ── Boot sequence ─────────────────────────────────────────────
function init() {
  cleanup();
  // Show a simple splash screen while waiting for Firebase Auth
  const splash = document.createElement('div');
  splash.className = 'page-inner';
  splash.style.justifyContent = 'center';
  splash.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:20px;">
      <div style="font-size:32px;animation:pulse-hint 1.5s infinite;">💎</div>
      <div style="font-size:12px;color:var(--text-muted);font-weight:600;letter-spacing:1px;text-transform:uppercase;">
        Restoring Session...
      </div>
    </div>
  `;
  showScreen(splash);
}

// ── Auth listener (The Source of Truth for Routing) ──────────
onAuthStateChanged(auth, async (firebaseUser) => {
  initialized = true;

  if (!firebaseUser) {
    currentUser  = null;
    userProfile  = null;
    goToLanding();
    return;
  }

  // 1. Domain check (plus Admin bypass)
  const isAdmin = firebaseUser.email === 'ueclink@gmail.com';
  if (!firebaseUser.email?.endsWith('@uecu.ac.in') && !isAdmin) {
    if (currentUser) {
      // Only sign out if we weren't already blocked - prevents loops
      await signOut(auth);
      showScreen(AuthErrorScreen({ onRetry: goToLanding }));
    }
    return;
  }

  // Already checked and logged in? Don't re-init UI if we're on a subpage
  if (currentUser?.uid === firebaseUser.uid && userProfile) {
    return;
  }

  currentUser = firebaseUser;

  // 2. Build profile instantly
  const parsed = parseUECEmail(firebaseUser.email);
  userProfile = {
    userId:      firebaseUser.uid,
    displayName: firebaseUser.displayName || '',
    email:       firebaseUser.email,
    photoURL:    firebaseUser.photoURL || '',
    ...parsed,
    gender:      null,
  };

  // Restore saved gender from sessionStorage
  try {
    const cached = sessionStorage.getItem(`ueclink_${firebaseUser.uid}`);
    if (cached) {
      const saved = JSON.parse(cached);
      userProfile.gender = saved.gender || null;
    }
  } catch (_) {}

  // 3. Simple Routing based on state
  if (parsed.isAdmin) {
    import('./screens/AdminScreen.js').then(({ AdminScreen }) => {
      showScreen(AdminScreen({ onBack: () => { signOut(auth); goToLanding(); } }));
    });
  } else if (!userProfile.gender) {
    goToGender();
  } else {
    goToPreferences();
  }

  // 4. Background tasks
  tryFirestoreProfile(firebaseUser, parsed).then(fsProfile => {
    if (fsProfile?.gender && !userProfile.gender) {
      userProfile.gender = fsProfile.gender;
      // If we were on gender screen, move to preferences now that we know gender
      if (document.querySelector('.gender-screen')) {
         goToPreferences();
      }
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
      try { sessionStorage.setItem(`ueclink_${currentUser.uid}`, JSON.stringify({ gender })); } catch (_) {}
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
    onMatched: ({ sessionId, partnerId }) => goToChat(sessionId, partnerId),
    onCancel:  () => goToPreferences(),
  });
  activeCleanup = () => { if (screen._cleanup) screen._cleanup(); };
  showScreen(screen);
}

function goToChat(sessionId, partnerId) {
  cleanup();
  const screen = ChatScreen({
    sessionId,
    myUserId:        currentUser.uid,
    partnerYearLabel: userProfile.yearLabel,
    myProfile:        userProfile,
    onEnd: () => goToPostChat(),
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

// ── Auth Handlers ─────────────────────────────────────────────

async function doGoogleLogin() {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
    showToast(`Login error: ${err.code}`, 'error', 8000);
  }
}

// ── Firestore Helpers ──────────────────────────────────────────

async function tryFirestoreProfile(user, parsed) {
  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const profileData = {
    userId:      user.uid,
    displayName: user.displayName || '',
    email:       user.email,
    ...parsed,
    lastSeen:    serverTimestamp(),
  };

  if (snap.exists()) {
    await setDoc(ref, profileData, { merge: true });
    return snap.data();
  }

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
  try { await setDoc(doc(db, 'users', uid), { gender }, { merge: true }); } catch (_) {}
}

// Launch
init();
