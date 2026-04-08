// ============================================================
// Reports + Soft Ban System
// ============================================================

import { db } from '../firebase.js';
import {
  collection, doc, addDoc, runTransaction, serverTimestamp,
  getDoc, Timestamp,
} from 'firebase/firestore';

const BAN_LEVELS = [
  { threshold: 3, hours: 1  },
  { threshold: 5, hours: 24 },
  { threshold: 7, hours: 999999 }, // permanent
];

/**
 * Submit a report. Increments reportCount on the reported user
 * and applies a ban if threshold is crossed.
 */
export async function submitReport(reporterId, reportedUserId, sessionId, reason) {
  // Write report doc
  await addDoc(collection(db, 'reports'), {
    reporterId,
    reportedUserId,
    sessionId,
    reason,
    createdAt: serverTimestamp(),
  });

  // Increment report count + apply ban if needed
  const userRef = doc(db, 'users', reportedUserId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) return;
    const data   = snap.data();
    const count  = (data.reportCount || 0) + 1;
    let bannedUntil = data.bannedUntil || null;

    const level = [...BAN_LEVELS].reverse().find(l => count >= l.threshold);
    if (level) {
      const until = new Date();
      until.setHours(until.getHours() + level.hours);
      bannedUntil = Timestamp.fromDate(until);
    }

    tx.update(userRef, { reportCount: count, bannedUntil });
  });
}

/**
 * Check if user is currently banned.
 * @returns {{ banned: boolean, until: Date|null }}
 */
export async function checkBanStatus(userId) {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return { banned: false, until: null };
    const { bannedUntil } = snap.data();
    if (!bannedUntil) return { banned: false, until: null };
    const until = bannedUntil.toDate();
    if (until > new Date()) return { banned: true, until };
    return { banned: false, until: null };
  } catch (_) {
    return { banned: false, until: null };
  }
}
