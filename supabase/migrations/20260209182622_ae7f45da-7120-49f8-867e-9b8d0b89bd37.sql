-- Allow HR to update suppliers
CREATE POLICY "HR can update suppliers"
ON public.suppliers
FOR UPDATE
USING (has_role(auth.uid(), 'hr'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

-- Also change the default category to something more neutral
ALTER TABLE public.suppliers ALTER COLUMN category SET DEFAULT 'Catering, Study and Graduation'::supplier_category;