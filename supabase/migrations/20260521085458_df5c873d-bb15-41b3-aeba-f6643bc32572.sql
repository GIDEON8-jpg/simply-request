-- Enable realtime broadcasting for requisitions and their documents
ALTER TABLE public.requisitions REPLICA IDENTITY FULL;
ALTER TABLE public.requisition_documents REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'requisitions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.requisitions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'requisition_documents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.requisition_documents;
  END IF;
END $$;