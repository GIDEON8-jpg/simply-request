
-- Add approved_by_role column to track which role approved
ALTER TABLE public.requisitions ADD COLUMN IF NOT EXISTS approved_by_role text;

-- Allow deputy_finance_manager and finance_manager to insert requisition documents
DROP POLICY IF EXISTS "Finance roles can insert documents" ON public.requisition_documents;
CREATE POLICY "Finance roles can insert documents"
ON public.requisition_documents
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'deputy_finance_manager') OR
  public.has_role(auth.uid(), 'finance_manager')
);

-- Allow deputy_finance_manager and finance_manager to view requisition documents
DROP POLICY IF EXISTS "Finance roles can view documents" ON public.requisition_documents;
CREATE POLICY "Finance roles can view documents"
ON public.requisition_documents
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'deputy_finance_manager') OR
  public.has_role(auth.uid(), 'finance_manager')
);
