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
import { ArrowLeft, Upload, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const [isShortening, setIsShortening] = useState(false);
  
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
    budgetCode: 'AUTO',
    description: '',
    resubmissionComments: '',
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
        budgetCode: editRequisition.budgetCode || 'AUTO',
        description: editRequisition.description,
        resubmissionComments: '',
      });
    }
  }, [editRequisition]);

  // Auto-select user's department for preparers to avoid $0 remaining budget before selection
  useEffect(() => {
    if (!formData.department && user?.department) {
      setFormData((prev) => ({ ...prev, department: user.department as Department }));
    }
  }, [user]);

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

  const handleShortenDescription = async () => {
    if (!formData.description.trim()) {
      toast({
        title: "No Description",
        description: "Please enter a description first",
        variant: "destructive",
      });
      return;
    }

    setIsShortening(true);
    try {
      const { data, error } = await supabase.functions.invoke('shorten-description', {
        body: { description: formData.description }
      });

      if (error) {
        console.error('Error shortening description:', error);
        toast({
          title: "Error",
          description: "Failed to shorten description",
          variant: "destructive",
        });
        return;
      }

      if (data?.shortenedDescription) {
        setFormData({ ...formData, description: data.shortenedDescription });
        toast({
          title: "Description Shortened",
          description: "AI has condensed your description while keeping key information",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An error occurred while shortening description",
        variant: "destructive",
      });
    } finally {
      setIsShortening(false);
    }
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

    // Navigate based on department
    const route = formData.department === 'Finance' ? '/finance' : '/hod';
    navigate(route);
  };

  const hasDepartment = !!formData.department;
  const remainingBudget = hasDepartment ? getRemainingBudget(formData.department) : 0;
  const isOverBudget = hasDepartment ? parseFloat(formData.amount || '0') > remainingBudget : false;

  const backRoute = user?.role === 'finance_manager' ? '/finance_manager' : user?.role === 'preparer' ? '/preparer' : '/hod';

  return (
    <DashboardLayout title="Create New Requisition">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(backRoute)} className="mb-4">
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
            
            {editRequisition && editRequisition.approverComments && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <h3 className="font-semibold text-destructive mb-2">❌ Rejection Comments</h3>
                <p className="text-sm text-foreground">{editRequisition.approverComments}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Rejected by: {editRequisition.approvedBy || 'Unknown'} on {editRequisition.approvedDate ? new Date(editRequisition.approvedDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            )}
            
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
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Registry">Registry</SelectItem>
                      <SelectItem value="CEO">CEO</SelectItem>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Description/Justification *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleShortenDescription}
                    disabled={isShortening || !formData.description.trim()}
                    className="gap-2"
                  >
                    {isShortening ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Shortening...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Shorten with AI
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  placeholder="Enter detailed description or justification for this requisition..."
                />
                <p className="text-xs text-muted-foreground">
                  Write a detailed description, then use AI to shorten it while keeping key information
                </p>
              </div>

              {editRequisition && (
                <div className="space-y-2 bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <Label htmlFor="resubmissionComments">Resubmission Comments *</Label>
                  <Textarea
                    id="resubmissionComments"
                    value={formData.resubmissionComments}
                    onChange={(e) => setFormData({ ...formData, resubmissionComments: e.target.value })}
                    required={!!editRequisition}
                    rows={3}
                    placeholder="Explain what changes you've made based on the rejection feedback..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe how you've addressed the rejection comments above
                  </p>
                </div>
              )}

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
                  disabled={isSubmitting || !formData.department || isOverBudget}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Requisition'}
                </Button>
                <Button type="button" variant="destructive" onClick={() => navigate(backRoute)} className="flex-1">
                  Cancel
                </Button>
              </div>
              {isOverBudget && (
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
