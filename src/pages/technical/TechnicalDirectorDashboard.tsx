import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRequisitions } from '@/contexts/RequisitionsContext';
import { Download, FileText, FileDown } from 'lucide-react';
import { RequisitionSummary } from '@/components/RequisitionSummary';
import { useAuth } from '@/contexts/AuthContext';

const TechnicalDirectorDashboard = () => {
  const { toast } = useToast();
  const { requisitions, updateRequisition } = useRequisitions();
  const { user } = useAuth();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [waitReasons, setWaitReasons] = useState<Record<string, string>>({});
  const [showWaitField, setShowWaitField] = useState<Record<string, boolean>>({});
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());

  const pendingRequisitions = requisitions.filter(r => {
    const usdAmount = r.currency === 'USD' ? r.amount : (r.usdConvertible || 0);
    return r.status === 'approved' && usdAmount >= 100 && usdAmount <= 500 && r.approvedById !== user?.id;
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
      approvedBy: action !== 'reject' ? 'Technical Director' : undefined,
      approvedById: action !== 'reject' ? user?.id : undefined,
      approvedDate: action !== 'reject' ? new Date().toISOString() : undefined,
    };

    updateRequisition(reqId, updates);

    toast({
      title: action === 'approve' ? "Requisition Approved" : action === 'reject' ? "Requisition Rejected" : "Approved with Wait Status",
      description: `Requisition ${reqId} has been ${action === 'approve' ? 'approved and sent to Accountant' : action === 'reject' ? 'rejected' : 'approved but marked for wait'}.`,
    });

    setActionedIds(prev => new Set(prev).add(reqId));
    setComments(prev => ({ ...prev, [reqId]: '' }));
    setWaitReasons(prev => ({ ...prev, [reqId]: '' }));
    setShowWaitField(prev => ({ ...prev, [reqId]: false }));
  };

  const handleWaitClick = (reqId: string) => {
    setShowWaitField(prev => ({ ...prev, [reqId]: !prev[reqId] }));
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

  const handleExportCSV = () => {
    if (pendingRequisitions.length === 0) {
      toast({
        title: "No Data",
        description: "No requisitions to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['ID', 'Title', 'Department', 'Amount', 'Currency', 'USD Equivalent', 'Status', 'Submitted By', 'Submitted Date', 'Supplier'];
    const csvRows = [headers.join(',')];

    pendingRequisitions.forEach(req => {
      const row = [
        req.id,
        `"${req.title}"`,
        req.department,
        req.amount,
        req.currency,
        req.usdConvertible || req.amount,
        req.status,
        `"${req.submittedBy}"`,
        req.submittedDate,
        `"${req.chosenSupplier.name}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `technical_requisitions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Exported",
      description: `${pendingRequisitions.length} requisitions exported to CSV`,
    });
  };

  return (
    <DashboardLayout title="Technical Director Dashboard">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Requisitions for Technical Director Approval ($100 - $500)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  HOD-approved requisitions requiring your approval ($100 - $500 USD)
                </p>
              </div>
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <FileDown className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {pendingRequisitions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending requisitions to review</p>
            ) : (
              pendingRequisitions.map(req => (
                <Card key={req.id} className="border-l-4 border-l-orange-500">
                  <CardContent className="pt-6 space-y-4">
                    {/* Created By Header */}
                    <div className="bg-primary/10 p-3 rounded-lg border border-primary/20 mb-4">
                      <p className="text-sm font-semibold text-primary">
                        Created By: <span className="font-bold">{req.submittedBy}</span>
                      </p>
                    </div>

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
                        disabled={actionedIds.has(req.id)}
                      >
                        {actionedIds.has(req.id) ? 'Action Taken' : 'Approve'}
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
                        disabled={actionedIds.has(req.id)}
                      >
                        {showWaitField[req.id] ? 'Submit Wait' : 'Approve but Wait'}
                      </Button>
                      <Button
                        onClick={() => handleAction(req.id, 'reject')}
                        variant="destructive"
                        className="flex-1"
                        disabled={actionedIds.has(req.id)}
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

export default TechnicalDirectorDashboard;
