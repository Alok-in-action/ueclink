// ============================================================
// Matching Queue — simplified, no composite index required
// ============================================================

import { db } from '../firebase.js';
import {
  collection, doc, setDoc, deleteDoc, getDoc, getDocs,
  onSnapshot, query, where, limit, runTransaction,
  serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { createSession } from '../chat/session.js';

const QUEUE = 'matchingQueue';

/** Enter the matching queue */
export async function enterQueue(profile, prefs) {
  const ref = doc(db, QUEUE, profile.userId);
  await setDoc(ref, {
    userId:    profile.userId,
    year:      profile.currentYear || 1,
    gender:    profile.gender || 'unknown',
    sameYear:  prefs.sameYear ?? true,
    oppGender: prefs.oppositeGender ?? false,
    status:    'waiting',
    locked:    false,
    timestamp: serverTimestamp(),
  });
  console.log('[Queue] entered queue:', profile.userId);
}

/** Leave the queue */
export async function leaveQueue(userId) {
  try {
    await deleteDoc(doc(db, QUEUE, userId));
    console.log('[Queue] left queue:', userId);
  } catch (_) {}
}

/**
 * Listen for own queue doc status → fires when matched.
 * Returns unsubscribe function.
 */
export function listenForMatch(userId, onMatched) {
  const ref = doc(db, QUEUE, userId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    console.log('[Queue] status update:', data.status, data.sessionId);
    if (data.status === 'matched' && data.sessionId) {
      onMatched({ 
        sessionId: data.sessionId, 
        partnerId: data.partnerId,
        partnerYear: data.partnerYear 
      });
    }

  });
}

/**
 * Try to match current user with someone in the queue.
 * Simple query — no composite index needed.
 */
export async function tryMatch(userId, profile, prefs) {
  try {
    // Simple query: just get waiting, unlocked users (no orderBy → no index needed)
    const q = query(
      collection(db, QUEUE),
      where('status', '==', 'waiting'),
      where('locked', '==', false),
      limit(20)
    );

    const snap = await getDocs(q);
    const candidates = [];
    snap.forEach(d => {
      if (d.id !== userId) candidates.push(d.data());
    });

    console.log('[Queue] candidates found:', candidates.length);
    if (candidates.length === 0) return;

    // Sort by preference match score
    const scored = candidates.map(c => {
      let score = 0;
      if (prefs.sameYear && c.year === profile.currentYear) score += 2;
      if (prefs.oppositeGender && c.gender !== profile.gender) score += 1;
      return { ...c, score };
    }).sort((a, b) => b.score - a.score);

    const partner = scored[0];
    console.log('[Queue] attempting match with:', partner.userId);

    // Atomic lock via transaction
    const myRef      = doc(db, QUEUE, userId);
    const partnerRef = doc(db, QUEUE, partner.userId);

    await runTransaction(db, async (tx) => {
      const [mySnap, ptSnap] = await Promise.all([
        tx.get(myRef),
        tx.get(partnerRef),
      ]);

      if (!mySnap.exists() || mySnap.data().status !== 'waiting' || mySnap.data().locked) {
        throw new Error('my-doc-stale');
      }
      if (!ptSnap.exists() || ptSnap.data().status !== 'waiting' || ptSnap.data().locked) {
        throw new Error('partner-doc-stale');
      }

      tx.update(myRef,      { locked: true });
      tx.update(partnerRef, { locked: true });
    });

    // Create RTDB session
    const sessionId = await createSession(userId, partner.userId);
    
    // Get year labels for instant sync
    const myYearLabel      = profile.yearLabel || 'UEC Student';
    const partnerYearLabel = partner.yearLabel || 'UEC Student';


    // Mark both as matched
    await Promise.all([
      setDoc(myRef, {
        status: 'matched', sessionId, partnerId: partner.userId, locked: false,
        partnerYear: partnerYearLabel
      }, { merge: true }),
      setDoc(partnerRef, {
        status: 'matched', sessionId, partnerId: userId, locked: false,
        partnerYear: myYearLabel
      }, { merge: true }),
    ]);


    console.log('[Queue] matched!', userId, '↔', partner.userId);

  } catch (err) {
    if (err.message !== 'my-doc-stale' && err.message !== 'partner-doc-stale') {
      console.error('[Queue] tryMatch error:', err);
    }
    // Unlock self if locked
    try {
      const mySnap = await getDoc(doc(db, QUEUE, userId));
      if (mySnap.exists() && mySnap.data().locked) {
        await updateDoc(doc(db, QUEUE, userId), { locked: false });
      }
    } catch (_) {}
  }
}
