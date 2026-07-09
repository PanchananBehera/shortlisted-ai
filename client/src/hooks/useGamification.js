import { useState, useEffect, useCallback } from 'react';
import api from '../utils/axios';

export const useGamification = (userId) => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.get(`/user/progress?userId=${userId}`);
      setProgress(res.data);
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const refreshProgress = () => fetchProgress();
  return { progress, loading, refreshProgress };
};