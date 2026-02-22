import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PopFile {
  name: string;
  url: string;
}

interface NotificationRequest {
  requisitionId: string;
  department: string;
  title: string;
  amount: number;
  currency: string;
  popFileName?: string;
  popFileUrls?: PopFile[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { requisitionId, department, title, amount, currency, popFileName, popFileUrls }: NotificationRequest = await req.json();

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
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the submitter's profile
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

    const hodProfile = hodRoles?.find((r: any) => r.profiles?.department === department)?.profiles as any;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const recipients: string[] = [];
    const recipientNames: string[] = [];
    
    if (submitterProfile?.email) {
      recipients.push(submitterProfile.email);
      recipientNames.push(submitterProfile.full_name || 'Requisition Owner');
    }
    
    if (hodProfile?.email && hodProfile.email !== submitterProfile?.email) {
      recipients.push(hodProfile.email);
      recipientNames.push(hodProfile.full_name || 'HOD');
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending notifications to: ${recipients.join(', ')}`);

    // Build attachments from POP file URLs
    const attachments: { filename: string; content: string }[] = [];
    if (popFileUrls && popFileUrls.length > 0) {
      for (const popFile of popFileUrls) {
        try {
          console.log(`Fetching POP file: ${popFile.name} from ${popFile.url}`);
          const fileResponse = await fetch(popFile.url);
          if (fileResponse.ok) {
            const fileBuffer = await fileResponse.arrayBuffer();
            const base64Content = base64Encode(new Uint8Array(fileBuffer));
            attachments.push({
              filename: popFile.name,
              content: base64Content,
            });
            console.log(`Attached file: ${popFile.name}`);
          } else {
            console.error(`Failed to fetch file ${popFile.name}: ${fileResponse.status}`);
          }
        } catch (fileError) {
          console.error(`Error fetching POP file ${popFile.name}:`, fileError);
        }
      }
    }

    // Build POP links for the email body
    const popLinksHtml = popFileUrls && popFileUrls.length > 0
      ? `<div style="margin: 15px 0;">
           <p><strong>Proof of Payment Files:</strong></p>
           <ul style="list-style: none; padding: 0;">
             ${popFileUrls.map(f => `<li style="margin: 5px 0;"><a href="${f.url}" style="color: #2563eb; text-decoration: underline;">${f.name}</a></li>`).join('')}
           </ul>
         </div>`
      : '';

    try {
      const emailPayload: any = {
        from: "ICAZ Procurement <noreply@apps.icaz.org.zw>",
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
            
            ${popLinksHtml}
            
            <p>The proof of payment has been uploaded and the requisition is now <strong style="color: #16a34a;">COMPLETED</strong>.</p>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated notification from the ICAZ Procurement System.
            </p>
          </div>
        `,
      };

      // Add attachments if any were fetched
      if (attachments.length > 0) {
        emailPayload.attachments = attachments;
      }

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
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
          recipients,
          recipientNames,
          attachmentsCount: attachments.length,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (emailError: any) {
      console.error('Error sending email:', emailError);
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${emailError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error("Error in notify-hod-payment function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
