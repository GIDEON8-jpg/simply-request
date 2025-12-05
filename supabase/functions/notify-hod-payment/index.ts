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
  popFileName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { requisitionId, department, title, amount, currency, popFileName }: NotificationRequest = await req.json();

    console.log(`Processing payment notification for requisition ${requisitionId}`);

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

    // Get the submitter's profile (the person who created the requisition)
    const { data: submitterProfile, error: submitterError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', requisitionData.submitted_by)
      .single();

    if (submitterError) {
      console.error('Error fetching submitter profile:', submitterError);
    }

    // Get HOD for the department
    const { data: hodRoles, error: hodError } = await supabase
      .from('user_roles')
      .select('user_id, profiles!inner(email, full_name, department)')
      .eq('role', 'hod');

    if (hodError) {
      console.error('Error fetching HOD roles:', hodError);
    }

    // Find HOD matching the department
    const hodProfile = hodRoles?.find((r: any) => r.profiles?.department === department)?.profiles as any;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const recipients: string[] = [];
    const recipientNames: string[] = [];
    
    // Add submitter to recipients
    if (submitterProfile?.email) {
      recipients.push(submitterProfile.email);
      recipientNames.push(submitterProfile.full_name || 'Requisition Owner');
    }
    
    // Add HOD to recipients if different from submitter
    if (hodProfile?.email && hodProfile.email !== submitterProfile?.email) {
      recipients.push(hodProfile.email);
      recipientNames.push(hodProfile.full_name || 'HOD');
    }

    if (recipients.length === 0) {
      console.error('No recipients found');
      return new Response(
        JSON.stringify({ error: "No recipients found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Payment completed for requisition ${requisitionId}`);
    console.log(`Sending notifications to: ${recipients.join(', ')}`);

    const appUrl = 'https://ca65c39b-c714-453d-accf-abcbcda568ac.lovableproject.com';

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
          subject: `✅ Payment Completed: ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #16a34a;">Payment Completed</h1>
              <p>Dear Recipient,</p>
              
              <p>We are pleased to inform you that the payment for the following requisition has been successfully processed:</p>
              
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
                <p><strong>Title:</strong> ${title}</p>
                <p><strong>Department:</strong> ${department}</p>
                <p><strong>Amount:</strong> ${currency} ${amount.toFixed(2)}</p>
                <p><strong>Requisition ID:</strong> ${requisitionId}</p>
                ${popFileName ? `<p><strong>Proof of Payment:</strong> ${popFileName}</p>` : ''}
              </div>
              
              <p>The proof of payment has been uploaded and the requisition is now <strong style="color: #16a34a;">COMPLETED</strong>.</p>
              
              <a href="${appUrl}" 
                 style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; margin: 20px 0;">
                View Requisition Details
              </a>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This is an automated notification from the ICAZ Procurement System.
              </p>
            </div>
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
          recipientNames: recipientNames,
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
