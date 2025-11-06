import { createContext, useContext, useState, ReactNode } from 'react';
import { Supplier, TaxClearance } from '@/types/requisition';
import { mockSuppliers, mockTaxClearances } from '@/data/mockData';

interface SuppliersContextType {
  suppliers: Supplier[];
  taxClearances: TaxClearance[];
  addSupplier: (supplier: Supplier) => void;
  addTaxClearance: (taxClearance: TaxClearance) => void;
  deactivateSupplier: (supplierId: string) => void;
}

const SuppliersContext = createContext<SuppliersContextType | undefined>(undefined);

export const SuppliersProvider = ({ children }: { children: ReactNode }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [taxClearances, setTaxClearances] = useState<TaxClearance[]>([]);

  const addSupplier = (supplier: Supplier) => {
    setSuppliers(prev => [...prev, supplier]);
  };

  const addTaxClearance = (taxClearance: TaxClearance) => {
    setTaxClearances(prev => [...prev, taxClearance]);
  };

  const deactivateSupplier = (supplierId: string) => {
    setSuppliers(prev => 
      prev.map(s => s.id === supplierId ? { ...s, status: 'inactive' as const } : s)
    );
  };

  return (
    <SuppliersContext.Provider 
      value={{ 
        suppliers, 
        taxClearances, 
        addSupplier, 
        addTaxClearance, 
        deactivateSupplier 
      }}
    >
      {children}
    </SuppliersContext.Provider>
  );
};

export const useSuppliers = () => {
  const context = useContext(SuppliersContext);
  if (!context) {
    throw new Error('useSuppliers must be used within a SuppliersProvider');
  }
  return context;
};
