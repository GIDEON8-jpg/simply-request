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

    // Get requisition details including submitter
    const { data: requisitionData, error: reqError } = await supabase
      .from('requisitions')
      .select('submitted_by')
      .eq('id', requisitionId)
      .single();

    if (reqError || !requisitionData) {
      console.error('Error fetching requisition:', reqError);
      return new Response(
        JSON.stringify({ error: "Requisition not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get HOD and submitter emails
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, department')
      .or(`id.eq.${requisitionData.submitted_by},department.eq.${department}`);

    if (profilesError || !profilesData || profilesData.length === 0) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(
        JSON.stringify({ error: "Could not fetch recipient profiles" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const submitter = profilesData.find(p => p.id === requisitionData.submitted_by);
    const hod = profilesData.find(p => p.department === department && p.id !== requisitionData.submitted_by);

    if (!submitter && !hod) {
      console.error('No recipients found');
      return new Response(
        JSON.stringify({ error: "No recipients found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const recipients = [];
    
    if (submitter) recipients.push(submitter.email);
    if (hod) recipients.push(hod.email);

    console.log(`Payment completed for requisition ${requisitionId}`);
    console.log(`Sending notifications to: ${recipients.join(', ')}`);

    // Send email notification using Resend
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: "onboarding@resend.dev",
          to: recipients,
          subject: `Payment Completed: ${title}`,
          html: `
            <h2>Payment Completed</h2>
            <p>The payment for the following requisition has been processed:</p>
            <ul>
              <li><strong>Title:</strong> ${title}</li>
              <li><strong>Department:</strong> ${department}</li>
              <li><strong>Amount:</strong> ${currency} ${amount}</li>
              <li><strong>Requisition ID:</strong> ${requisitionId}</li>
            </ul>
            <p>The proof of payment has been uploaded and the requisition is now complete.</p>
            <p>Please log in to the system to view the details.</p>
          `,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.text();
        console.error('Resend API error:', errorData);
        throw new Error(`Failed to send email: ${errorData}`);
      }

      const emailData = await emailResponse.json();
      console.log('Email sent successfully:', emailData);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Notification sent to ${recipients.length} recipient(s)`,
          requisitionId,
          recipients: recipients,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (emailError: any) {
      console.error('Error sending email:', emailError);
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${emailError.message}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
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
