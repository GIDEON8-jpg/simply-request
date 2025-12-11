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
import { Download, FileText, FileDown, PlusCircle, ClipboardList, Plus, Edit, Eye, BarChart3 } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import BudgetWarning from '@/components/BudgetWarning';
import { RequisitionSummary } from '@/components/RequisitionSummary';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { forceDownload } from '@/lib/utils';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';
import { supabase } from '@/integrations/supabase/client';
import { RequisitionStatus } from '@/types/requisition';
import { getStuckAt, getStuckAtBadgeClass } from '@/lib/requisition-utils';
import { logAuditEvent } from '@/lib/audit-utils';

const FinanceDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requisitions, updateRequisition, getRemainingBudget } = useRequisitions();
  const { user } = useAuth();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [waitReasons, setWaitReasons] = useState<Record<string, string>>({});
  const [showWaitField, setShowWaitField] = useState<Record<string, boolean>>({});
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RequisitionStatus | 'all'>('all');

  const pendingRequisitions = requisitions.filter(r => {
    const usdAmount = r.currency === 'USD' ? r.amount : (r.usdConvertible || 0);
    return r.status === 'approved' && usdAmount <= 100 && r.approvedById !== user?.id;
  });

  const departmentRequisitions = requisitions.filter(r => r.department === 'Finance');
  
  const remainingBudget = getRemainingBudget('Finance');

  // Status counts for ALL requisitions (for the report view)
  const allStatusCounts = {
    pending: requisitions.filter(r => r.status === 'pending').length,
    approved: requisitions.filter(r => r.status === 'approved').length,
    approved_wait: requisitions.filter(r => r.status === 'approved_wait').length,
    completed: requisitions.filter(r => r.status === 'completed').length,
    rejected: requisitions.filter(r => r.status === 'rejected').length,
  };

  // Status counts for department requisitions
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

  // Filtered requisitions based on status filter
  const filteredRequisitions = statusFilter === 'all' 
    ? requisitions 
    : requisitions.filter(r => r.status === statusFilter);

  useEffect(() => {
    if (remainingBudget <= 100) {
      toast({
        title: 'Budget Exhausted',
        description: `Finance cannot create new requisitions. Remaining: $${remainingBudget.toFixed(2)}`,
        variant: 'destructive',
      });
    }
  }, [remainingBudget, toast]);

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

    const requisition = pendingRequisitions.find(r => r.id === reqId);

    const updates: Partial<typeof requisitions[0]> = {
      status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'approved_wait',
      approverComments: action === 'reject' ? comments[reqId] : action === 'wait' ? waitReasons[reqId] : undefined,
      approvedBy: action !== 'reject' ? 'Finance Manager' : undefined,
      approvedById: action !== 'reject' ? user?.id : undefined,
      approvedDate: action !== 'reject' ? new Date().toISOString() : undefined,
    };

    updateRequisition(reqId, updates);

    // Log audit event
    await logAuditEvent({
      user_id: user?.id || '',
      user_name: user?.fullName || user?.email || 'Unknown',
      action_type: action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'on_hold',
      requisition_id: reqId,
      details: `Finance Manager ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'put on hold'} requisition "${requisition?.title}" - Amount: $${requisition?.amount}`,
    });

    // Send notification to accountant when approved
    if (action === 'approve' && requisition) {
      try {
        await supabase.functions.invoke('notify-accountant', {
          body: {
            requisitionId: reqId,
            requisitionTitle: requisition.title,
            department: requisition.department,
            amount: requisition.amount,
            currency: requisition.currency,
            approverName: user?.fullName || 'Finance Manager',
            approverRole: 'Finance Manager',
          },
        });
        console.log('Accountant notification sent successfully');
      } catch (error) {
        console.error('Failed to send accountant notification:', error);
      }
    }

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

  const handlePreviewDocument = async (fileUrl: string, fileName: string) => {
    try {
      if (fileUrl.includes('requisition-documents')) {
        setPreviewUrl(fileUrl);
      } else {
        const pathMatch = fileUrl.match(/\/storage\/v1\/object\/[^/]+\/[^/]+\/(.+)$/);
        if (pathMatch) {
          const filePath = pathMatch[1];
          const bucketName = fileUrl.includes('tax-clearances') ? 'tax-clearances' : 'requisition-documents';
          
          const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, 3600);

          if (error) throw error;
          setPreviewUrl(data.signedUrl);
        } else {
          setPreviewUrl(fileUrl);
        }
      }
      
      setPreviewFileName(fileName);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Error creating preview:', error);
      toast({
        title: 'Preview Error',
        description: 'Unable to preview document. Try downloading instead.',
        variant: 'destructive',
      });
    }
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
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="department" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            My Department
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Finance Officer Reviews
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Requisition Report
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
                    <TableHead>Stuck At</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentRequisitions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No requisitions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    departmentRequisitions.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.id.slice(0, 8)}...</TableCell>
                        <TableCell>{req.title}</TableCell>
                        <TableCell>{req.chosenSupplier.name}</TableCell>
                        <TableCell>${req.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <StatusBadge status={req.status} />
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              getStuckAt(req) === 'Completed' ? 'bg-green-100 text-green-800 border-green-300' :
                              getStuckAt(req) === 'Rejected' ? 'bg-red-100 text-red-800 border-red-300' :
                              getStuckAt(req) === 'On Hold' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                              'bg-yellow-100 text-yellow-800 border-yellow-300'
                            }
                          >
                            {getStuckAt(req)}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(req.submittedDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {req.status === 'rejected' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate('/finance/new-requisition', { state: { editRequisition: req } })}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit & Resubmit
                            </Button>
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
                    {/* Requisition Type Badge */}
                    <div className="mb-2">
                      <Badge 
                        variant={req.type === 'deviation' ? 'destructive' : 'default'}
                        className={req.type === 'deviation' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'}
                      >
                        {req.type === 'deviation' ? 'DEVIATION' : 'STANDARD'}
                      </Badge>
                    </div>

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
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Chosen Requisition:</p>
                        {req.chosenRequisition && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => forceDownload(req.chosenRequisition!, 'chosen-requisition.pdf')}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Download Chosen Requisition
                          </Button>
                        )}
                      </div>

                      {req.attachments && req.attachments.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Supporting Documents:</p>
                          <div className="flex flex-wrap gap-2">
                            {req.attachments.map((att) => (
                              <div key={att.id} className="flex gap-1">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handlePreviewDocument(att.fileUrl, att.fileName)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Preview
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => forceDownload(att.fileUrl, att.fileName)}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  {att.fileName}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {req.taxClearanceAttached && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Tax Clearance:</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => forceDownload(req.taxClearanceAttached!.filePath, req.taxClearanceAttached!.fileName)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Tax Clearance: {req.taxClearanceAttached.fileName}
                          </Button>
                        </div>
                      )}
                    </div>

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
                        {showWaitField[req.id] ? 'Submit Wait' : 'On Hold'}
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

        {/* Requisition Report Tab */}
        <TabsContent value="report" className="space-y-6">
          {/* Clickable Status Summary Cards */}
          <Card>
            <CardHeader>
              <CardTitle>All Requisitions Summary</CardTitle>
              <p className="text-sm text-muted-foreground">Click on a status to filter requisitions</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`text-center p-4 rounded-lg border-2 transition-all hover:bg-muted ${statusFilter === 'all' ? 'border-primary bg-primary/10' : 'border-transparent'}`}
                >
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold">{requisitions.length}</p>
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`text-center p-4 rounded-lg border-2 transition-all hover:bg-muted ${statusFilter === 'pending' ? 'border-yellow-500 bg-yellow-500/10' : 'border-transparent'}`}
                >
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{allStatusCounts.pending}</p>
                </button>
                <button
                  onClick={() => setStatusFilter('approved')}
                  className={`text-center p-4 rounded-lg border-2 transition-all hover:bg-muted ${statusFilter === 'approved' ? 'border-blue-500 bg-blue-500/10' : 'border-transparent'}`}
                >
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-3xl font-bold text-blue-600">{allStatusCounts.approved}</p>
                </button>
                <button
                  onClick={() => setStatusFilter('approved_wait')}
                  className={`text-center p-4 rounded-lg border-2 transition-all hover:bg-muted ${statusFilter === 'approved_wait' ? 'border-orange-500 bg-orange-500/10' : 'border-transparent'}`}
                >
                  <p className="text-sm text-muted-foreground">On Hold</p>
                  <p className="text-3xl font-bold text-orange-600">{allStatusCounts.approved_wait}</p>
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`text-center p-4 rounded-lg border-2 transition-all hover:bg-muted ${statusFilter === 'completed' ? 'border-green-500 bg-green-500/10' : 'border-transparent'}`}
                >
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{allStatusCounts.completed}</p>
                </button>
                <button
                  onClick={() => setStatusFilter('rejected')}
                  className={`text-center p-4 rounded-lg border-2 transition-all hover:bg-muted ${statusFilter === 'rejected' ? 'border-red-500 bg-red-500/10' : 'border-transparent'}`}
                >
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-3xl font-bold text-red-600">{allStatusCounts.rejected}</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Requisitions Table with Stuck At column */}
          <Card>
            <CardHeader>
              <CardTitle>
                {statusFilter === 'all' ? 'All Requisitions' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace('_', ' ')} Requisitions`}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {filteredRequisitions.length} requisition{filteredRequisitions.length !== 1 ? 's' : ''}
                {statusFilter !== 'all' && (
                  <Button variant="link" size="sm" onClick={() => setStatusFilter('all')} className="ml-2 h-auto p-0">
                    Clear filter
                  </Button>
                )}
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stuck At</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequisitions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No requisitions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequisitions.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.id.slice(0, 8)}...</TableCell>
                        <TableCell>{req.title}</TableCell>
                        <TableCell>{req.submittedBy}</TableCell>
                        <TableCell>{req.department}</TableCell>
                        <TableCell>${(req.amount || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <StatusBadge status={req.status} />
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              getStuckAt(req) === 'Completed' ? 'bg-green-100 text-green-800 border-green-300' :
                              getStuckAt(req) === 'Rejected' ? 'bg-red-100 text-red-800 border-red-300' :
                              getStuckAt(req) === 'On Hold' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                              'bg-yellow-100 text-yellow-800 border-yellow-300'
                            }
                          >
                            {getStuckAt(req)}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(req.submittedDate).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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

      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileUrl={previewUrl}
        fileName={previewFileName}
        onDownload={() => forceDownload(previewUrl, previewFileName)}
      />
    </DashboardLayout>
  );
};

export default FinanceDashboard;
