
-- Create sequence for requisition numbers
CREATE SEQUENCE IF NOT EXISTS requisition_number_seq START 1;

-- Add requisition_number column with default from sequence
ALTER TABLE public.requisitions
ADD COLUMN requisition_number integer DEFAULT nextval('requisition_number_seq');

-- Backfill existing requisitions with sequential numbers based on creation order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.requisitions
)
UPDATE public.requisitions r
SET requisition_number = n.rn
FROM numbered n
WHERE r.id = n.id;

-- Set the sequence to continue after the max existing number (use 1 if no rows exist)
SELECT setval('requisition_number_seq', GREATEST(COALESCE((SELECT MAX(requisition_number) FROM public.requisitions), 1), 1));

-- Make column NOT NULL
ALTER TABLE public.requisitions
ALTER COLUMN requisition_number SET NOT NULL;

-- Create unique index
CREATE UNIQUE INDEX idx_requisitions_number ON public.requisitions(requisition_number);
