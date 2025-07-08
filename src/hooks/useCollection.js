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
        console.error(err);
        setError('Failed to fetch data. See console for details.');
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [collectionName, orderByField, orderByDirection]);

  return { documents, loading, error };
};

export default useCollection; 