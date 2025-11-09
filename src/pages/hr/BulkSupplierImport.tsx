import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText } from 'lucide-react';
import { useSuppliers } from '@/contexts/SuppliersContext';

interface ImportResult {
  successful: string[];
  failed: { name: string; error: string }[];
}

export const BulkSupplierImport = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImportResult | null>(null);
  const { toast } = useToast();
  const { refreshSuppliers } = useSuppliers();

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const supplier: any = {};
      headers.forEach((header, index) => {
        supplier[header] = values[index] || '';
      });
      return supplier;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResults(null);

    try {
      const text = await file.text();
      const suppliers = parseCSV(text);

      const { data, error } = await supabase.functions.invoke('bulk-import-suppliers', {
        body: { suppliers }
      });

      if (error) throw error;

      setResults(data);
      await refreshSuppliers();
      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.successful.length} suppliers. ${data.failed.length} failed.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportDefault = async () => {
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/suppliers_list.csv');
      const text = await response.text();
      const suppliers = parseCSV(text);

      const { data, error } = await supabase.functions.invoke('bulk-import-suppliers', {
        body: { suppliers }
      });

      if (error) throw error;

      setResults(data);
      await refreshSuppliers();
      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.successful.length} suppliers. ${data.failed.length} failed.`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Import Suppliers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with columns: name, icaz_number, contact_info, status
          </p>
          <div className="flex gap-2">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={loading}
            />
            <Button
              onClick={handleImportDefault}
              disabled={loading}
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              Import Default
            </Button>
          </div>
        </div>

        {results && (
          <div className="space-y-4 mt-4">
            {results.successful.length > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  Successfully Imported ({results.successful.length})
                </h3>
                <ul className="list-disc list-inside text-sm text-green-800 dark:text-green-200">
                  {results.successful.map((name, idx) => (
                    <li key={idx}>{name}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.failed.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                  Failed Imports ({results.failed.length})
                </h3>
                <ul className="list-disc list-inside text-sm text-red-800 dark:text-red-200">
                  {results.failed.map((item, idx) => (
                    <li key={idx}>
                      <strong>{item.name}</strong>: {item.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
