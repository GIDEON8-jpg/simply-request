-- Create storage bucket for tax clearances
INSERT INTO storage.buckets (id, name, public)
VALUES ('tax-clearances', 'tax-clearances', false);

-- Allow authenticated users to view tax clearance files
CREATE POLICY "Anyone authenticated can view tax clearances"
ON storage.objects
FOR SELECT
USING (bucket_id = 'tax-clearances' AND auth.role() = 'authenticated');

-- Allow HR to upload tax clearance files
CREATE POLICY "HR can upload tax clearances"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'tax-clearances' 
  AND auth.role() = 'authenticated'
  AND (
    SELECT has_role(auth.uid(), 'hr'::app_role)
  )
);

-- Allow HR to update tax clearance files
CREATE POLICY "HR can update tax clearances"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'tax-clearances'
  AND (
    SELECT has_role(auth.uid(), 'hr'::app_role)
  )
);

-- Allow HR to delete tax clearance files
CREATE POLICY "HR can delete tax clearances"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'tax-clearances'
  AND (
    SELECT has_role(auth.uid(), 'hr'::app_role)
  )
);