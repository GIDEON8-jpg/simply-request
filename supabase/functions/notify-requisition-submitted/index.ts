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
  submitterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requisitionId, requisitionTitle, department, submitterName }: NotificationRequest = await req.json();
    
    console.log('Processing notification for requisition:', requisitionId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with roles that need to be notified
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role, profiles!inner(email, full_name)')
      .in('role', ['hod', 'finance_manager', 'technical_director', 'ceo', 'accountant']);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      throw rolesError;
    }

    console.log('Found users to notify:', userRoles?.length);

    const appUrl = 'https://ca65c39b-c714-453d-accf-abcbcda568ac.lovableproject.com';
    const emailsSent = [];

    // Send email to each user
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
            from: "ICAZ Procurement <onboarding@resend.dev>",
            to: [profile.email],
            subject: `New Requisition Submitted: ${requisitionTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2563eb;">New Requisition Notification</h1>
                <p>Dear ${profile.full_name},</p>
                
                <p>A new requisition has been submitted and requires your attention:</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>Title:</strong> ${requisitionTitle}</p>
                  <p><strong>Department:</strong> ${department}</p>
                  <p><strong>Submitted by:</strong> ${submitterName}</p>
                </div>
                
                <p>Please review this requisition at your earliest convenience.</p>
                
                <a href="${appUrl}" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; margin: 20px 0;">
                  View Requisition
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
    console.error("Error in notify-requisition-submitted function:", error);
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
