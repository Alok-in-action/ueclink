// ============================================================
// Matching Queue — lock-based Firestore matching engine
// ============================================================

import { db } from '../firebase.js';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  query, where, orderBy, limit, runTransaction,
  serverTimestamp, getDoc,
} from 'firebase/firestore';
import { createSession } from '../chat/session.js';

const QUEUE = 'matchingQueue';

/**
 * Enter the matching queue.
 */
export async function enterQueue(profile, prefs) {
  const ref = doc(db, QUEUE, profile.userId);
  await setDoc(ref, {
    userId:    profile.userId,
    year:      profile.currentYear,
    gender:    profile.gender,
    preferences: prefs,
    status:    'waiting',
    locked:    false,
    timestamp: serverTimestamp(),
  });
}

/**
 * Leave the queue (cancel or disconnect).
 */
export async function leaveQueue(userId) {
  try {
    await deleteDoc(doc(db, QUEUE, userId));
  } catch (_) {}
}

/**
 * Listen for own queue doc — fires when status changes to "matched".
 */
export function listenForMatch(userId, onMatched) {
  const ref = doc(db, QUEUE, userId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.status === 'matched' && data.sessionId) {
      onMatched({ sessionId: data.sessionId, partnerId: data.partnerId });
    }
  });
}

/**
 * Try to match the current user with someone in the queue.
 * Uses a Firestore transaction to lock both atomically.
 */
export async function tryMatch(userId, profile, prefs) {
  // Build query — prefer same year if toggled
  let q = query(
    collection(db, QUEUE),
    where('status', '==', 'waiting'),
    where('locked', '==', false),
    orderBy('timestamp'),
    limit(10)
  );

  const { docs } = await (await import('firebase/firestore')).getDocs(q);

  const candidates = docs
    .map(d => d.data())
    .filter(d => d.userId !== userId);

  if (candidates.length === 0) return;

  // Priority: same year + gender pref first, then any
  let partner = null;

  if (prefs.sameYear) {
    partner = candidates.find(c =>
      c.year === profile.currentYear &&
      (!prefs.oppositeGender || c.gender !== profile.gender)
    );
  }
  if (!partner && prefs.oppositeGender) {
    partner = candidates.find(c => c.gender !== profile.gender);
  }
  if (!partner) partner = candidates[0];

  if (!partner) return;

  // Atomic lock + create session
  const myRef      = doc(db, QUEUE, userId);
  const partnerRef = doc(db, QUEUE, partner.userId);

  try {
    await runTransaction(db, async (tx) => {
      const mySnap = await tx.get(myRef);
      const ptSnap = await tx.get(partnerRef);

      // Re-check status inside transaction
      if (!mySnap.exists() || mySnap.data().status !== 'waiting' || mySnap.data().locked) throw new Error('stale');
      if (!ptSnap.exists() || ptSnap.data().status !== 'waiting' || ptSnap.data().locked) throw new Error('stale');

      // Lock both
      tx.update(myRef,      { locked: true });
      tx.update(partnerRef, { locked: true });

      // Create session in RTDB (done outside transaction — see below)
    });

    // Create RTDB session
    const sessionId = await createSession(userId, partner.userId);

    // Write match result to both docs
    const matchData = (myId, theirId) => ({
      status: 'matched', sessionId, partnerId: theirId, locked: false,
    });

    await Promise.all([
      setDoc(myRef,      matchData(userId, partner.userId), { merge: true }),
      setDoc(partnerRef, matchData(partner.userId, userId), { merge: true }),
    ]);

  } catch (err) {
    // Unlock self if anything went wrong
    try { await setDoc(myRef, { locked: false }, { merge: true }); } catch (_) {}
  }
}
