import { db } from '../firebase';
import { collection, doc, setDoc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';

const REALTIME_COLLECTION = 'realtime-aquarium';
const SIMULATION_MASTER_DOC = 'simulation-master';

/**
 * Updates a fish's position in the real-time aquarium
 */
export const updateFishPosition = async (fishId, position, velocity) => {
  if (!db) return;
  
  try {
    await setDoc(doc(db, REALTIME_COLLECTION, fishId), {
      position: position.toArray ? position.toArray() : position,
      velocity: velocity.toArray ? velocity.toArray() : velocity,
      lastUpdated: serverTimestamp(),
    });
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
      // Store complete fish data, not just position/velocity
      const fishDataToStore = {
        ...fish,
        position: fish.position.toArray ? fish.position.toArray() : fish.position,
        velocity: fish.velocity.toArray ? fish.velocity.toArray() : fish.velocity,
        lastUpdated: serverTimestamp(),
      };
      
      // Remove Three.js objects that can't be serialized
      delete fishDataToStore.ref;
      
      batch.push(setDoc(doc(db, REALTIME_COLLECTION, fishId), fishDataToStore));
    });
    
    await Promise.all(batch);
  } catch (error) {
    console.error('Error updating fish positions:', error);
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