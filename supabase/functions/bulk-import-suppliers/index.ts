import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupplierImportRow {
  name: string;
  icaz_number: string;
  contact_info: string;
  status: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { suppliers } = await req.json();

    if (!Array.isArray(suppliers)) {
      throw new Error('Suppliers must be an array');
    }

    console.log(`Processing ${suppliers.length} suppliers for import`);

    const results = {
      successful: [] as string[],
      failed: [] as { name: string; error: string }[],
    };

    for (const supplier of suppliers as SupplierImportRow[]) {
      try {
        const supplierData = {
          name: supplier.name,
          icaz_number: supplier.icaz_number || '',
          contact_info: supplier.contact_info,
          status: supplier.status.toLowerCase() === 'active' ? 'active' : 'inactive',
        };

        const { error } = await supabaseAdmin
          .from('suppliers')
          .insert([supplierData]);

        if (error) {
          console.error(`Failed to import supplier ${supplier.name}:`, error);
          results.failed.push({
            name: supplier.name,
            error: error.message,
          });
        } else {
          console.log(`Successfully imported supplier: ${supplier.name}`);
          results.successful.push(supplier.name);
        }
      } catch (error) {
        console.error(`Error processing supplier ${supplier.name}:`, error);
        results.failed.push({
          name: supplier.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in bulk-import-suppliers function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
