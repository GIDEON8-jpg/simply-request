-- Update policy to allow all approver roles to view supporting documents
DROP POLICY IF EXISTS "Users can view documents for accessible requisitions" ON public.requisition_documents;

CREATE POLICY "Users can view documents for accessible requisitions"
ON public.requisition_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.requisitions r
    WHERE r.id = requisition_documents.requisition_id
      AND (
        r.department = (SELECT department FROM public.profiles WHERE id = auth.uid())
        OR has_role(auth.uid(), 'finance_manager')
        OR has_role(auth.uid(), 'ceo')
        OR has_role(auth.uid(), 'accountant')
        OR has_role(auth.uid(), 'technical_director')
        OR has_role(auth.uid(), 'hod')
      )
  )
);

-- Drop other supplier columns from requisitions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'requisitions_other_supplier_1_id_fkey'
  ) THEN
    ALTER TABLE public.requisitions DROP CONSTRAINT requisitions_other_supplier_1_id_fkey;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'requisitions_other_supplier_2_id_fkey'
  ) THEN
    ALTER TABLE public.requisitions DROP CONSTRAINT requisitions_other_supplier_2_id_fkey;
  END IF;
END $$;

ALTER TABLE public.requisitions
  DROP COLUMN IF EXISTS other_supplier_1_id,
  DROP COLUMN IF EXISTS other_supplier_2_id;