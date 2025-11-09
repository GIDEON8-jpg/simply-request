import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Requisition, Department, Supplier } from '@/types/requisition';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RequisitionsContextType {
  requisitions: Requisition[];
  budgets: Record<Department, number>;
  loading: boolean;
  addRequisition: (requisition: Requisition) => Promise<void>;
  updateRequisition: (id: string, updates: Partial<Requisition>) => Promise<void>;
  setBudgets: (budgets: Record<Department, number>) => void;
  getRemainingBudget: (department: Department) => number;
}

const RequisitionsContext = createContext<RequisitionsContextType | undefined>(undefined);

export const RequisitionsProvider = ({ children }: { children: ReactNode }) => {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgetsState] = useState<Record<Department, number>>({
    'Education': 10000,
    'IT': 20000,
    'Marketing and PR': 15000,
    'Technical': 18000,
    'HR': 12000,
    'Finance': 25000,
    'CEO': 100000,
    'Registry': 10000,
  });

  // Fetch budgets
  useEffect(() => {
    const fetchBudgets = async () => {
      const { data, error } = await supabase
        .from('department_budgets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        console.error('Error fetching budgets:', error);
        return;
      }

      if (data && data.length > 0) {
        const budgetMap: Record<Department, number> = {} as Record<Department, number>;
        data.forEach(budget => {
          budgetMap[budget.department as Department] = Number(budget.total_budget);
        });
        setBudgetsState(budgetMap);
      }
    };

    fetchBudgets();
  }, []);

  // Fetch requisitions with suppliers
  useEffect(() => {
    const fetchRequisitions = async () => {
      setLoading(true);
      const { data: reqData, error } = await supabase
        .from('requisitions')
        .select(`
          *,
          chosen_supplier:suppliers!requisitions_chosen_supplier_id_fkey(*),
          other_supplier_1:suppliers!requisitions_other_supplier_1_id_fkey(*),
          other_supplier_2:suppliers!requisitions_other_supplier_2_id_fkey(*),
          submitted_by_profile:profiles!requisitions_submitted_by_fkey(full_name),
          approved_by_profile:profiles!requisitions_approved_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requisitions:', error);
        toast.error('Failed to load requisitions');
        setLoading(false);
        return;
      }

      const formatted: Requisition[] = (reqData || []).map((req: any) => ({
        id: req.id,
        title: req.title,
        department: req.department as Department,
        amount: Number(req.amount),
        currency: req.currency,
        usdConvertible: req.usd_convertible ? Number(req.usd_convertible) : undefined,
        chosenSupplier: {
          id: req.chosen_supplier?.id || '',
          name: req.chosen_supplier?.name || '',
          icazNumber: req.chosen_supplier?.icaz_number || '',
          contactInfo: req.chosen_supplier?.contact_info || '',
          status: req.chosen_supplier?.status || 'active',
        } as Supplier,
        otherSupplier1: req.other_supplier_1 ? {
          id: req.other_supplier_1.id,
          name: req.other_supplier_1.name,
          icazNumber: req.other_supplier_1.icaz_number,
          contactInfo: req.other_supplier_1.contact_info,
          status: req.other_supplier_1.status,
        } as Supplier : undefined,
        otherSupplier2: req.other_supplier_2 ? {
          id: req.other_supplier_2.id,
          name: req.other_supplier_2.name,
          icazNumber: req.other_supplier_2.icaz_number,
          contactInfo: req.other_supplier_2.contact_info,
          status: req.other_supplier_2.status,
        } as Supplier : undefined,
        chosenRequisition: req.chosen_requisition,
        type: req.type,
        deviationReason: req.deviation_reason,
        budgetCode: req.budget_code,
        description: req.description,
        status: req.status,
        submittedBy: req.submitted_by_profile?.full_name || '',
        submittedDate: req.submitted_date,
        approverComments: req.approver_comments,
        approvedBy: req.approved_by_profile?.full_name,
        approvedDate: req.approved_date,
        documents: [],
      }));

      setRequisitions(formatted);
      setLoading(false);
    };

    fetchRequisitions();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('requisitions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requisitions'
        },
        () => {
          fetchRequisitions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addRequisition = async (requisition: Requisition) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to create requisitions');
      return;
    }

    const { error } = await supabase
      .from('requisitions')
      .insert({
        title: requisition.title,
        department: requisition.department,
        amount: requisition.amount,
        currency: requisition.currency,
        usd_convertible: requisition.usdConvertible,
        chosen_supplier_id: requisition.chosenSupplier.id,
        other_supplier_1_id: requisition.otherSupplier1?.id,
        other_supplier_2_id: requisition.otherSupplier2?.id,
        chosen_requisition: requisition.chosenRequisition,
        type: requisition.type,
        deviation_reason: requisition.deviationReason,
        budget_code: requisition.budgetCode,
        description: requisition.description,
        status: requisition.status,
        submitted_by: user.id,
      });

    if (error) {
      console.error('Error adding requisition:', error);
      toast.error('Failed to create requisition');
      throw error;
    }

    toast.success('Requisition created successfully');
  };

  const updateRequisition = async (id: string, updates: Partial<Requisition>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.approverComments) dbUpdates.approver_comments = updates.approverComments;
    if (updates.approvedDate) dbUpdates.approved_date = updates.approvedDate;
    if (updates.approvedBy) dbUpdates.approved_by = user.id;

    const { error } = await supabase
      .from('requisitions')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating requisition:', error);
      toast.error('Failed to update requisition');
      throw error;
    }

    toast.success('Requisition updated successfully');
  };

  const setBudgets = (newBudgets: Record<Department, number>) => {
    setBudgetsState(newBudgets);
  };

  const getRemainingBudget = (department: Department) => {
    const total = budgets[department] || 0;
    const used = requisitions
      .filter(r => r.department === department && (r.status === 'approved' || r.status === 'completed'))
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    return total - used;
  };

  return (
    <RequisitionsContext.Provider value={{ 
      requisitions, 
      budgets,
      loading,
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
