-- Add file_path column to store the storage path separately from display name
ALTER TABLE tax_clearances ADD COLUMN file_path text;

-- Update existing records to have file_path same as file_name (for now)
UPDATE tax_clearances SET file_path = file_name WHERE file_path IS NULL;

-- Make file_path not null after backfilling
ALTER TABLE tax_clearances ALTER COLUMN file_path SET NOT NULL;