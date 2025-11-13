-- Add department field to suppliers table
ALTER TABLE public.suppliers
ADD COLUMN department department_type NOT NULL DEFAULT 'IT';

-- Create index on department for faster filtering
CREATE INDEX idx_suppliers_department ON public.suppliers(department);