import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Writes an event to the 'events' collection in Firestore.
 * @param {string} type - The type of event (e.g., 'feed', 'pet').
 * @param {object} payload - The data associated with the event.
 */
export const writeEvent = async (type, payload) => {
  try {
    const event = {
      type,
      payload,
      timestamp: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'events'), event);
    console.log('Event written with ID: ', docRef.id);
    return docRef;
  } catch (e) {
    console.error('Error adding event: ', e);
    // Here we would trigger the Retry Queue (Phase 6)
    return null;
  }
}; 