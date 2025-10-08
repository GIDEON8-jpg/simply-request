import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { mockSuppliers, mockTaxClearances } from '@/data/mockData';
import { ArrowLeft, Upload, CheckCircle } from 'lucide-react';
import { Department, RequisitionType } from '@/types/requisition';

const NewRequisition = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    department: '' as Department,
    amount: '',
    chosenSupplier: '',
    otherSupplier1: '',
    otherSupplier2: '',
    chosenRequisition: '',
    type: 'standard' as RequisitionType,
    deviationReason: '',
    budgetCode: '',
    description: '',
  });

  const selectedSupplier = mockSuppliers.find(s => s.id === formData.chosenSupplier);
  const taxClearance = mockTaxClearances.find(tc => tc.supplierId === formData.chosenSupplier);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Requisition Submitted",
      description: "Your requisition has been submitted for approval.",
    });
    navigate('/hod');
  };

  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Your requisition has been saved as a draft.",
    });
  };

  return (
    <DashboardLayout title="Create New Requisition">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/hod')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>New Requisition Form</CardTitle>
          </CardHeader>
          <CardContent>
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
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($) *</Label>
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
                      {mockSuppliers.filter(s => s.status === 'active').map(supplier => (
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
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">Click to upload chosen requisition</p>
                    <p className="text-xs text-gray-500">PDF, DOC (max 5MB)</p>
                  </div>
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
                <h3 className="text-lg font-semibold">Supporting Documents</h3>
                
                <div className="space-y-2">
                  <Label>Supporting Document 1</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">Click to upload document</p>
                    <p className="text-xs text-gray-500">PDF, DOC, XLS (max 10MB)</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Supporting Document 2</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">Click to upload document</p>
                    <p className="text-xs text-gray-500">PDF, DOC, XLS (max 10MB)</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                  Submit Requisition
                </Button>
                <Button type="button" variant="outline" onClick={handleSaveDraft} className="flex-1">
                  Save Draft
                </Button>
                <Button type="button" variant="destructive" onClick={() => navigate('/hod')}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default NewRequisition;
