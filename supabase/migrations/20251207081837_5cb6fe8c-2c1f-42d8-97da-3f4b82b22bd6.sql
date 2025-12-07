-- Add INSERT policy for HODs to create requisitions for their department
CREATE POLICY "HODs can create requisitions for their department"
ON public.requisitions
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'hod'::app_role) 
  AND department = (SELECT profiles.department FROM profiles WHERE profiles.id = auth.uid())
);

-- Add INSERT policy for Technical Directors to create requisitions
CREATE POLICY "Technical Directors can create requisitions"
ON public.requisitions
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'technical_director'::app_role)
  AND department = (SELECT profiles.department FROM profiles WHERE profiles.id = auth.uid())
);

-- Add INSERT policy for CEOs to create requisitions
CREATE POLICY "CEOs can create requisitions"
ON public.requisitions
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'ceo'::app_role)
  AND department = (SELECT profiles.department FROM profiles WHERE profiles.id = auth.uid())
);