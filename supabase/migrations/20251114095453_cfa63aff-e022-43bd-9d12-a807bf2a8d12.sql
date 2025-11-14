-- Allow HR to insert and view suppliers
CREATE POLICY "HR can insert suppliers" 
ON public.suppliers 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));

CREATE POLICY "HR can view all suppliers" 
ON public.suppliers 
FOR SELECT 
USING (has_role(auth.uid(), 'hr'::app_role));