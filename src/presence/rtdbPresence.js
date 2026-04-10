// ============================================================
// RTDB Presence Manager — Real-time online status
// ============================================================

import { rtdb } from '../firebase.js';
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';

/**
 * Tracks a user's online state in Realtime Database.
 * Automatically handles disconnects.
 */
export function initPresence(userId, profile) {
  if (!rtdb || !userId) return;

  const myPresenceRef = ref(rtdb, `presence/${userId}`);
  const connectedRef  = ref(rtdb, '.info/connected');

  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      // We are connected (or reconnected)
      const disconnectRef = onDisconnect(myPresenceRef);
      
      // When I disconnect, remove this node
      disconnectRef.remove();

      // Set online status
      set(myPresenceRef, {
        online:   true,
        lastSeen: serverTimestamp(),
        name:     profile.displayName || 'Anonymous',
        branch:   profile.branch || 'Unknown',
        year:     profile.year || '',
      });
    }
  });
}
