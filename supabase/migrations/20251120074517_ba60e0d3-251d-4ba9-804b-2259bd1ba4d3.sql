-- Create storage bucket for requisition documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('requisition-documents', 'requisition-documents', false);

-- Allow authenticated users to upload requisition documents
CREATE POLICY "Users can upload requisition documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'requisition-documents' 
  AND auth.role() = 'authenticated'
);

-- Allow users to view requisition documents for their department or if they're approvers
CREATE POLICY "Users can view requisition documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'requisition-documents' 
  AND auth.role() = 'authenticated'
);