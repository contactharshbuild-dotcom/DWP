import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import api from '../services/api';

export interface Batch {
  id: number;
  name: string;
  organization_id: number;
  created_at: string;
  updated_at?: string;
  studentCount?: number;
}

interface BatchContextType {
  batches: Batch[];
  loadingBatches: boolean;
  fetchBatches: () => Promise<void>;
  createBatch: (name: string) => Promise<Batch>;
  updateBatch: (id: number, name: string) => Promise<Batch>;
  deleteBatch: (id: number) => Promise<void>;
}

const BatchContext = createContext<BatchContextType | undefined>(undefined);

export const BatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, organization } = useSelector((state: RootState) => state.auth);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const fetchBatches = async () => {
    if (!token || !organization) return;
    setLoadingBatches(true);
    try {
      const response = await api.get('/batches');
      setBatches(response.data.batches || []);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  const createBatch = async (name: string): Promise<Batch> => {
    try {
      const response = await api.post('/batches', { name: name.trim() });
      const newBatch: Batch = response.data.batch;
      setBatches(prev => {
        const next = [...prev.filter(b => b.id !== newBatch.id), newBatch];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      return newBatch;
    } catch (err) {
      console.error('Failed to create batch:', err);
      throw err;
    }
  };

  const updateBatch = async (id: number, name: string): Promise<Batch> => {
    try {
      const response = await api.put(`/batches/${id}`, { name: name.trim() });
      const updated: Batch = response.data.batch;
      setBatches(prev => {
        const next = prev.map(b => b.id === id ? updated : b);
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      return updated;
    } catch (err) {
      console.error('Failed to update batch:', err);
      throw err;
    }
  };

  const deleteBatch = async (id: number): Promise<void> => {
    try {
      await api.delete(`/batches/${id}`);
      setBatches(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete batch:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (token && organization) {
      fetchBatches();
    } else {
      setBatches([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, organization]);

  return (
    <BatchContext.Provider value={{ batches, loadingBatches, fetchBatches, createBatch, updateBatch, deleteBatch }}>
      {children}
    </BatchContext.Provider>
  );
};

export const useBatches = () => {
  const context = useContext(BatchContext);
  if (!context) {
    throw new Error('useBatches must be used within a BatchProvider');
  }
  return context;
};
