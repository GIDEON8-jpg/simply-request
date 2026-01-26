import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
const validateText = (text: string, maxLength: number): boolean => {
  return !!text && text.trim().length > 0 && text.length <= maxLength;
};

const sanitizeText = (text: string): string => {
  return text.trim().replace(/[\x00-\x1F\x7F]/g, '');
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
    // Get JWT from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify user is authenticated and has proper role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check if user has finance_manager, CEO, or HR role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const hasPermission = roles?.some(r => r.role === 'finance_manager' || r.role === 'ceo' || r.role === 'hr');
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only Finance Manager, CEO, or HR can bulk import suppliers' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { suppliers } = await req.json();

    if (!Array.isArray(suppliers) || suppliers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Suppliers must be a non-empty array' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (suppliers.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Maximum 100 suppliers per import' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

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
        // Validate inputs
        if (!validateText(supplier.name, 255)) {
          results.failed.push({
            name: supplier.name || 'invalid',
            error: 'Invalid name (must be non-empty and max 255 chars)',
          });
          continue;
        }

        if (!validateText(supplier.contact_info, 255)) {
          results.failed.push({
            name: supplier.name,
            error: 'Invalid contact info (must be non-empty and max 255 chars)',
          });
          continue;
        }

        const sanitizedName = sanitizeText(supplier.name);
        const sanitizedIcazNumber = sanitizeText(supplier.icaz_number || '');
        const sanitizedContactInfo = sanitizeText(supplier.contact_info);

        const supplierData = {
          name: sanitizedName,
          icaz_number: sanitizedIcazNumber,
          contact_info: sanitizedContactInfo,
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
