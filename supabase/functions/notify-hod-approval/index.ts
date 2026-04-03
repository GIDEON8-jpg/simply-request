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
  hodName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requisitionId, requisitionTitle, department, amount, currency, hodName }: NotificationRequest = await req.json();
    
    console.log('Processing HOD approval notification for requisition:', requisitionId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // After HOD approval, ALWAYS route to Deputy Finance Manager first
    const nextRole = 'deputy_finance_manager';

    console.log(`Amount: ${amount} ${currency}, Next approver role: ${nextRole} (Deputy Finance Manager)`);

    // Get users with the deputy_finance_manager role
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role, profiles!inner(email, full_name)')
      .eq('role', nextRole);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      throw rolesError;
    }

    console.log('Found users to notify:', userRoles?.length);

    const appUrl = 'https://simply-request.lovable.app';
    const emailsSent = [];

    const { data: reqData } = await supabase
      .from('requisitions')
      .select('requisition_number')
      .eq('id', requisitionId)
      .single();
    const reqNumber = reqData?.requisition_number ? `REQ_${reqData.requisition_number}` : requisitionId;

    for (const userRole of userRoles || []) {
      const profile = userRole.profiles as unknown as { email: string; full_name: string };
      
      console.log(`Sending email to ${profile.email} (${userRole.role})`);

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
            subject: `HOD Approved Requisition - Your Review Required: ${requisitionTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2563eb;">Requisition Approved by HOD - Your Review Required</h1>
                <p>Dear ${profile.full_name},</p>
                
                <p>The HOD has approved a requisition that now requires your review and approval:</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Title:</strong> ${requisitionTitle}</p>
                  <p><strong>Department:</strong> ${department}</p>
                  <p><strong>Amount:</strong> ${currency} ${amount.toFixed(2)}</p>
                  <p><strong>Requisition ID:</strong> ${reqNumber}</p>
                  <p><strong>Approved by:</strong> ${hodName} (HOD)</p>
                </div>
                
                <p>As Deputy Finance Manager, this requisition requires your review before proceeding to the Finance Manager.</p>
                
                <p>Log in to the ICAZ Procurement System to review: <a href="${appUrl}" style="color: #2563eb; text-decoration: underline;">${appUrl}</a></p>
                
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
          role: userRole.role,
          status: 'sent',
          messageId: emailData.id
        });

        console.log(`Email sent successfully to ${profile.email}:`, emailData.id);
      } catch (emailError: any) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
        emailsSent.push({
          email: profile.email,
          role: userRole.role,
          status: 'failed',
          error: emailError.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notifications processed',
        nextRole,
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
    console.error("Error in notify-hod-approval function:", error);
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
