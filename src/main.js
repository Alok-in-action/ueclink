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

  // ── 1. Domain check ──────────────────────────────────────
  if (!firebaseUser.email?.endsWith('@uecu.ac.in')) {
    await signOut(auth);
    showScreen(AuthErrorScreen({ onRetry: goToLanding }));
    return;
  }

  currentUser = firebaseUser;

  // ── 2. Build profile from email (never blocks on Firestore) ──
  const parsed = parseUECEmail(firebaseUser.email);
  if (!parsed) {
    showToast('Could not parse your college email. Contact admin.', 'error', 5000);
    return;
  }

  // Start with local-only profile (works even without Firestore)
  userProfile = {
    userId:      firebaseUser.uid,
    displayName: firebaseUser.displayName || '',
    email:       firebaseUser.email,
    photoURL:    firebaseUser.photoURL || '',
    ...parsed,
    gender:      null,
  };

  // Try to load saved gender from sessionStorage first (instant)
  try {
    const cached = sessionStorage.getItem(`ueclink_${firebaseUser.uid}`);
    if (cached) {
      const saved = JSON.parse(cached);
      userProfile.gender = saved.gender || null;
    }
  } catch (_) {}

  // ── 3. Try Firestore in background (non-blocking) ────────
  tryFirestoreProfile(firebaseUser, parsed).then(fsProfile => {
    if (fsProfile && fsProfile.gender && !userProfile.gender) {
      userProfile.gender = fsProfile.gender;
    }
  }).catch(() => {});

  // ── 4. Check ban (Firestore optional) ────────────────────
  let banned = false;
  try {
    const { checkBanStatus } = await import('./reports/report.js');
    const ban = await checkBanStatus(firebaseUser.uid);
    if (ban.banned) {
      showScreen(BanScreen({ until: ban.until }));
      return;
    }
  } catch (_) {
    // Firestore not ready — skip ban check, allow through
  }

  // ── 5. Route based on gender ─────────────────────────────
  if (!userProfile.gender) {
    goToGender();
  } else {
    goToPreferences();
  }
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
    onSelect: (gender) => {
      userProfile.gender = gender;
      // Save to sessionStorage instantly (works offline)
      try {
        sessionStorage.setItem(`ueclink_${currentUser.uid}`, JSON.stringify({ gender }));
      } catch (_) {}
      // Also try Firestore in background
      trySetGender(currentUser.uid, gender);
      goToPreferences();
    },
  }));
}

function goToPreferences() {
  cleanup();
  showScreen(PreferencesScreen({
    profile: userProfile,
    onStart: (prefs) => goToMatching(prefs),
  }));
}

function goToMatching(prefs) {
  cleanup();
  const screen = MatchingScreen({
    profile:   userProfile,
    prefs,
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
    onEnd: ({ sessionId }) => goToPostChat(sessionId),
  });
  activeCleanup = () => { if (screen._cleanup) screen._cleanup(); };
  showScreen(screen);
}

function goToPostChat(sessionId) {
  cleanup();
  const screen = PostChatScreen({
    myUserId:  currentUser.uid,
    sessionId,
    myProfile: userProfile,
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
    // onAuthStateChanged handles routing
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
    showToast('Login failed. Please try again.', 'error');
    console.error('[UECLink] login error:', err);
  }
}

// ── Firestore helpers (best-effort, never block UI) ───────────

async function tryFirestoreProfile(user, parsed) {
  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data();
  }
  // Create profile doc if it doesn't exist
  await setDoc(ref, {
    userId:      user.uid,
    displayName: user.displayName || '',
    email:       user.email,
    ...parsed,
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
