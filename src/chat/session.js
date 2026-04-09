// ============================================================
// Chat Session Manager — Firebase Realtime Database
// ============================================================

import { rtdb } from '../firebase.js';
import {
  ref, set, push, onValue, update, off, remove,
  serverTimestamp as rtServerTimestamp,
} from 'firebase/database';

/**
 * Create a new chat session in RTDB.
 * @returns {string} sessionId
 */
export async function createSession(userIdA, userIdB) {
  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const sessionRef = ref(rtdb, `sessions/${sessionId}`);
  await set(sessionRef, {
    users:     { [userIdA]: true, [userIdB]: true },
    status:    'active',
    createdAt: rtServerTimestamp(),
  });
  return sessionId;
}

/**
 * Send a message to the session.
 */
export async function sendMessage(sessionId, senderId, text) {
  const msgRef = ref(rtdb, `sessions/${sessionId}/messages`);
  const newMsg = push(msgRef);
  await set(newMsg, {
    senderId,
    text,
    timestamp: rtServerTimestamp(),
    delivered: false,
  });
  return newMsg.key;
}

/**
 * Mark a specific message as delivered.
 */
export function markDelivered(sessionId, msgKey) {
  update(ref(rtdb, `sessions/${sessionId}/messages/${msgKey}`), { delivered: true });
}

/**
 * Listen for new messages in a session.
 * @returns cleanup function
 */
export function listenMessages(sessionId, callback) {
  const msgRef = ref(rtdb, `sessions/${sessionId}/messages`);
  onValue(msgRef, (snap) => {
    const msgs = [];
    snap.forEach((child) => {
      msgs.push({ key: child.key, ...child.val() });
    });
    callback(msgs);
  });
  return () => off(msgRef);
}

/**
 * Set typing state for a user in a session.
 */
export function setTyping(sessionId, userId, isTyping) {
  const typingRef = ref(rtdb, `sessions/${sessionId}/typing/${userId}`);
  set(typingRef, isTyping);
}

/**
 * Listen for partner typing state.
 * @returns cleanup function
 */
export function listenTyping(sessionId, myUserId, callback) {
  const typingRef = ref(rtdb, `sessions/${sessionId}/typing`);
  onValue(typingRef, (snap) => {
    const data = snap.val() || {};
    // Is anyone OTHER than me typing?
    const partnerTyping = Object.keys(data).some(uid => uid !== myUserId && data[uid] === true);
    callback(partnerTyping);
  });
  return () => off(typingRef);
}

/**
 * Listen for session status changes (active | ended).
 * @returns cleanup function
 */
export function listenSessionStatus(sessionId, callback) {
  const statusRef = ref(rtdb, `sessions/${sessionId}/status`);
  onValue(statusRef, (snap) => callback(snap.val()));
  return () => off(statusRef);
}

/**
 * End a session — marks as ended, schedules RTDB cleanup.
 */
export async function endSession(sessionId) {
  await update(ref(rtdb, `sessions/${sessionId}`), { status: 'ended' });
  // Clean up RTDB after 30s to save free quota
  setTimeout(async () => {
    try { await remove(ref(rtdb, `sessions/${sessionId}`)); } catch (_) {}
  }, 30_000);
}
