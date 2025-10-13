import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Requisition } from '@/types/requisition';
import { mockRequisitions } from '@/data/mockData';

interface RequisitionsContextType {
  requisitions: Requisition[];
  addRequisition: (requisition: Requisition) => void;
  updateRequisition: (id: string, updates: Partial<Requisition>) => void;
}

const RequisitionsContext = createContext<RequisitionsContextType | undefined>(undefined);

export const RequisitionsProvider = ({ children }: { children: ReactNode }) => {
  const [requisitions, setRequisitions] = useState<Requisition[]>(mockRequisitions);

  const addRequisition = (requisition: Requisition) => {
    setRequisitions(prev => [...prev, requisition]);
  };

  const updateRequisition = (id: string, updates: Partial<Requisition>) => {
    setRequisitions(prev =>
      prev.map(req => (req.id === id ? { ...req, ...updates } : req))
    );
  };

  return (
    <RequisitionsContext.Provider value={{ requisitions, addRequisition, updateRequisition }}>
      {children}
    </RequisitionsContext.Provider>
  );
};

export const useRequisitions = () => {
  const context = useContext(RequisitionsContext);
  if (context === undefined) {
    throw new Error('useRequisitions must be used within a RequisitionsProvider');
  }
  return context;
};
