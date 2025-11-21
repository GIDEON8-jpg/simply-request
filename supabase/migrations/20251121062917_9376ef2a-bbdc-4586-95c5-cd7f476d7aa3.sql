-- Make the requisition-documents bucket public so files can be downloaded
UPDATE storage.buckets 
SET public = true 
WHERE id = 'requisition-documents';