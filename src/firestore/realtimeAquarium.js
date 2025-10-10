import { db } from '../firebase';
import { collection, doc, setDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';

const REALTIME_COLLECTION = 'realtime-aquarium';
const SIMULATION_MASTER_DOC = 'simulation-master';

/**
 * Sanitizes fish data for Firebase storage
 */
const sanitizeFishData = (fish) => {
  const sanitized = {};
  
  // Go through each property and handle appropriately
  Object.keys(fish).forEach(key => {
    const value = fish[key];
    
    // Skip undefined values and Three.js objects
    if (value === undefined || key === 'ref') {
      return;
    }
    
    // Handle nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Handle Three.js Vector3 objects
      if (value.toArray && typeof value.toArray === 'function') {
        sanitized[key] = value.toArray();
        return;
      }
      
      // Handle nested objects recursively
      const nestedSanitized = {};
      Object.keys(value).forEach(nestedKey => {
        const nestedValue = value[nestedKey];
        if (nestedValue !== undefined) {
          nestedSanitized[nestedKey] = nestedValue;
        }
      });
      sanitized[key] = nestedSanitized;
    } else {
      // Handle primitive values and arrays
      sanitized[key] = value;
    }
  });
  
  return sanitized;
};

/**
 * Updates a fish's position in the real-time aquarium
 */
export const updateFishPosition = async (fishId, position, velocity) => {
  if (!db) return;
  
  try {
    const sanitizedData = sanitizeFishData({
      position: position.toArray ? position.toArray() : position,
      velocity: velocity.toArray ? velocity.toArray() : velocity,
      lastUpdated: serverTimestamp(),
    });
    
    await setDoc(doc(db, REALTIME_COLLECTION, fishId), sanitizedData);
  } catch (error) {
    console.error('Error updating fish position:', error);
  }
};

/**
 * Updates multiple fish positions at once (more efficient)
 */
export const updateAllFishPositions = async (fishData) => {
  if (!db) return;
  
  try {
    const batch = [];
    Object.entries(fishData).forEach(([fishId, fish]) => {
      // Sanitize the complete fish data before storing
      const sanitizedFish = sanitizeFishData({
        ...fish,
        position: fish.position?.toArray ? fish.position.toArray() : fish.position,
        velocity: fish.velocity?.toArray ? fish.velocity.toArray() : fish.velocity,
        lastUpdated: serverTimestamp(),
      });
      
      batch.push(setDoc(doc(db, REALTIME_COLLECTION, fishId), sanitizedFish));
    });
    
    await Promise.all(batch);
  } catch (error) {
    console.error('🔥 Firebase error updating fish positions:', error);
    // Don't spam errors - only log every 10th error
    if (Math.random() < 0.1) {
      console.warn('Firebase connection may be down. Fish will continue locally.');
    }
  }
};

/**
 * Listens to real-time fish position updates
 */
export const subscribeToFishPositions = (callback) => {
  if (!db) return () => {};
  
  const q = query(collection(db, REALTIME_COLLECTION));
  
  return onSnapshot(q, (querySnapshot) => {
    const positions = {};
    querySnapshot.forEach((doc) => {
      if (doc.id !== SIMULATION_MASTER_DOC) {
        positions[doc.id] = doc.data();
      }
    });
    callback(positions);
  }, (error) => {
    console.error('Error listening to fish positions:', error);
  });
};

/**
 * Claims to be the simulation master (only one browser should run the simulation)
 */
export const claimSimulationMaster = async (sessionId) => {
  if (!db) return false;
  
  try {
    await setDoc(doc(db, REALTIME_COLLECTION, SIMULATION_MASTER_DOC), {
      sessionId,
      claimedAt: serverTimestamp(),
      lastHeartbeat: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error claiming simulation master:', error);
    return false;
  }
};

/**
 * Checks if this session is the simulation master
 */
export const isSimulationMaster = (callback) => {
  if (!db) return () => {};
  
  return onSnapshot(doc(db, REALTIME_COLLECTION, SIMULATION_MASTER_DOC), (doc) => {
    callback(doc.exists() ? doc.data() : null);
  });
};

/**
 * Updates heartbeat to show this master is still active
 */
export const updateMasterHeartbeat = async () => {
  if (!db) return;
  
  try {
    await setDoc(doc(db, REALTIME_COLLECTION, SIMULATION_MASTER_DOC), {
      lastHeartbeat: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating master heartbeat:', error);
  }
}; 