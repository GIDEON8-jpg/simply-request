import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/StatusBadge';
import BudgetWarning from '@/components/BudgetWarning';
import { useRequisitions } from '@/contexts/RequisitionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, ClipboardList, FileText, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Department, Requisition } from '@/types/requisition';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { forceDownload } from '@/lib/utils';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';
import { supabase } from '@/integrations/supabase/client';
import { getStuckAt, getStuckAtBadgeClass } from '@/lib/requisition-utils';
import { logAuditEvent } from '@/lib/audit-utils';

const HODDashboard = () => {
  const navigate = useNavigate();
  const { requisitions, updateRequisition, getRemainingBudget } = useRequisitions();
  const { user } = useAuth();
  const { toast } = useToast();
  const previousRequisitionsRef = useRef<Requisition[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const userDepartment: Department = (user?.department as Department) || 'IT';
  
  // Filter requisitions to only show those from HOD's department
  const departmentRequisitions = requisitions.filter(r => r.department === userDepartment);
  
  // Pending requisitions from department that need HOD approval
  const pendingRequisitions = departmentRequisitions.filter(r => r.status === 'pending');

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

  const remainingBudget = getRemainingBudget(userDepartment);

  useEffect(() => {
    if (remainingBudget <= 100) {
      toast({
        title: 'Budget Exhausted',
        description: `${userDepartment} cannot create new requisitions. Remaining: $${remainingBudget.toFixed(2)}`,
        variant: 'destructive',
      });
    }
  }, [remainingBudget, userDepartment, toast]);

  const handleAction = async (reqId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !comments[reqId]?.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide a comment for rejection",
        variant: "destructive",
      });
      return;
    }

    setActionedIds(prev => new Set(prev).add(reqId));

    const requisition = requisitions.find(r => r.id === reqId);
    const updates: Partial<Requisition> = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approverComments: action === 'reject' ? comments[reqId] : undefined,
      approvedBy: action === 'approve' ? `${user?.firstName || user?.fullName} (HOD)` : undefined,
      approvedById: action === 'approve' ? user?.id : undefined,
      approvedDate: action === 'approve' ? new Date().toISOString() : undefined,
    };

    try {
      await updateRequisition(reqId, updates);
      
      // Log audit event
      await logAuditEvent({
        user_id: user?.id || '',
        user_name: user?.fullName || user?.email || 'Unknown',
        action_type: action === 'approve' ? 'approve' : 'reject',
        requisition_id: reqId,
        details: `HOD ${action === 'approve' ? 'approved' : 'rejected'} requisition "${requisition?.title}" - Amount: $${requisition?.amount}`,
      });
      
      // If approved, send notification to next approver
      if (action === 'approve') {
        if (requisition) {
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            await supabase.functions.invoke('notify-hod-approval', {
              body: {
                requisitionId: reqId,
                requisitionTitle: requisition.title,
                department: requisition.department,
                amount: requisition.amount,
                currency: requisition.currency,
                hodName: user?.fullName || 'HOD',
              }
            });
            console.log('Notification sent to next approver');
          } catch (notifError) {
            console.error('Failed to send notification:', notifError);
          }
        }
      }
      
      toast({
        title: action === 'approve' ? "Requisition Approved" : "Requisition Rejected",
        description: `Requisition ${reqId} has been ${action === 'approve' ? 'approved and sent to next approver' : 'rejected'}.`,
      });
    } catch (e) {
      // Re-enable on failure
      setActionedIds(prev => {
        const next = new Set(prev);
        next.delete(reqId);
        return next;
      });
    } finally {
      setComments(prev => ({ ...prev, [reqId]: '' }));
    }
  };

  // Monitor for rejected requisitions and show notifications
  useEffect(() => {
    if (previousRequisitionsRef.current.length === 0) {
      // First load - just store the current state
      previousRequisitionsRef.current = requisitions;
      return;
    }

    // Check for newly rejected requisitions
    requisitions.forEach(currentReq => {
      const previousReq = previousRequisitionsRef.current.find(r => r.id === currentReq.id);
      
      // If requisition changed to rejected status
      if (previousReq && previousReq.status !== 'rejected' && currentReq.status === 'rejected') {
        toast({
          title: '❌ Requisition Rejected',
          description: currentReq.approverComments 
            ? `Requisition ${currentReq.id} was rejected. Reason: ${currentReq.approverComments}`
            : `Requisition ${currentReq.id} was rejected by ${currentReq.approvedBy || 'approver'}.`,
          variant: 'destructive',
          duration: 8000,
        });
      }
    });

    // Update the ref with current requisitions
    previousRequisitionsRef.current = requisitions;
  }, [requisitions, toast]);

  const handlePreviewDocument = async (fileUrl: string, fileName: string) => {
    try {
      // Check if it's a public URL or needs signed URL
      if (fileUrl.includes('requisition-documents')) {
        // Public bucket - use directly
        setPreviewUrl(fileUrl);
      } else {
        // Private bucket or other - create signed URL
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

  return (
    <DashboardLayout title="Head of Department Dashboard">
      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="department" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            My Requisitions
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            HOD Reviews
          </TabsTrigger>
        </TabsList>

        {/* My Department Tab */}
        <TabsContent value="department" className="space-y-6">
          {/* Budget Warning */}
          <BudgetWarning department={userDepartment} />

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
              onClick={() => navigate('/hod/new-requisition')} 
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
              <CardTitle>{userDepartment} Department - My Requisitions</CardTitle>
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
                            onClick={() => navigate('/hod/new-requisition', { state: { editRequisition: req } })}
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

        {/* HOD Reviews Tab */}
        <TabsContent value="approvals" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Pending Requisitions for HOD Approval</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Requisitions from {userDepartment} department requiring your approval
                  </p>
                </div>
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

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Requisition ID</p>
                          <p className="font-semibold">REQ_{req.requisitionNumber || req.id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Amount</p>
                          <p className="font-semibold text-lg">${req.amount.toFixed(2)} ({req.currency})</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Title</p>
                          <p className="font-medium">{req.title}</p>
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

                      {req.type === 'deviation' && req.deviationReason && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Deviation Request</p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">{req.deviationReason}</p>
                        </div>
                      )}

                      {/* Documents Section */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Chosen Requisition:</p>
                          {req.chosenRequisition && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreviewDocument(req.chosenRequisition, 'chosen-requisition.pdf')}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => forceDownload(req.chosenRequisition, 'chosen-requisition.pdf')}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Download
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
                                    <FileText className="mr-2 h-4 w-4" />
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
                              onClick={() => req.taxClearanceAttached && forceDownload(req.taxClearanceAttached.filePath, req.taxClearanceAttached.fileName)}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Tax Clearance: {req.taxClearanceAttached.fileName}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`comment-${req.id}`}>Comments (required for rejection)</Label>
                        <Textarea
                          id={`comment-${req.id}`}
                          placeholder="Enter your comments here..."
                          value={comments[req.id] || ''}
                          onChange={(e) => setComments(prev => ({ ...prev, [req.id]: e.target.value }))}
                        />
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="destructive"
                          onClick={() => handleAction(req.id, 'reject')}
                          disabled={req.approvedById === user?.id || actionedIds.has(req.id)}
                          className={actionedIds.has(req.id) ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => handleAction(req.id, 'approve')}
                          disabled={req.approvedById === user?.id || actionedIds.has(req.id)}
                          className={actionedIds.has(req.id) ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          {req.approvedById === user?.id ? 'Already Approved' : actionedIds.has(req.id) ? 'Processing...' : 'Approve'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

export default HODDashboard;
