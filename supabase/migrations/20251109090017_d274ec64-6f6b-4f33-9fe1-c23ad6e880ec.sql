-- Allow HR users to insert tax clearances
CREATE POLICY "HR can upload tax clearances"
ON public.tax_clearances
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'hr'::app_role));