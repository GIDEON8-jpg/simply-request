import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupRequest {
  action: 'delete_by_date_range' | 'nuke_all';
  dateFrom?: string;
  dateTo?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, dateFrom, dateTo }: CleanupRequest = await req.json();

    console.log(`Cleanup action requested: ${action}`, { dateFrom, dateTo });

    let deletedCount = 0;

    if (action === 'delete_by_date_range') {
      if (!dateFrom || !dateTo) {
        return new Response(
          JSON.stringify({ error: 'dateFrom and dateTo are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get requisitions in date range
      const { data: requisitions, error: fetchError } = await supabase
        .from('requisitions')
        .select('id')
        .gte('submitted_date', dateFrom)
        .lte('submitted_date', dateTo + 'T23:59:59');

      if (fetchError) {
        console.error('Error fetching requisitions:', fetchError);
        throw fetchError;
      }

      if (requisitions && requisitions.length > 0) {
        const reqIds = requisitions.map(r => r.id);
        console.log(`Found ${reqIds.length} requisitions to delete`);

        // Delete related records first (cascade order)
        // 1. Delete payments
        const { error: paymentError } = await supabase
          .from('payments')
          .delete()
          .in('requisition_id', reqIds);
        if (paymentError) console.error('Error deleting payments:', paymentError);

        // 2. Delete documents
        const { error: docError } = await supabase
          .from('requisition_documents')
          .delete()
          .in('requisition_id', reqIds);
        if (docError) console.error('Error deleting documents:', docError);

        // 3. Delete audit logs related to these requisitions
        const { error: auditError } = await supabase
          .from('audit_logs')
          .delete()
          .in('requisition_id', reqIds);
        if (auditError) console.error('Error deleting audit logs:', auditError);

        // 4. Finally delete requisitions
        const { error: reqError } = await supabase
          .from('requisitions')
          .delete()
          .in('id', reqIds);
        if (reqError) {
          console.error('Error deleting requisitions:', reqError);
          throw reqError;
        }

        deletedCount = reqIds.length;
      }
    } else if (action === 'nuke_all') {
      // Delete all data in correct order

      // 1. Count before deletion
      const { count: reqCount } = await supabase
        .from('requisitions')
        .select('id', { count: 'exact', head: true });

      // 2. Delete payments
      const { error: paymentError } = await supabase
        .from('payments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      if (paymentError) console.error('Error deleting payments:', paymentError);

      // 3. Delete documents
      const { error: docError } = await supabase
        .from('requisition_documents')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (docError) console.error('Error deleting documents:', docError);

      // 4. Delete audit logs with requisition references
      const { error: auditError } = await supabase
        .from('audit_logs')
        .delete()
        .not('requisition_id', 'is', null);
      if (auditError) console.error('Error deleting audit logs:', auditError);

      // 5. Delete all requisitions
      const { error: reqError } = await supabase
        .from('requisitions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (reqError) {
        console.error('Error deleting requisitions:', reqError);
        throw reqError;
      }

      deletedCount = reqCount || 0;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cleanup completed. Deleted ${deletedCount} requisitions`);

    return new Response(
      JSON.stringify({ success: true, deletedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Cleanup failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
