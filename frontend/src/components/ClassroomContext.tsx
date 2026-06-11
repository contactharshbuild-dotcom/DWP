import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import api from '../services/api';

interface Teacher {
  id: number;
  name: string;
  email: string;
}

interface Classroom {
  id: number;
  classroom_id: number;
  name: string;
  subject: string;
  teachers?: Teacher[];
}

interface ClassroomContextType {
  classrooms: Classroom[];
  loadingClassrooms: boolean;
  fetchClassrooms: () => Promise<void>;
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(undefined);

export const ClassroomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, organization } = useSelector((state: RootState) => state.auth);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);

  const fetchClassrooms = async () => {
    if (!token || !organization) return;
    setLoadingClassrooms(true);
    try {
      const response = await api.get('/classrooms');
      setClassrooms(response.data.classrooms);
    } catch (err) {
      console.error('Failed to fetch classrooms:', err);
    } finally {
      setLoadingClassrooms(false);
    }
  };

  useEffect(() => {
    if (token && organization) {
      fetchClassrooms();
    } else {
      setClassrooms([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, organization]);

  return (
    <ClassroomContext.Provider value={{ classrooms, loadingClassrooms, fetchClassrooms }}>
      {children}
    </ClassroomContext.Provider>
  );
};

export const useClassrooms = () => {
  const context = useContext(ClassroomContext);
  if (context === undefined) {
    throw new Error('useClassrooms must be used within a ClassroomProvider');
  }
  return context;
};
