import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  requisitionId: string;
  requisitionTitle: string;
  department: string;
  amount: number;
  currency: string;
  approverName: string;
  approverRole: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requisitionId, requisitionTitle, department, amount, currency, approverName, approverRole }: NotificationRequest = await req.json();
    
    console.log('Processing accountant notification for requisition:', requisitionId);
    console.log('Approved by:', approverName, '(', approverRole, ')');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get users with accountant role
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role, profiles!inner(email, full_name)')
      .eq('role', 'accountant');

    if (rolesError) {
      console.error('Error fetching accountant roles:', rolesError);
      throw rolesError;
    }

    console.log('Found accountants to notify:', userRoles?.length);

    const appUrl = 'https://ca65c39b-c714-453d-accf-abcbcda568ac.lovableproject.com';
    const emailsSent = [];

    // Send email to each accountant
    for (const userRole of userRoles || []) {
      const profile = userRole.profiles as unknown as { email: string; full_name: string };
      
      console.log(`Sending email to ${profile.email} (accountant)`);

      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: "ICAZ Procurement <noreply@apps.icaz.org.zw>",
            to: [profile.email],
            subject: `Payment Required: ${requisitionTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2563eb;">New Payment Pending - Action Required</h1>
                <p>Dear ${profile.full_name},</p>
                
                <p>A requisition has been fully approved and is now ready for payment processing:</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Title:</strong> ${requisitionTitle}</p>
                  <p><strong>Department:</strong> ${department}</p>
                  <p><strong>Amount:</strong> ${currency} ${amount.toFixed(2)}</p>
                  <p><strong>Requisition ID:</strong> ${requisitionId}</p>
                  <p><strong>Final Approval by:</strong> ${approverName} (${approverRole})</p>
                </div>
                
                <p>Please process this payment at your earliest convenience.</p>
                
                <a href="${appUrl}" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; margin: 20px 0;">
                  Process Payment
                </a>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  This is an automated notification from the ICAZ Procurement System.
                </p>
              </div>
            `,
          }),
        });

        const emailData = await emailResponse.json();

        if (!emailResponse.ok) {
          throw new Error(emailData.message || 'Failed to send email');
        }

        emailsSent.push({
          email: profile.email,
          role: 'accountant',
          status: 'sent',
          messageId: emailData.id
        });

        console.log(`Email sent successfully to ${profile.email}:`, emailData.id);
      } catch (emailError: any) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
        emailsSent.push({
          email: profile.email,
          role: 'accountant',
          status: 'failed',
          error: emailError.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Accountant notifications processed',
        emailsSent 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-accountant function:", error);
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
