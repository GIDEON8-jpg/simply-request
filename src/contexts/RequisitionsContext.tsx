import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Requisition, Department } from '@/types/requisition';
import { mockRequisitions } from '@/data/mockData';

interface RequisitionsContextType {
  requisitions: Requisition[];
  budgets: Record<Department, number>;
  addRequisition: (requisition: Requisition) => void;
  updateRequisition: (id: string, updates: Partial<Requisition>) => void;
  setBudgets: (budgets: Record<Department, number>) => void;
  getRemainingBudget: (department: Department) => number;
}

const RequisitionsContext = createContext<RequisitionsContextType | undefined>(undefined);

export const RequisitionsProvider = ({ children }: { children: ReactNode }) => {
  const [requisitions, setRequisitions] = useState<Requisition[]>(mockRequisitions);
  const [budgets, setBudgetsState] = useState<Record<Department, number>>(() => {
    const saved = localStorage.getItem('departmentBudgets');
    return saved ? JSON.parse(saved) : {
      'Education': 5000,
      'IT': 10000,
      'Marketing and PR': 7000,
      'Technical': 8000,
      'HR': 6000,
      'Finance': 15000,
      'CEO': 50000,
    };
  });

  useEffect(() => {
    localStorage.setItem('departmentBudgets', JSON.stringify(budgets));
  }, [budgets]);

  const addRequisition = (requisition: Requisition) => {
    setRequisitions(prev => [...prev, requisition]);
  };

  const updateRequisition = (id: string, updates: Partial<Requisition>) => {
    setRequisitions(prev =>
      prev.map(req => (req.id === id ? { ...req, ...updates } : req))
    );
  };

  const setBudgets = (newBudgets: Record<Department, number>) => {
    setBudgetsState(newBudgets);
  };

  const getRemainingBudget = (department: Department) => {
    const total = budgets[department] || 0;
    const used = requisitions
      .filter(r => r.department === department && (r.status === 'approved' || r.status === 'completed'))
      .reduce((sum, r) => sum + r.amount, 0);
    return total - used;
  };

  return (
    <RequisitionsContext.Provider value={{ 
      requisitions, 
      budgets,
      addRequisition, 
      updateRequisition,
      setBudgets,
      getRemainingBudget
    }}>
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
