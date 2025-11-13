import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Supplier, TaxClearance, Department } from '@/types/requisition';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SuppliersContextType {
  suppliers: Supplier[];
  taxClearances: TaxClearance[];
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  addTaxClearance: (taxClearance: Omit<TaxClearance, 'id'>) => Promise<void>;
  deactivateSupplier: (supplierId: string) => Promise<void>;
  refreshSuppliers: () => Promise<void>;
  refreshTaxClearances: () => Promise<void>;
}

const SuppliersContext = createContext<SuppliersContextType | undefined>(undefined);

export const SuppliersProvider = ({ children }: { children: ReactNode }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [taxClearances, setTaxClearances] = useState<TaxClearance[]>([]);
  const { toast } = useToast();

  const refreshSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedSuppliers: Supplier[] = (data || []).map(s => ({
        id: s.id,
        name: s.name,
        icazNumber: s.icaz_number,
        contactInfo: s.contact_info,
        status: s.status as 'active' | 'inactive',
        department: s.department as Department,
      }));

      setSuppliers(mappedSuppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast({
        title: "Error",
        description: "Failed to load suppliers",
        variant: "destructive",
      });
    }
  };

  const refreshTaxClearances = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_clearances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedTaxClearances: TaxClearance[] = (data || []).map(tc => ({
        id: tc.id,
        supplierId: tc.supplier_id,
        fileName: tc.file_name,
        filePath: tc.file_path,
        validFrom: tc.valid_from,
        validTo: tc.valid_to,
        quarter: tc.quarter,
        year: tc.year,
      }));

      setTaxClearances(mappedTaxClearances);
    } catch (error) {
      console.error('Error fetching tax clearances:', error);
      toast({
        title: "Error",
        description: "Failed to load tax clearances",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    refreshSuppliers();
    refreshTaxClearances();
  }, []);

  // Refresh when auth state changes to ensure RLS visibility after login
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshSuppliers();
      refreshTaxClearances();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Realtime updates for suppliers and tax clearances
  useEffect(() => {
    const channel = supabase
      .channel('suppliers-taxclearances-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => {
        refreshSuppliers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tax_clearances' }, () => {
        refreshTaxClearances();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .insert([{
          name: supplier.name,
          icaz_number: supplier.icazNumber,
          contact_info: supplier.contactInfo,
          status: supplier.status,
          department: supplier.department,
        }]);

      if (error) throw error;

      await refreshSuppliers();
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw error;
    }
  };

  const addTaxClearance = async (taxClearance: Omit<TaxClearance, 'id'>) => {
    try {
      const { error } = await supabase
        .from('tax_clearances')
        .insert([{
          supplier_id: taxClearance.supplierId,
          file_name: taxClearance.fileName,
          file_path: taxClearance.filePath,
          valid_from: taxClearance.validFrom,
          valid_to: taxClearance.validTo,
          quarter: taxClearance.quarter,
          year: taxClearance.year,
        }]);

      if (error) throw error;

      await refreshTaxClearances();
    } catch (error) {
      console.error('Error adding tax clearance:', error);
      throw error;
    }
  };

  const deactivateSupplier = async (supplierId: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ status: 'inactive' })
        .eq('id', supplierId);

      if (error) throw error;

      await refreshSuppliers();
    } catch (error) {
      console.error('Error deactivating supplier:', error);
      throw error;
    }
  };

  return (
    <SuppliersContext.Provider 
      value={{ 
        suppliers, 
        taxClearances, 
        addSupplier, 
        addTaxClearance, 
        deactivateSupplier,
        refreshSuppliers,
        refreshTaxClearances,
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
