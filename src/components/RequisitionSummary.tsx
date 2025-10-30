import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Requisition } from '@/types/requisition';

interface RequisitionSummaryProps {
  requisition: Requisition;
}

export const RequisitionSummary = ({ requisition }: RequisitionSummaryProps) => {
  const [summary, setSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-requisition', {
        body: { requisition }
      });

      if (error) {
        console.error('Error generating summary:', error);
        toast.error('Failed to generate summary');
        return;
      }

      if (data?.summary) {
        setSummary(data.summary);
        toast.success('Summary generated successfully');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred while generating summary');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Summary
        </CardTitle>
        <CardDescription>
          Generate an AI-powered summary explaining this requisition and why it was chosen
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!summary ? (
          <Button 
            onClick={generateSummary} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Summary...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Summary
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm leading-relaxed">{summary}</p>
            </div>
            <Button 
              onClick={generateSummary} 
              disabled={isGenerating}
              variant="outline"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                'Regenerate Summary'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
