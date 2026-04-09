// ============================================================
// Presence Counter — fake presence layer + real count
// ============================================================

import { db } from '../firebase.js';
import {
  doc, getDoc, runTransaction, serverTimestamp,
} from 'firebase/firestore';

const META_REF = () => doc(db, 'meta', 'presence');

export async function setUserOnline(userId) {
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(META_REF());
      const current = snap.exists() ? (snap.data().count || 0) : 0;
      tx.set(META_REF(), { count: current + 1, updatedAt: serverTimestamp() }, { merge: true });
    });
  } catch (_) { /* silent fail */ }
}

export async function setUserOffline(userId) {
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(META_REF());
      const current = snap.exists() ? (snap.data().count || 0) : 0;
      tx.set(META_REF(), { count: Math.max(0, current - 1), updatedAt: serverTimestamp() }, { merge: true });
    });
  } catch (_) { /* silent fail */ }
}

export async function getOnlineCount() {
  try {
    const snap = await getDoc(META_REF());
    return snap.exists() ? (snap.data().count || 0) : 0;
  } catch (_) {
    return 0;
  }
}


export function getMatchesRecentText() {
  // Small random variation to feel alive
  const n = 2 + Math.floor(Math.random() * 4);
  return `~${n} matches found recently`;
}
