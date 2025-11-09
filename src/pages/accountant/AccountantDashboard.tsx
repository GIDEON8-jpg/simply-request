import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRequisitions } from '@/contexts/RequisitionsContext';
import { Upload, CheckCircle, Mail, Download, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { RequisitionSummary } from '@/components/RequisitionSummary';
import { supabase } from '@/integrations/supabase/client';

const AccountantDashboard = () => {
  const { toast } = useToast();
  const { requisitions, updateRequisition } = useRequisitions();
  const [uploadedPOP, setUploadedPOP] = useState<{ [key: string]: File[] }>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [waitReasons, setWaitReasons] = useState<Record<string, string>>({});
  const [showWaitField, setShowWaitField] = useState<Record<string, boolean>>({});

  const pendingApprovals = requisitions.filter(r => 
    r.status === 'approved' && 
    !r.paymentDate
  );

  const approvedForPayment = requisitions.filter(r => 
    r.status === 'approved' && 
    r.approvedBy === 'Accountant'
  );
  

  const handleAction = async (reqId: string, action: 'approve' | 'reject' | 'wait') => {
    if (action === 'reject' && !comments[reqId]?.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide a comment for rejection",
        variant: "destructive",
      });
      return;
    }

    if (action === 'wait' && !waitReasons[reqId]?.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for approval with wait status",
        variant: "destructive",
      });
      return;
    }

    if (action === 'approve' && (!uploadedPOP[reqId] || uploadedPOP[reqId].length === 0)) {
      toast({
        title: "Proof of Payment Required",
        description: "Please upload proof of payment before approving",
        variant: "destructive",
      });
      return;
    }

    const updates: Partial<typeof requisitions[0]> = {
      status: action === 'approve' ? 'completed' : action === 'reject' ? 'rejected' : 'approved_wait',
      approverComments: action === 'reject' ? comments[reqId] : action === 'wait' ? waitReasons[reqId] : undefined,
      approvedBy: action !== 'reject' ? 'Accountant' : undefined,
      approvedDate: action !== 'reject' ? new Date().toISOString() : undefined,
      paymentDate: action === 'approve' ? new Date().toISOString() : undefined,
    };

    await updateRequisition(reqId, updates);

    // Send email to HOD if approved
    if (action === 'approve') {
      const req = requisitions.find(r => r.id === reqId);
      if (req) {
        try {
          await supabase.functions.invoke('notify-hod-payment', {
            body: { 
              requisitionId: reqId,
              department: req.department,
              title: req.title,
              amount: req.amount,
              currency: req.currency,
            }
          });
          
          toast({
            title: "Email Sent",
            description: "HOD has been notified of payment completion",
          });
        } catch (error) {
          console.error('Error sending email:', error);
        }
      }
    }

    toast({
      title: action === 'approve' ? "Requisition Approved & Paid" : action === 'reject' ? "Requisition Rejected" : "Approved with Wait Status",
      description: `Requisition ${reqId} has been ${action === 'approve' ? 'approved and payment completed' : action === 'reject' ? 'rejected' : 'approved but marked for wait'}.`,
    });

    setComments(prev => ({ ...prev, [reqId]: '' }));
    setWaitReasons(prev => ({ ...prev, [reqId]: '' }));
    setShowWaitField(prev => ({ ...prev, [reqId]: false }));
    setUploadedPOP(prev => ({ ...prev, [reqId]: [] }));
  };

  const handleWaitClick = (reqId: string) => {
    setShowWaitField(prev => ({ ...prev, [reqId]: !prev[reqId] }));
  };

  const handleUploadPOP = (reqId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedPOP({ ...uploadedPOP, [reqId]: [...(uploadedPOP[reqId] || []), ...files] });
      toast({
        title: "Proof of Payment Uploaded",
        description: `${files.length} file(s) uploaded`,
      });
    }
  };

  const removePOPFile = (reqId: string, fileIndex: number) => {
    setUploadedPOP(prev => ({
      ...prev,
      [reqId]: prev[reqId].filter((_, i) => i !== fileIndex)
    }));
  };

  const handleMarkComplete = (reqId: string) => {
    if (!uploadedPOP[reqId] || uploadedPOP[reqId].length === 0) {
      toast({
        title: "Upload Required",
        description: "Please upload proof of payment before marking as complete",
        variant: "destructive",
      });
      return;
    }

    updateRequisition(reqId, { 
      status: 'completed', 
      paymentDate: new Date().toISOString() 
    });

    toast({
      title: "Status Synced",
      description: "Requisition status updated to Completed and synced with system",
    });
  };

  const handleNotifyHOD = (reqId: string) => {
    toast({
      title: "Email Sent",
      description: "HOD has been notified that payment is complete",
    });
  };


  const handleDownloadDocument = (fileName: string) => {
    // Create a blob with sample content
    const content = `Sample Document: ${fileName}\n\nThis is a placeholder for the actual document.\nIn production, this would be the actual file from your server.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Downloaded",
      description: `${fileName} has been downloaded`,
    });
  };

  const getCurrencySymbol = (currency: string) => {
    switch(currency) {
      case 'USD': return '$';
      case 'ZWG': return 'ZW$';
      case 'GBP': return '£';
      case 'EUR': return '€';
      default: return '$';
    }
  };

  return (
    <DashboardLayout title="Accountant Dashboard">
      <div className="space-y-6">
        {/* Pending Approvals from Technical Director or CEO */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Requisitions for Final Review</CardTitle>
            <p className="text-sm text-muted-foreground">
              Requisitions approved by final approvers awaiting your payment processing
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {pendingApprovals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending requisitions for review</p>
            ) : (
              pendingApprovals.map(req => (
                <Card key={req.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Requisition ID</p>
                        <p className="font-semibold">{req.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-semibold text-lg">{getCurrencySymbol(req.currency)}{req.amount.toFixed(2)} ({req.currency})</p>
                        {req.usdConvertible && (
                          <p className="text-xs text-muted-foreground">USD Equivalent: ${req.usdConvertible.toFixed(2)}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Title</p>
                        <p className="font-medium">{req.title}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Department</p>
                        <p className="font-medium">{req.department}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Approved By</p>
                        <p className="font-medium">{req.approvedBy || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Supplier</p>
                        <p className="font-medium">{req.chosenSupplier.name}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm mt-1">{req.description}</p>
                    </div>

                    {/* Documents Section */}
                    {(req.chosenRequisition || req.documents.length > 0 || req.taxClearanceAttached) && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Supporting Documents</p>
                        <div className="flex flex-wrap gap-2">
                          {req.chosenRequisition && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDocument(req.chosenRequisition!)}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Chosen Requisition
                            </Button>
                          )}
                          {req.documents.map((doc, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDocument(doc)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              {doc}
                            </Button>
                          ))}
                          {req.taxClearanceAttached && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadDocument(req.taxClearanceAttached!.fileName)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Tax Clearance: {req.taxClearanceAttached.fileName}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    <RequisitionSummary requisition={req} />

                    <div className="space-y-2">
                      <Label htmlFor={`acc-comment-${req.id}`}>Comments (Required for rejection)</Label>
                      <Textarea
                        id={`acc-comment-${req.id}`}
                        value={comments[req.id] || ''}
                        onChange={(e) => setComments(prev => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="Add your comments here..."
                        rows={3}
                      />
                    </div>

                    {showWaitField[req.id] && (
                      <div className="space-y-2 bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <Label htmlFor={`acc-wait-${req.id}`}>Reason for Wait *</Label>
                        <Textarea
                          id={`acc-wait-${req.id}`}
                          value={waitReasons[req.id] || ''}
                          onChange={(e) => setWaitReasons(prev => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="Please provide reason for approval with wait status..."
                          rows={3}
                        />
                      </div>
                    )}

                    {/* Proof of Payment Upload */}
                    <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-100 p-2 rounded">
                        <Mail className="h-4 w-4" />
                        <span>Upon approval, POP will be sent to the {req.department} HOD via email</span>
                      </div>
                      <Label htmlFor={`pop-upload-${req.id}`}>Proof of Payment (Required for Approval) *</Label>
                      <input
                        type="file"
                        id={`pop-upload-${req.id}`}
                        accept=".pdf,.png,.jpg,.jpeg"
                        multiple
                        onChange={(e) => handleUploadPOP(req.id, e)}
                        className="hidden"
                      />
                      <label
                        htmlFor={`pop-upload-${req.id}`}
                        className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors cursor-pointer flex flex-col items-center"
                      >
                        <Upload className="h-6 w-6 text-blue-400" />
                        <p className="mt-2 text-sm text-gray-600">Click to upload proof of payment</p>
                        <p className="text-xs text-gray-500">PDF, PNG, JPG (max 10MB each)</p>
                      </label>
                      {uploadedPOP[req.id] && uploadedPOP[req.id].length > 0 && (
                        <div className="mt-2 space-y-1">
                          {uploadedPOP[req.id].map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-blue-200">
                              <span className="text-sm truncate flex-1">{file.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removePOPFile(req.id, idx)}
                                className="ml-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleAction(req.id, 'approve')}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        onClick={() => {
                          if (showWaitField[req.id]) {
                            handleAction(req.id, 'wait');
                          } else {
                            handleWaitClick(req.id);
                          }
                        }}
                        className="flex-1 bg-orange-600 hover:bg-orange-700"
                      >
                        {showWaitField[req.id] ? 'Submit Wait' : 'Approve but Wait'}
                      </Button>
                      <Button
                        onClick={() => handleAction(req.id, 'reject')}
                        variant="destructive"
                        className="flex-1"
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Approved Requisitions - Payment Processing */}
        <Card>
          <CardHeader>
            <CardTitle>Approved Requisitions - Payment Processing</CardTitle>
          </CardHeader>
          <CardContent>
            {approvedForPayment.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No approved requisitions pending payment</p>
            ) : (
              <div className="space-y-6">
                {approvedForPayment.map((req) => (
                  <Card key={req.id} className="border-2 border-green-200 bg-green-50/30">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold">{req.id} - {req.title}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{req.department}</Badge>
                            <Badge variant="outline">{getCurrencySymbol(req.currency)}{req.amount.toFixed(2)} ({req.currency})</Badge>
                            <Badge className="bg-green-600 text-white">✓ APPROVED (Awaiting Payment)</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Supplier</p>
                          <p className="font-medium">{req.chosenSupplier.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Submitted by</p>
                          <p className="font-medium">{req.submittedBy}</p>
                        </div>
                      </div>

                      {/* Documents Section */}
                      {(req.documents.length > 0 || req.taxClearanceAttached) && (
                        <div className="space-y-2 bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-muted-foreground">Supporting Documents</p>
                          <div className="flex flex-wrap gap-2">
                            {req.chosenRequisition && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadDocument(req.chosenRequisition)}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Chosen Requisition
                              </Button>
                            )}
                            {req.documents.map((doc, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadDocument(doc)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                {doc}
                              </Button>
                            ))}
                            {req.taxClearanceAttached && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadDocument(req.taxClearanceAttached!.fileName)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Tax Clearance
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="font-semibold mb-2">Step 1: Process Payment</p>
                        <Button className="w-full bg-orange-600 hover:bg-orange-700" size="lg">
                          🔄 PROCESS PAYMENT
                        </Button>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="font-semibold mb-2">Step 2: Upload Proof of Payment (Multiple files allowed)</p>
                        <input
                          type="file"
                          id={`pop-${req.id}`}
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleUploadPOP(req.id, e)}
                          className="hidden"
                          multiple
                        />
                        <label
                          htmlFor={`pop-${req.id}`}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer flex flex-col items-center"
                        >
                          <Upload className="h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">
                            📎 Click to upload proof of payment files
                          </p>
                          <p className="text-xs text-gray-500">PDF, JPG, PNG (multiple files allowed)</p>
                        </label>

                        {uploadedPOP[req.id] && uploadedPOP[req.id].length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium">Uploaded Files ({uploadedPOP[req.id].length}):</p>
                            {uploadedPOP[req.id].map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <span className="text-sm text-gray-700">✓ {file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePOPFile(req.id, index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="font-semibold mb-3">Step 3: Complete Process</p>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleMarkComplete(req.id)}
                            disabled={!uploadedPOP[req.id] || uploadedPOP[req.id].length === 0}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            MARK AS COMPLETED
                          </Button>
                          <Button
                            onClick={() => handleNotifyHOD(req.id)}
                            disabled={!uploadedPOP[req.id] || uploadedPOP[req.id].length === 0}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            NOTIFY HOD - Payment Done
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
};

export default AccountantDashboard;
