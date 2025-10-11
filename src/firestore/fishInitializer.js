import { db } from '../firebase';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { getDefaultFish } from '../models/fishModel';
import { sanitizeFishData } from '../utils/firebaseHelpers';

/**
 * Initializes the fish collection with default fish if needed
 */
export const initializeFishCollection = async () => {
  if (!db) return;

  try {
    const fishCollection = collection(db, 'fish');
    const fishSnapshot = await getDocs(fishCollection);
    const defaultFish = getDefaultFish();

    // ALWAYS reinitialize to fix wrong positions from previous versions
    const promises = defaultFish.map(async (fish) => {
      const fishToSave = sanitizeFishData({
        ...fish,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return setDoc(doc(db, 'fish', fish.id), fishToSave);
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error initializing fish:', error);
  }
}; 