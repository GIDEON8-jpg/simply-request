import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRequisitions } from '@/contexts/RequisitionsContext';
import { Download, FileText } from 'lucide-react';

const CEODashboard = () => {
  const { toast } = useToast();
  const { requisitions, updateRequisition } = useRequisitions();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [waitReasons, setWaitReasons] = useState<Record<string, string>>({});
  const [showWaitField, setShowWaitField] = useState<Record<string, boolean>>({});

  const pendingRequisitions = requisitions.filter(r => {
    const usdAmount = r.usdConvertible || r.amount;
    return r.status === 'pending' && usdAmount > 5000;
  });

  const handleAction = (reqId: string, action: 'approve' | 'reject' | 'wait') => {
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

    const updates: Partial<typeof requisitions[0]> = {
      status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'approved_wait',
      approverComments: action === 'reject' ? comments[reqId] : action === 'wait' ? waitReasons[reqId] : undefined,
      approvedBy: action !== 'reject' ? 'CEO' : undefined,
      approvedDate: action !== 'reject' ? new Date().toISOString() : undefined,
    };

    updateRequisition(reqId, updates);

    toast({
      title: action === 'approve' ? "Requisition Approved" : action === 'reject' ? "Requisition Rejected" : "Approved with Wait Status",
      description: `Requisition ${reqId} has been ${action === 'approve' ? 'approved and sent to Accountant' : action === 'reject' ? 'rejected' : 'approved but marked for wait'}.`,
    });

    setComments(prev => ({ ...prev, [reqId]: '' }));
    setWaitReasons(prev => ({ ...prev, [reqId]: '' }));
    setShowWaitField(prev => ({ ...prev, [reqId]: false }));
  };

  const handleWaitClick = (reqId: string) => {
    setShowWaitField(prev => ({ ...prev, [reqId]: !prev[reqId] }));
  };

  const handleDownloadDocument = (fileName: string) => {
    toast({
      title: "Downloading",
      description: `${fileName} is being downloaded`,
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
    <DashboardLayout title="Chief Executive Officer Dashboard">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Requisitions for Review (Above $5,000)</CardTitle>
            <p className="text-sm text-muted-foreground">
              High-value requisitions requiring CEO approval
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {pendingRequisitions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending requisitions to review</p>
            ) : (
              pendingRequisitions.map(req => (
                <Card key={req.id} className="border-l-4 border-l-red-500">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Requisition ID</p>
                        <p className="font-semibold">{req.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-semibold text-lg text-red-600">{getCurrencySymbol(req.currency)}{req.amount.toFixed(2)} ({req.currency})</p>
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
                        <p className="text-sm text-muted-foreground">Supplier</p>
                        <p className="font-medium">{req.chosenSupplier.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted By</p>
                        <p className="font-medium">{req.submittedBy}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-sm mt-1">{req.description}</p>
                    </div>

                    {/* Documents Section */}
                    {(req.documents.length > 0 || req.taxClearanceAttached) && (
                      <div className="space-y-2">
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
                              Tax Clearance: {req.taxClearanceAttached.fileName}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor={`comment-${req.id}`}>Comments (Required for rejection)</Label>
                      <Textarea
                        id={`comment-${req.id}`}
                        value={comments[req.id] || ''}
                        onChange={(e) => setComments(prev => ({ ...prev, [req.id]: e.target.value }))}
                        placeholder="Add your comments here..."
                        rows={3}
                      />
                    </div>

                    {showWaitField[req.id] && (
                      <div className="space-y-2 bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <Label htmlFor={`wait-${req.id}`}>Reason for Wait *</Label>
                        <Textarea
                          id={`wait-${req.id}`}
                          value={waitReasons[req.id] || ''}
                          onChange={(e) => setWaitReasons(prev => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="Please provide reason for approval with wait status..."
                          rows={3}
                        />
                      </div>
                    )}

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
      </div>
    </DashboardLayout>
  );
};

export default CEODashboard;
