import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';

const useCollection = (collectionName, orderByField, orderByDirection = 'desc') => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Check if Firebase is properly initialized
    if (!db) {
      setError('Firebase is not properly configured. Please check your environment variables.');
      setLoading(false);
      return;
    }

    let q = query(collection(db, collectionName));

    // Only add 'orderBy' if the field is provided
    if (orderByField) {
      q = query(collection(db, collectionName), orderBy(orderByField, orderByDirection));
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const docs = [];
        querySnapshot.forEach((doc) => {
          docs.push({ ...doc.data(), id: doc.id });
        });
        setDocuments(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore error:', err);
        if (err.code === 'permission-denied') {
          setError('Permission denied. Please check your Firestore security rules.');
        } else if (err.code === 'unavailable') {
          setError('Firebase is currently unavailable. Please try again later.');
        } else {
          setError(`Failed to fetch data from ${collectionName}: ${err.message}`);
        }
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [collectionName, orderByField, orderByDirection]);

  return { documents, loading, error };
};

export default useCollection; 