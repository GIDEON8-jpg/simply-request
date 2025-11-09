import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Upload, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from '@/contexts/SuppliersContext';
import { BulkSupplierImport } from './BulkSupplierImport';
import { supabase } from '@/integrations/supabase/client';

const HRDashboard = () => {
  const { toast } = useToast();
  const { suppliers, taxClearances, addSupplier, addTaxClearance, deactivateSupplier } = useSuppliers();
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    icazNumber: '',
    contactInfo: '',
  });
  const [newSupplierTaxFile, setNewSupplierTaxFile] = useState<File | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [taxClearanceFile, setTaxClearanceFile] = useState<File | null>(null);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSupplierTaxFile) {
      toast({
        title: "Tax Clearance Required",
        description: "Please upload a tax clearance certificate before adding the supplier",
        variant: "destructive",
      });
      return;
    }

    try {
      // Add new supplier
      await addSupplier({
        name: newSupplier.name,
        icazNumber: newSupplier.icazNumber,
        contactInfo: newSupplier.contactInfo,
        status: 'active' as const,
      });

      // Get the newly created supplier
      const newSuppliers = await supabase
        .from('suppliers')
        .select('*')
        .eq('name', newSupplier.name)
        .eq('icaz_number', newSupplier.icazNumber)
        .order('created_at', { ascending: false })
        .limit(1);

      if (newSuppliers.data && newSuppliers.data.length > 0) {
        const supplierId = newSuppliers.data[0].id;
        const fileExt = newSupplierTaxFile.name.split('.').pop();
        const filePath = `${supplierId}/${Date.now()}.${fileExt}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('tax-clearances')
          .upload(filePath, newSupplierTaxFile);

        if (uploadError) throw uploadError;

        // Add tax clearance record to database
        await addTaxClearance({
          supplierId,
          fileName: filePath,
          quarter: 'Q3',
          year: '2025',
          validFrom: '2025-09-01',
          validTo: '2025-12-31',
        });
      }

      toast({
        title: "Supplier Added",
        description: `${newSupplier.name} has been added with tax clearance`,
      });
      
      setNewSupplier({ name: '', icazNumber: '', contactInfo: '' });
      setNewSupplierTaxFile(null);
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast({
        title: "Error",
        description: "Failed to add supplier",
        variant: "destructive",
      });
    }
  };

  const handleNewSupplierTaxFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }
      setNewSupplierTaxFile(file);
      toast({
        title: "File Selected",
        description: `${file.name} is ready to upload`,
      });
    }
  };

  const handleTaxClearanceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }
      setTaxClearanceFile(file);
      toast({
        title: "File Selected",
        description: `${file.name} is ready to upload`,
      });
    }
  };

  const handleUploadTaxClearance = async () => {
    if (!selectedSupplierId) {
      toast({
        title: "Select Supplier",
        description: "Please select a supplier first",
        variant: "destructive",
      });
      return;
    }
    if (!taxClearanceFile) {
      toast({
        title: "No File Selected",
        description: "Please select a tax clearance file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileExt = taxClearanceFile.name.split('.').pop();
      const filePath = `${selectedSupplierId}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('tax-clearances')
        .upload(filePath, taxClearanceFile);

      if (uploadError) throw uploadError;

      // Add tax clearance record to database
      await addTaxClearance({
        supplierId: selectedSupplierId,
        fileName: filePath,
        quarter: 'Q3',
        year: '2025',
        validFrom: '2025-09-01',
        validTo: '2025-12-31',
      });

      toast({
        title: "Tax Clearance Uploaded",
        description: `${taxClearanceFile.name} has been added to the repository`,
      });
      setTaxClearanceFile(null);
      setSelectedSupplierId('');
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload tax clearance",
        variant: "destructive",
      });
    }
  };

  const handleDeactivateSupplier = async () => {
    if (!selectedSupplierId) {
      toast({
        title: "Select Supplier",
        description: "Please select a supplier to deactivate",
        variant: "destructive",
      });
      return;
    }

    try {
      await deactivateSupplier(selectedSupplierId);
      toast({
        title: "Supplier Deactivated",
        description: "Supplier has been removed from the active list (history preserved)",
      });
      setSelectedSupplierId('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to deactivate supplier",
        variant: "destructive",
      });
    }
  };

  const handleDownloadTaxClearance = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('tax-clearances')
        .download(filePath);

      if (error) throw error;

      // Create a download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'tax-clearance.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Downloaded",
        description: "Tax clearance downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download tax clearance",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout title="HR & Admin Dashboard">
      <div className="space-y-6">
        {/* Bulk Import Suppliers */}
        <BulkSupplierImport />

        {/* Add New Supplier */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierName">Supplier Name *</Label>
                  <Input
                    id="supplierName"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icazNumber">ICAZ Registration Number *</Label>
                  <Input
                    id="icazNumber"
                    value={newSupplier.icazNumber}
                    onChange={(e) => setNewSupplier({ ...newSupplier, icazNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactInfo">Contact Info *</Label>
                  <Input
                    id="contactInfo"
                    value={newSupplier.contactInfo}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contactInfo: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newSupplierTaxFile">Tax Clearance Certificate (PDF) *</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    id="newSupplierTaxFile"
                    accept=".pdf"
                    onChange={handleNewSupplierTaxFileChange}
                    className="hidden"
                  />
                  <label htmlFor="newSupplierTaxFile" className="cursor-pointer block">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      {newSupplierTaxFile ? newSupplierTaxFile.name : 'Click to upload Tax Clearance Certificate'}
                    </p>
                    <p className="text-xs text-gray-500">PDF format only - Required before adding supplier</p>
                    <p className="text-xs text-green-600 mt-2">Valid: Q3 2025 (Sep-Dec) - Quarterly validation</p>
                  </label>
                </div>
              </div>

              <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={!newSupplierTaxFile}>
                <Plus className="mr-2 h-4 w-4" />
                ADD SUPPLIER
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Upload Tax Clearance */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Tax Clearance for Supplier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="selectSupplier">Select Supplier</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.filter(s => s.status === 'active').map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name} - {supplier.icazNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxClearanceFile">Tax Clearance Certificate (PDF)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  id="taxClearanceFile"
                  accept=".pdf"
                  onChange={handleTaxClearanceFileChange}
                  className="hidden"
                />
                <label htmlFor="taxClearanceFile" className="cursor-pointer block">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    {taxClearanceFile ? taxClearanceFile.name : 'Click to upload Tax Clearance Certificate'}
                  </p>
                  <p className="text-xs text-gray-500">PDF format only</p>
                  <p className="text-xs text-green-600 mt-2">Valid: Q3 2025 (Sep-Dec) - Quarterly validation</p>
                </label>
              </div>
            </div>

            <Button 
              onClick={handleUploadTaxClearance} 
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={!taxClearanceFile || !selectedSupplierId}
            >
              <Upload className="mr-2 h-4 w-4" />
              UPLOAD TAX CLEARANCE
            </Button>
          </CardContent>
        </Card>

        {/* Remove/Deactivate Supplier */}
        <Card>
          <CardHeader>
            <CardTitle>Remove/Deactivate Supplier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deactivateSupplier">Select Supplier</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a supplier to deactivate" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.filter(s => s.status === 'active').map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleDeactivateSupplier} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              DEACTIVATE SUPPLIER
            </Button>
            <p className="text-xs text-muted-foreground">Note: Soft delete - keeps history, removes from active list</p>
          </CardContent>
        </Card>

        {/* Tax Clearance Repository */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Clearance Repository</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Quarter</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Valid From</TableHead>
                  <TableHead>Valid To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxClearances.map((tc) => {
                  const supplier = suppliers.find(s => s.id === tc.supplierId);
                  const isValid = new Date(tc.validTo) >= new Date();
                  return (
                    <TableRow key={tc.id}>
                      <TableCell className="font-medium">{supplier?.name}</TableCell>
                      <TableCell>{tc.fileName}</TableCell>
                      <TableCell>{tc.quarter}</TableCell>
                      <TableCell>{tc.year}</TableCell>
                      <TableCell>{new Date(tc.validFrom).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(tc.validTo).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={isValid ? 'bg-green-600' : 'bg-red-600'}>
                          {isValid ? 'Valid' : 'Expired'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadTaxClearance(tc.fileName)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-purple-900">Tax Clearance Repository Information:</p>
              <ul className="list-disc list-inside text-purple-800 space-y-1">
                <li>Stores all supplier tax clearances</li>
                <li>Updates quarterly (Q1, Q2, Q3, Q4)</li>
                <li>When HOD selects supplier → system pulls latest valid tax clearance automatically</li>
                <li>Ensures compliance with tax regulations</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default HRDashboard;
