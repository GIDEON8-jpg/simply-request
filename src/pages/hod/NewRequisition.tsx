import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, CheckCircle } from 'lucide-react';
import { Department, RequisitionType, Currency } from '@/types/requisition';
import { useSuppliers } from '@/contexts/SuppliersContext';
import { useRequisitions } from '@/contexts/RequisitionsContext';
import { useAuth } from '@/contexts/AuthContext';
import BudgetWarning from '@/components/BudgetWarning';

const NewRequisition = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { suppliers, taxClearances } = useSuppliers();
  const { addRequisition, getRemainingBudget } = useRequisitions();
  const { user } = useAuth();
  const editRequisition = location.state?.editRequisition;
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    department: '' as Department,
    amount: '',
    currency: 'USD' as Currency,
    usdConvertible: '',
    chosenSupplier: '',
    otherSupplier1: '',
    otherSupplier2: '',
    chosenRequisition: '',
    type: 'standard' as RequisitionType,
    deviationReason: '',
    budgetCode: '',
    description: '',
  });

  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  const [chosenRequisitionFile, setChosenRequisitionFile] = useState<File | null>(null);

  useEffect(() => {
    if (editRequisition) {
      setFormData({
        title: editRequisition.title,
        department: editRequisition.department,
        amount: editRequisition.amount.toString(),
        currency: editRequisition.currency || 'USD',
        usdConvertible: editRequisition.usdConvertible?.toString() || '',
        chosenSupplier: editRequisition.chosenSupplier.id,
        otherSupplier1: '',
        otherSupplier2: '',
        chosenRequisition: '',
        type: editRequisition.type,
        deviationReason: editRequisition.deviationReason || '',
        budgetCode: editRequisition.budgetCode,
        description: editRequisition.description,
      });
    }
  }, [editRequisition]);

  const selectedSupplier = suppliers.find(s => s.id === formData.chosenSupplier);
  const taxClearance = taxClearances.find(tc => tc.supplierId === formData.chosenSupplier);

  const handleChosenRequisitionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setChosenRequisitionFile(file);
      toast({
        title: "File Selected",
        description: `${file.name} selected`,
      });
    }
  };

  const handleSupportingDocumentsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSupportingDocuments(prev => [...prev, ...files]);
    toast({
      title: "Files Selected",
      description: `${files.length} file(s) added`,
    });
  };

  const removeDocument = (index: number) => {
    setSupportingDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    const reqAmount = parseFloat(formData.amount);
    const remaining = getRemainingBudget(formData.department);
    
    if (reqAmount > remaining) {
      toast({
        title: "Insufficient Budget",
        description: `This requisition exceeds the remaining budget of $${remaining.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    const selectedSupplierData = suppliers.find(s => s.id === formData.chosenSupplier);
    const taxClearanceData = taxClearances.find(tc => tc.supplierId === formData.chosenSupplier);

    if (!selectedSupplierData) {
      toast({
        title: "Error",
        description: "Please select a valid supplier",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const newRequisition = {
      id: `REQ-${Date.now()}`,
      title: formData.title,
      department: formData.department,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      usdConvertible: formData.currency !== 'USD' && formData.usdConvertible ? parseFloat(formData.usdConvertible) : undefined,
      chosenSupplier: selectedSupplierData,
      chosenRequisition: chosenRequisitionFile?.name || '',
      type: formData.type,
      deviationReason: formData.deviationReason,
      budgetCode: formData.budgetCode,
      description: formData.description,
      status: 'pending' as const,
      submittedBy: user?.username || 'Unknown',
      submittedDate: new Date().toISOString(),
      taxClearanceAttached: taxClearanceData,
      documents: supportingDocuments.map(f => f.name),
    };

    addRequisition(newRequisition);

    toast({
      title: "Requisition Submitted Successfully",
      description: "Your requisition has been submitted and is pending approval.",
    });

    navigate('/hod');
  };

  const remainingBudget = formData.department ? getRemainingBudget(formData.department) : 0;
  const isOverBudget = parseFloat(formData.amount || '0') > remainingBudget;

  return (
    <DashboardLayout title="Create New Requisition">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/hod')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>
              {editRequisition ? 'Edit & Resubmit Requisition' : 'New Requisition Form'}
              {editRequisition && (
                <span className="ml-2 text-sm text-red-600 font-normal">
                  (Previously Rejected - {editRequisition.rejectionReason})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formData.department && <BudgetWarning department={formData.department} />}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Requisition Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value as Department })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Marketing and PR">Marketing and PR</SelectItem>
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Human Resources and Admin">Human Resources and Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value as Currency })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="ZWG">ZWG (ZW$)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.currency as string) !== 'USD' && (
                  <div className="space-y-2">
                    <Label htmlFor="usdConvertible">USD Convertible Amount *</Label>
                    <Input
                      id="usdConvertible"
                      type="number"
                      step="0.01"
                      placeholder="Enter amount in USD"
                      value={formData.usdConvertible}
                      onChange={(e) => setFormData({ ...formData, usdConvertible: e.target.value })}
                      required={(formData.currency as string) !== 'USD'}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the equivalent amount in USD for authorization routing
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="budgetCode">Budget Code *</Label>
                  <Input
                    id="budgetCode"
                    value={formData.budgetCode}
                    onChange={(e) => setFormData({ ...formData, budgetCode: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Supplier Section */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">Supplier & Documents</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="chosenSupplier">Chosen Supplier *</Label>
                  <Select
                    value={formData.chosenSupplier}
                    onValueChange={(value) => setFormData({ ...formData, chosenSupplier: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.filter(s => s.status === 'active').map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name} - {supplier.icazNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {taxClearance && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                      <CheckCircle className="h-4 w-4" />
                      Tax Clearance Auto-Attached: {taxClearance.fileName} (Valid: {taxClearance.quarter} {taxClearance.year})
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chosenRequisition">Upload Chosen Requisition *</Label>
                  <input
                    type="file"
                    id="chosenRequisition"
                    accept=".pdf,.doc,.docx"
                    onChange={handleChosenRequisitionUpload}
                    className="hidden"
                    required={!editRequisition}
                  />
                  <label
                    htmlFor="chosenRequisition"
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      {chosenRequisitionFile ? `✓ ${chosenRequisitionFile.name}` : 'Click to upload chosen requisition'}
                    </p>
                    <p className="text-xs text-gray-500">PDF, DOC (max 5MB)</p>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Requisition Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as RequisitionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="deviation">Deviation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'deviation' && (
                <div className="space-y-2 bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <Label htmlFor="deviationReason">Reason for Deviation *</Label>
                  <Textarea
                    id="deviationReason"
                    value={formData.deviationReason}
                    onChange={(e) => setFormData({ ...formData, deviationReason: e.target.value })}
                    required
                    rows={3}
                    placeholder="Please provide detailed reason for deviation from standard procedure"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description/Justification *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">Supporting Documents (Multiple files allowed)</h3>
                
                <div className="space-y-2">
                  <input
                    type="file"
                    id="supportingDocuments"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleSupportingDocumentsUpload}
                    className="hidden"
                    multiple
                  />
                  <label
                    htmlFor="supportingDocuments"
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">Click to upload supporting documents</p>
                    <p className="text-xs text-gray-500">PDF, DOC, XLS (max 10MB each, multiple files allowed)</p>
                  </label>

                  {supportingDocuments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium">Attached Files ({supportingDocuments.length}):</p>
                      {supportingDocuments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm text-gray-700">✓ {file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDocument(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting || remainingBudget <= 100 || isOverBudget}
                >
                  {remainingBudget <= 100 ? 'Budget Exhausted' : isSubmitting ? 'Submitting...' : 'Submit Requisition'}
                </Button>
                <Button type="button" variant="destructive" onClick={() => navigate('/hod')} className="flex-1">
                  Cancel
                </Button>
              </div>
              {isOverBudget && remainingBudget > 100 && (
                <p className="text-sm text-red-600 font-medium">
                  This amount exceeds the remaining budget of ${remainingBudget.toFixed(2)}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NewRequisition;
