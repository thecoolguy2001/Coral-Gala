import { db } from '../firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { getDefaultFish } from '../models/fishModel';

/**
 * Sanitizes fish data for Firebase storage (copied from realtimeAquarium.js)
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
 * Initializes the fish collection with default fish if needed
 */
export const initializeFishCollection = async () => {
  if (!db) {
    console.log('❌ Firebase not initialized, skipping fish collection initialization');
    return;
  }

  try {
    // Check current fish collection
    const fishCollection = collection(db, 'fish');
    const fishSnapshot = await getDocs(fishCollection);
    
    console.log(`📊 Current fish collection has ${fishSnapshot.size} documents`);
    
    // Get the default fish
    const defaultFish = getDefaultFish();
    
    // If we don't have all 4 fish, initialize with defaults
    if (fishSnapshot.size !== 4) {
      console.log('🔧 Initializing fish collection with 4 default fish...');
      
      // Add each default fish to Firestore
      const promises = defaultFish.map(async (fish) => {
        // Sanitize the fish data before saving
        const fishToSave = sanitizeFishData({
          ...fish,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        console.log(`💾 Saving fish ${fish.id} to Firestore:`, fishToSave);
        return setDoc(doc(db, 'fish', fish.id), fishToSave);
      });
      
      await Promise.all(promises);
      console.log('✅ Successfully initialized fish collection with 4 default fish');
    } else {
      console.log('✅ Fish collection already has the correct number of fish');
    }
  } catch (error) {
    console.error('❌ Error initializing fish collection:', error);
  }
}; 