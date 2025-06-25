import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';

const useCollection = (collectionName, orderByField, orderByDirection = 'desc') => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getCollection = async () => {
      setLoading(true);
      setError(null);

      try {
        let q = query(collection(db, collectionName));

        if (orderByField) {
          q = query(collection(db, collectionName), orderBy(orderByField, orderByDirection));
        }

        const querySnapshot = await getDocs(q);
        const docs = [];
        querySnapshot.forEach((doc) => {
          docs.push({ ...doc.data(), id: doc.id });
        });
        setDocuments(docs);

      } catch (err) {
        console.error(err);
        setError('Failed to fetch data. See console for details.');
      } finally {
        setLoading(false);
      }
    };

    getCollection();
  }, [collectionName, orderByField, orderByDirection]);

  return { documents, loading, error };
};

export default useCollection; 