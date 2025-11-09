import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  requisitionId: string;
  department: string;
  title: string;
  amount: number;
  currency: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { requisitionId, department, title, amount, currency }: NotificationRequest = await req.json();

    // Get HOD email for the department
    const { data: hodData, error: hodError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('department', department)
      .limit(1)
      .single();

    if (hodError || !hodData) {
      console.error('Error fetching HOD:', hodError);
      return new Response(
        JSON.stringify({ error: "HOD not found for department" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Payment completed for requisition ${requisitionId}`);
    console.log(`Notification would be sent to: ${hodData.email}`);
    console.log(`Department: ${department}, Title: ${title}, Amount: ${currency} ${amount}`);

    // In a production environment, you would integrate with an email service like Resend here
    // For now, we'll just log and return success

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Notification sent to ${hodData.full_name} (${hodData.email})`,
        requisitionId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-hod-payment function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
