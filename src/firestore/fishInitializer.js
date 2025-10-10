import { db } from '../firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { getDefaultFish } from '../models/fishModel';
import { sanitizeFishData } from '../utils/firebaseHelpers';

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
    
    // Only initialize if collection is completely empty
    if (fishSnapshot.size === 0) {
      console.log('🔧 Fish collection is empty, initializing with 4 default fish...');
      
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