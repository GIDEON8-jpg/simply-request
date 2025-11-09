import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useRequisitions } from '@/contexts/RequisitionsContext';
import { Download, FileText, FileDown, PlusCircle, ClipboardList, Plus, Edit } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import BudgetWarning from '@/components/BudgetWarning';
import { RequisitionSummary } from '@/components/RequisitionSummary';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const FinanceDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requisitions, updateRequisition, getRemainingBudget } = useRequisitions();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [waitReasons, setWaitReasons] = useState<Record<string, string>>({});
  const [showWaitField, setShowWaitField] = useState<Record<string, boolean>>({});
  const [selectedReq, setSelectedReq] = useState<any>(null);

  const pendingRequisitions = requisitions.filter(r => {
    const usdAmount = r.currency === 'USD' ? r.amount : (r.usdConvertible || 0);
    return r.status === 'approved' && usdAmount <= 100 && r.approvedBy !== 'Finance Manager';
  });

  const departmentRequisitions = requisitions.filter(r => r.department === 'Finance');
  
  const remainingBudget = getRemainingBudget('Finance');

  const statusCounts = {
    pending: departmentRequisitions.filter(r => r.status === 'pending').length,
    approved: departmentRequisitions.filter(r => r.status === 'approved').length,
    approved_wait: departmentRequisitions.filter(r => r.status === 'approved_wait').length,
    completed: departmentRequisitions.filter(r => r.status === 'completed').length,
    rejected: departmentRequisitions.filter(r => r.status === 'rejected').length,
  };

  const totalAmount = departmentRequisitions
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);

  useEffect(() => {
    if (remainingBudget <= 100) {
      toast({
        title: 'Budget Exhausted',
        description: `Finance cannot create new requisitions. Remaining: $${remainingBudget.toFixed(2)}`,
        variant: 'destructive',
      });
    }
  }, [remainingBudget, toast]);

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
      approvedBy: action !== 'reject' ? 'Finance Manager' : undefined,
      approvedDate: action !== 'reject' ? new Date().toISOString() : undefined,
    };

    updateRequisition(reqId, updates);

    toast({
      title: action === 'approve' ? "Requisition Approved" : action === 'reject' ? "Requisition Rejected" : "Approved with Wait Status",
      description: `Requisition ${reqId} has been ${action === 'approve' ? 'approved and sent to Admin' : action === 'reject' ? 'rejected' : 'approved but marked for wait'}.`,
    });

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

    const headers = ['ID', 'Title', 'Department', 'Amount', 'Currency', 'USD Equivalent', 'Status', 'Submitted By', 'Submitted Date', 'Supplier', 'Budget Code'];
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
        `"${req.chosenSupplier.name}"`,
        req.budgetCode
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_requisitions_${new Date().toISOString().split('T')[0]}.csv`;
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
    <DashboardLayout title="Finance Dashboard">
      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="department" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            My Department
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Finance Officer Reviews
          </TabsTrigger>
        </TabsList>

        {/* Department Tab */}
        <TabsContent value="department" className="space-y-6">
          {/* Budget Warning */}
          <BudgetWarning department="Finance" />

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-[hsl(var(--status-pending))]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statusCounts.pending}</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[hsl(var(--status-approved))]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statusCounts.approved}</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[hsl(var(--status-approved-wait))]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Approved but Wait</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statusCounts.approved_wait}</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[hsl(var(--status-completed))]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statusCounts.completed}</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[hsl(var(--status-rejected))]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statusCounts.rejected}</div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Report */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Report Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Requisitions</p>
                  <p className="text-2xl font-bold">{departmentRequisitions.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount Spent</p>
                  <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end">
            <Button 
              onClick={() => navigate('/finance/new-requisition')} 
              size="lg"
              disabled={remainingBudget <= 100}
            >
              <Plus className="mr-2 h-5 w-5" />
              {remainingBudget <= 100 ? 'Budget Exhausted' : 'Create New Requisition'}
            </Button>
          </div>

          {/* Requisitions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Finance Department Requisitions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentRequisitions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No requisitions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    departmentRequisitions.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.id}</TableCell>
                        <TableCell>{req.title}</TableCell>
                        <TableCell>{req.chosenSupplier.name}</TableCell>
                        <TableCell>${req.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <StatusBadge status={req.status} />
                        </TableCell>
                        <TableCell>{new Date(req.submittedDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {req.status === 'rejected' ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate('/finance/new-requisition', { state: { editRequisition: req } })}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit & Resubmit
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm">View</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finance Officer Approvals Tab */}
        <TabsContent value="approvals" className="space-y-6">
          <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Requisitions for Review (&lt; $100)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  HOD-approved requisitions requiring your approval (Amount &lt; $100 USD)
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

                    <Button
                      onClick={() => setSelectedReq(req)}
                      variant="outline"
                      className="w-full mt-3"
                    >
                      View Details & Generate AI Summary
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for Requisition Details with AI Summary */}
      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedReq && (
            <>
              <DialogHeader>
                <DialogTitle>Requisition Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedReq.title}</h3>
                  <p className="text-sm text-muted-foreground">ID: {selectedReq.id}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Department</p>
                    <p className="text-sm text-muted-foreground">{selectedReq.department}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Amount</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedReq.currency} {selectedReq.amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">USD Equivalent</p>
                    <p className="text-sm text-muted-foreground">
                      ${selectedReq.usdConvertible?.toLocaleString() || selectedReq.amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <StatusBadge status={selectedReq.status} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Submitted By</p>
                    <p className="text-sm text-muted-foreground">{selectedReq.submittedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Submitted Date</p>
                    <p className="text-sm text-muted-foreground">{selectedReq.submittedDate}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Budget Code</p>
                    <p className="text-sm text-muted-foreground">{selectedReq.budgetCode}</p>
                  </div>
                  {selectedReq.chosenSupplier && (
                    <div>
                      <p className="text-sm font-medium">Supplier</p>
                      <p className="text-sm text-muted-foreground">{selectedReq.chosenSupplier.name}</p>
                    </div>
                  )}
                </div>
                <RequisitionSummary requisition={selectedReq} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default FinanceDashboard;
