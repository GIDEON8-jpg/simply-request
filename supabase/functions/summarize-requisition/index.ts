import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requisition } = await req.json();
    
    if (!requisition) {
      throw new Error('Requisition data is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating summary for requisition:', requisition.id);

    const supplierInfo = requisition.chosenSupplier 
      ? `${requisition.chosenSupplier.name} (ICAZ: ${requisition.chosenSupplier.icazNumber})`
      : 'Not specified';

    const prompt = `You are a procurement analyst. Generate a concise executive summary for this requisition approval.

Requisition Details:
- Title: ${requisition.title}
- Department: ${requisition.department}
- Amount: ${requisition.currency} ${requisition.amount}${requisition.usdConvertible ? ` (USD ${requisition.usdConvertible})` : ''}
- Submitted by: ${requisition.submittedBy}
- Date: ${requisition.submittedDate}
- Budget Code: ${requisition.budgetCode}
- Chosen Supplier: ${supplierInfo}
- Type: ${requisition.type}
- Status: ${requisition.status}
${requisition.deviationReason ? `- Deviation Reason: ${requisition.deviationReason}` : ''}

Description: ${requisition.description}

Generate a professional 2-3 sentence summary that:
1. Explains what is being requested and from which supplier
2. Highlights the key details (amount, supplier, type)
3. Notes any important context or deviation reasons

Keep it concise and professional.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a professional procurement analyst who creates clear, concise summaries.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;

    console.log('Summary generated successfully');

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in summarize-requisition:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
