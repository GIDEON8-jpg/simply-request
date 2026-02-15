import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Requisition, Department, Supplier } from "@/types/requisition";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface RequisitionsContextType {
  requisitions: Requisition[];
  budgets: Record<Department, number>;
  loading: boolean;
  addRequisition: (requisition: Requisition) => Promise<void>;
  updateRequisition: (id: string, updates: Partial<Requisition>) => Promise<void>;
  saveBudgetsToBackend: (budgets: Record<Department, number>) => Promise<void>;
  setBudgets: (budgets: Record<Department, number>) => void;
  getRemainingBudget: (department: Department) => number;
}

const RequisitionsContext = createContext<RequisitionsContextType | undefined>(undefined);

export const RequisitionsProvider = ({ children }: { children: ReactNode }) => {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [budgets, setBudgetsState] = useState<Record<Department, number>>({
    Education: 0,
    IT: 0,
    "Marketing and PR": 0,
    Technical: 0,
    HR: 0,
    Finance: 0,
    CEO: 0,
    Registry: 0,
  });

  // Fetch budgets (latest per department) and subscribe to changes
  useEffect(() => {
    const fetchBudgets = async () => {
      const { data, error } = await supabase
        .from("department_budgets")
        .select("department,total_budget,created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching budgets:", error);
        return;
      }

      if (data && data.length > 0) {
        const latestByDept: Record<Department, number> = {} as Record<Department, number>;
        for (const row of data) {
          const dept = row.department as Department;
          if (latestByDept[dept] === undefined) {
            latestByDept[dept] = Number(row.total_budget);
          }
        }
        // Merge to avoid dropping departments that aren't in the latest response
        setBudgetsState((prev) => ({ ...prev, ...latestByDept }));
      }
    };

    fetchBudgets();

    // Realtime updates for budgets
    const channel = supabase
      .channel("department-budgets-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "department_budgets" }, () => {
        fetchBudgets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch requisitions with suppliers - filtered by role
  useEffect(() => {
    if (!user) {
      setRequisitions([]);
      setLoading(false);
      return;
    }

    const fetchRequisitions = async () => {
      setLoading(true);

      let query = supabase.from("requisitions").select(`
          *,
          chosen_supplier:suppliers!requisitions_chosen_supplier_id_fkey(*),
          submitted_by_profile:profiles!requisitions_submitted_by_fkey(full_name),
          approved_by_profile:profiles!requisitions_approved_by_fkey(full_name)
        `);

      // Filter based on user role
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (user.role === "preparer") {
        // Preparers see all their own requisitions
        query = query.eq("submitted_by", authUser?.id);
      } else if (user.role === "hod" && user.department) {
        // HODs see all requisitions in their department
        query = query.eq("department", user.department as any);
      } else if (user.role === "technical_director") {
        // Technical Directors: fetch all; component-level filters (status + amount) will apply
        // No additional DB filter to avoid excluding USD-only rows where usd_convertible is null
      } else if (user.role === "finance_manager") {
        // Finance Managers: fetch all; component-level filters will apply (< $100 after HOD approval)
        // No DB amount filter to include records with null usd_convertible
      } else if (user.role === "accountant") {
        // Accountants see approved requisitions for payment processing
        query = query.in("status", ["approved", "approved_wait", "completed"]);
      } else if (user.role === "ceo") {
        // CEO: fetch all; component-level filters will apply (> $500 after HOD approval)
        // No additional filter
      } else if (user.role === "admin" || user.role === "hr") {
        // Admins and HR see all requisitions
        // No additional filter
      }

      query = query.order("created_at", { ascending: false });

      const { data: reqData, error } = await query;

      if (error) {
        console.error("Error fetching requisitions:", error);
        toast.error("Failed to load requisitions");
        setLoading(false);
        return;
      }

      // Build a map of documents for these requisitions
      const reqIds = (reqData || []).map((r: any) => r.id);
      let docsMap: Record<string, { id: string; file_name: string; file_url: string; uploaded_at: string | null }[]> = {};
      if (reqIds.length > 0) {
        const { data: docs, error: docsError } = await supabase
          .from('requisition_documents')
          .select('id,file_name,file_url,uploaded_at,requisition_id')
          .in('requisition_id', reqIds);
        if (docsError) {
          console.error('Error fetching requisition documents:', docsError);
        } else {
          docsMap = (docs || []).reduce((acc: typeof docsMap, d: any) => {
            (acc[d.requisition_id] ||= []).push(d);
            return acc;
          }, {} as typeof docsMap);
        }
      }

      const formatted: Requisition[] = (reqData || []).map((req: any) => {
        const reqDocs = docsMap[req.id] || [];
        return {
          id: req.id,
          requisitionNumber: req.requisition_number,
          title: req.title,
          department: req.department as Department,
          amount: Number(req.amount),
          currency: req.currency,
          usdConvertible: req.usd_convertible ? Number(req.usd_convertible) : undefined,
          chosenSupplier: {
            id: req.chosen_supplier?.id || "",
            name: req.chosen_supplier?.name || "",
            icazNumber: req.chosen_supplier?.icaz_number || "",
            contactInfo: req.chosen_supplier?.contact_info || "",
            status: req.chosen_supplier?.status || "active",
          } as Supplier,
          chosenRequisition: req.chosen_requisition,
          type: req.type,
          deviationReason: req.deviation_reason,
          budgetCode: req.budget_code,
          description: req.description,
          status: req.status,
          submittedById: req.submitted_by,
          submittedBy: req.submitted_by_profile?.full_name || "",
          submittedDate: req.submitted_date,
          approverComments: req.approver_comments,
          approvedBy: req.approved_by_profile?.full_name,
          approvedById: req.approved_by,
          approvedDate: req.approved_date,
          documents: reqDocs.map((d) => d.file_name),
          attachments: reqDocs.map((d) => ({ id: d.id, fileName: d.file_name, fileUrl: d.file_url, uploadedAt: d.uploaded_at || undefined })),
        };
      });

      setRequisitions(formatted);
      setLoading(false);
    };

    fetchRequisitions();

    // Subscribe to real-time changes
    const channel = supabase
      .channel("requisitions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requisitions",
        },
        () => {
          fetchRequisitions();
        },
      )
      .subscribe();

    const docsChannel = supabase
      .channel("requisition-documents-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requisition_documents",
        },
        () => {
          fetchRequisitions();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(docsChannel);
    };
  }, [user]);

  const addRequisition = async (requisition: Requisition) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to create requisitions");
      return;
    }

    const { error } = await supabase.from("requisitions").insert({
      title: requisition.title,
      department: requisition.department,
      amount: requisition.amount,
      currency: requisition.currency,
      usd_convertible: requisition.usdConvertible,
      chosen_supplier_id: requisition.chosenSupplier.id,
      chosen_requisition: requisition.chosenRequisition,
      type: requisition.type,
      deviation_reason: requisition.deviationReason,
      budget_code: requisition.budgetCode,
      description: requisition.description,
      status: requisition.status,
      submitted_by: user.id,
    });

    if (error) {
      console.error("Error adding requisition:", error);
      toast.error("Failed to create requisition");
      throw error;
    }

    toast.success("Requisition created successfully");
  };

  const updateRequisition = async (id: string, updates: Partial<Requisition>) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.approverComments) dbUpdates.approver_comments = updates.approverComments;
    if (updates.approvedDate) dbUpdates.approved_date = updates.approvedDate;
    if (updates.approvedBy) dbUpdates.approved_by = user.id;

    const { error } = await supabase.from("requisitions").update(dbUpdates).eq("id", id);

    if (error) {
      console.error("Error updating requisition:", error);
      toast.error("Failed to update requisition");
      throw error;
    }

    toast.success("Requisition updated successfully");
  };

  const saveBudgetsToBackend = async (newBudgets: Record<Department, number>) => {
    const fiscalYear = new Date().getFullYear();
    const rows = Object.entries(newBudgets).map(([department, total]) => ({
      department: department as Department,
      fiscal_year: fiscalYear,
      total_budget: total,
    }));

    // Use UPSERT to update existing budgets or insert new ones
    const { error } = await supabase.from("department_budgets").upsert(rows, {
      onConflict: "department,fiscal_year",
    });

    if (error) {
      console.error("Error saving budgets:", error);
      toast.error("Failed to save budgets");
      throw error;
    }

    toast.success("Budgets saved successfully");
  };

  const setBudgets = (newBudgets: Record<Department, number>) => {
    setBudgetsState((prev) => ({ ...prev, ...newBudgets }));
  };

  const getRemainingBudget = (department: Department) => {
    const total = budgets[department] || 0;
    const used = requisitions
      .filter((r) => r.department === department && (r.status === "completed" || r.paymentDate))
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    return total - used;
  };

  return (
    <RequisitionsContext.Provider
      value={{
        requisitions,
        budgets,
        loading,
        addRequisition,
        updateRequisition,
        saveBudgetsToBackend,
        setBudgets,
        getRemainingBudget,
      }}
    >
      {children}
    </RequisitionsContext.Provider>
  );
};

export const useRequisitions = () => {
  const context = useContext(RequisitionsContext);
  if (context === undefined) {
    throw new Error("useRequisitions must be used within a RequisitionsProvider");
  }
  return context;
};
