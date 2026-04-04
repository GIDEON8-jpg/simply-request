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
import { Download, FileText, FileDown, Eye, ClipboardList, BarChart3, PlusCircle } from 'lucide-react';
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

const DeputyFinanceDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requisitions, updateRequisition } = useRequisitions();
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

  // Deputy FM sees HOD-approved requisitions that haven't been acted on by them yet
  // These are requisitions with status 'approved' where approvedBy contains HOD info
  const pendingRequisitions = requisitions.filter(r => {
    return r.status === 'approved' && r.approvedById !== user?.id && 
      // Show only those that were approved by HOD (not by deputy FM or FM)
      getStuckAt(r) === 'Awaiting Deputy Finance Manager';
  });

  const departmentRequisitions = requisitions.filter(r => r.department === 'Finance');

  // Status counts for ALL requisitions
  const allStatusCounts = {
    pending: requisitions.filter(r => r.status === 'pending').length,
    approved: requisitions.filter(r => r.status === 'approved').length,
    approved_wait: requisitions.filter(r => r.status === 'approved_wait').length,
    completed: requisitions.filter(r => r.status === 'completed').length,
    rejected: requisitions.filter(r => r.status === 'rejected').length,
  };

  const filteredRequisitions = statusFilter === 'all' 
    ? requisitions 
    : requisitions.filter(r => r.status === statusFilter);

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
        description: "Please provide a reason for hold status",
        variant: "destructive",
      });
      return;
    }

    const requisition = pendingRequisitions.find(r => r.id === reqId);

    const updates: Partial<typeof requisitions[0]> = {
      status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'approved_wait',
      approverComments: action === 'reject' ? comments[reqId] : action === 'wait' ? waitReasons[reqId] : undefined,
      approvedBy: 'Deputy Finance Manager',
      approvedByRole: 'deputy_finance_manager',
      approvedDate: new Date().toISOString(),
    };

    updateRequisition(reqId, updates);

    // Log audit event
    await logAuditEvent({
      user_id: user?.id || '',
      user_name: user?.fullName || user?.email || 'Unknown',
      action_type: action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'on_hold',
      requisition_id: reqId,
      details: `Deputy Finance Manager ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'put on hold'} requisition "${requisition?.title}" - Amount: $${requisition?.amount}`,
    });

    toast({
      title: action === 'approve' ? "Requisition Approved" : action === 'reject' ? "Requisition Rejected" : "Put On Hold",
      description: `Requisition has been ${action === 'approve' ? 'approved and sent to Finance Manager' : action === 'reject' ? 'rejected' : 'put on hold'}.`,
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
          const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 3600);
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
      toast({ title: 'Preview Error', description: 'Unable to preview document.', variant: 'destructive' });
    }
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
      toast({ title: "No Data", description: "No requisitions to export", variant: "destructive" });
      return;
    }
    const headers = ['ID', 'Title', 'Department', 'Amount', 'Currency', 'USD Equivalent', 'Status', 'Submitted By', 'Date', 'Supplier', 'Budget Code'];
    const csvRows = [headers.join(',')];
    pendingRequisitions.forEach(req => {
      csvRows.push([req.id, `"${req.title}"`, req.department, req.amount, req.currency, req.usdConvertible || req.amount, req.status, `"${req.submittedBy}"`, req.submittedDate, `"${req.chosenSupplier.name}"`, req.budgetCode].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deputy_finance_requisitions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast({ title: "Exported", description: `${pendingRequisitions.length} requisitions exported` });
  };

  return (
    <DashboardLayout title="Deputy Finance Manager Dashboard">
      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="report" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Requisition Report
          </TabsTrigger>
        </TabsList>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Requisitions for Review</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    HOD-approved requisitions requiring your review before Finance Manager
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
                      <div className="mb-2">
                        <Badge 
                          variant={req.type === 'deviation' ? 'destructive' : 'default'}
                          className={req.type === 'deviation' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'}
                        >
                          {req.type === 'deviation' ? 'DEVIATION' : 'STANDARD'}
                        </Badge>
                      </div>

                      <div className="bg-primary/10 p-3 rounded-lg border border-primary/20 mb-4">
                        <p className="text-sm font-semibold text-primary">
                          Created By: <span className="font-bold">{req.submittedBy}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Requisition ID</p>
                          <p className="font-semibold">REQ_{req.requisitionNumber || req.id}</p>
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
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handlePreviewDocument(req.chosenRequisition!, 'chosen-requisition.pdf')}>
                                <Eye className="mr-2 h-4 w-4" />Preview
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => forceDownload(req.chosenRequisition!, 'chosen-requisition.pdf')}>
                                <FileText className="mr-2 h-4 w-4" />Download
                              </Button>
                            </div>
                          )}
                        </div>
                        {req.attachments && req.attachments.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Supporting Documents:</p>
                            <div className="flex flex-wrap gap-2">
                              {req.attachments.map((att) => (
                                <div key={att.id} className="flex gap-1">
                                  <Button variant="outline" size="sm" onClick={() => handlePreviewDocument(att.fileUrl, att.fileName)}>
                                    <Eye className="mr-2 h-4 w-4" />Preview
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => forceDownload(att.fileUrl, att.fileName)}>
                                    <Download className="mr-2 h-4 w-4" />{att.fileName}
                                  </Button>
                                </div>
                              ))}
                            </div>
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
                          <Label htmlFor={`wait-${req.id}`}>Reason for Hold *</Label>
                          <Textarea
                            id={`wait-${req.id}`}
                            value={waitReasons[req.id] || ''}
                            onChange={(e) => setWaitReasons(prev => ({ ...prev, [req.id]: e.target.value }))}
                            placeholder="Please provide reason..."
                            rows={3}
                          />
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button onClick={() => handleAction(req.id, 'approve')} className="flex-1 bg-green-600 hover:bg-green-700" disabled={actionedIds.has(req.id)}>
                          {actionedIds.has(req.id) ? 'Action Taken' : 'Approve'}
                        </Button>
                        <Button onClick={() => showWaitField[req.id] ? handleAction(req.id, 'wait') : handleWaitClick(req.id)} className="flex-1 bg-orange-600 hover:bg-orange-700" disabled={actionedIds.has(req.id)}>
                          {showWaitField[req.id] ? 'Submit Hold' : 'On Hold'}
                        </Button>
                        <Button onClick={() => handleAction(req.id, 'reject')} variant="destructive" className="flex-1" disabled={actionedIds.has(req.id)}>
                          Reject
                        </Button>
                      </div>

                      <Button onClick={() => setSelectedReq(req)} variant="outline" className="w-full mt-3">
                        View Details & Generate AI Summary
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Requisitions Summary</CardTitle>
              <p className="text-sm text-muted-foreground">Click on a status to filter</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {([['all', 'Total', requisitions.length, 'primary'], ['pending', 'Pending', allStatusCounts.pending, 'yellow'], ['approved', 'Approved', allStatusCounts.approved, 'blue'], ['approved_wait', 'On Hold', allStatusCounts.approved_wait, 'orange'], ['completed', 'Completed', allStatusCounts.completed, 'green'], ['rejected', 'Rejected', allStatusCounts.rejected, 'red']] as const).map(([key, label, count, color]) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key as any)}
                    className={`text-center p-4 rounded-lg border-2 transition-all hover:bg-muted ${statusFilter === key ? `border-${color}-500 bg-${color}-500/10` : 'border-transparent'}`}
                  >
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className={`text-3xl font-bold ${key !== 'all' ? `text-${color}-600` : ''}`}>{count}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {statusFilter === 'all' ? 'All Requisitions' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace('_', ' ')} Requisitions`}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {filteredRequisitions.length} requisition{filteredRequisitions.length !== 1 ? 's' : ''}
                {statusFilter !== 'all' && (
                  <Button variant="link" size="sm" onClick={() => setStatusFilter('all')} className="ml-2 h-auto p-0">Clear filter</Button>
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
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No requisitions found</TableCell>
                    </TableRow>
                  ) : (
                    filteredRequisitions.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.id.slice(0, 8)}...</TableCell>
                        <TableCell>{req.title}</TableCell>
                        <TableCell>{req.submittedBy}</TableCell>
                        <TableCell>{req.department}</TableCell>
                        <TableCell>${(req.amount || 0).toFixed(2)}</TableCell>
                        <TableCell><StatusBadge status={req.status} /></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStuckAtBadgeClass(getStuckAt(req))}>
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

      {/* AI Summary Dialog */}
      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedReq && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedReq.title}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div><p className="text-sm text-muted-foreground">Amount</p><p className="font-semibold">{getCurrencySymbol(selectedReq.currency)}{selectedReq.amount.toFixed(2)}</p></div>
                <div><p className="text-sm text-muted-foreground">Department</p><p className="font-semibold">{selectedReq.department}</p></div>
                <div><p className="text-sm text-muted-foreground">Supplier</p><p className="font-semibold">{selectedReq.chosenSupplier.name}</p></div>
                <div><p className="text-sm text-muted-foreground">Status</p><StatusBadge status={selectedReq.status} /></div>
              </div>
              <div className="mt-4"><p className="text-sm text-muted-foreground">Description</p><p className="text-sm mt-1">{selectedReq.description}</p></div>
              <RequisitionSummary requisition={selectedReq} />
            </>
          )}
        </DialogContent>
      </Dialog>

      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        fileUrl={previewUrl}
        fileName={previewFileName}
      />
    </DashboardLayout>
  );
};

export default DeputyFinanceDashboard;
