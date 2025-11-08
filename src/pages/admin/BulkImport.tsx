import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

interface ImportResult {
  success: string[];
  failed: { email: string; error: string }[];
}

const BulkImport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        name: values[0]?.trim() || '',
        email: values[1]?.trim() || '',
        password: values[2]?.trim() || '',
        role: values[3]?.trim() || '',
        department: values[4]?.trim() || '',
      };
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const users = parseCSV(text);

      console.log('Parsed users:', users);

      const { data, error } = await supabase.functions.invoke('bulk-import-users', {
        body: { users }
      });

      if (error) throw error;

      setResult(data as ImportResult);

      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.success.length} users. ${data.failed.length} failed.`,
        variant: data.failed.length > 0 ? "default" : "default",
      });

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportDefault = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/icaz_users.csv');
      const text = await response.text();
      const users = parseCSV(text);

      console.log('Importing default CSV with users:', users.length);

      const { data, error } = await supabase.functions.invoke('bulk-import-users', {
        body: { users }
      });

      if (error) throw error;

      setResult(data as ImportResult);

      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.success.length} users. ${data.failed.length} failed.`,
      });

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="Bulk User Import">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Import Users from CSV</CardTitle>
            <CardDescription>
              Upload a CSV file with columns: Name, Email, Password, Role, Department
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload CSV file</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      or drag and drop your file here
                    </p>
                  </div>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isLoading}
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 border-t" />
              <span className="text-sm text-muted-foreground">OR</span>
              <div className="flex-1 border-t" />
            </div>

            <Button 
              onClick={handleImportDefault}
              disabled={isLoading}
              className="w-full"
              variant="secondary"
            >
              {isLoading ? "Importing..." : "Import Pre-loaded ICAZ Users"}
            </Button>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                CSV Format Requirements
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Column 1: Full Name</li>
                <li>• Column 2: Email</li>
                <li>• Column 3: Password</li>
                <li>• Column 4: Role (Preparer, HOD, CEO, etc.)</li>
                <li>• Column 5: Department (Technical, IT, Finance, etc.)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.success.length > 0 && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Successfully Imported ({result.success.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto bg-muted/50 p-3 rounded">
                    <ul className="text-sm space-y-1">
                      {result.success.map((email, idx) => (
                        <li key={idx} className="text-muted-foreground">✓ {email}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {result.failed.length > 0 && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2 text-destructive">
                    <XCircle className="h-5 w-5" />
                    Failed ({result.failed.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto bg-muted/50 p-3 rounded">
                    <ul className="text-sm space-y-2">
                      {result.failed.map((item, idx) => (
                        <li key={idx} className="text-muted-foreground">
                          <span className="font-medium">✗ {item.email}</span>
                          <br />
                          <span className="text-xs text-destructive">{item.error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BulkImport;
