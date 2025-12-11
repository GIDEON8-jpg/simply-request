import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRequisitions } from '@/contexts/RequisitionsContext';
import { Download, FileText, FileDown, Plus, Eye } from 'lucide-react';
import { RequisitionSummary } from '@/components/RequisitionSummary';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { forceDownload } from '@/lib/utils';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';
import { supabase } from '@/integrations/supabase/client';

const CEODashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { requisitions, updateRequisition } = useRequisitions();
  const { user } = useAuth();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [waitReasons, setWaitReasons] = useState<Record<string, string>>({});
  const [showWaitField, setShowWaitField] = useState<Record<string, boolean>>({});
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const pendingRequisitions = requisitions.filter(r => {
    const usdAmount = r.currency === 'USD' ? r.amount : (r.usdConvertible || 0);
    return r.status === 'approved' && usdAmount > 500 && r.approvedById !== user?.id;
  });

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
      approvedBy: action !== 'reject' ? 'CEO' : undefined,
      approvedById: action !== 'reject' ? user?.id : undefined,
      approvedDate: action !== 'reject' ? new Date().toISOString() : undefined,
    };

    updateRequisition(reqId, updates);

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
            approverName: user?.fullName || 'CEO',
            approverRole: 'CEO',
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
    // Deprecated placeholder. Downloads now handled via direct links.
    toast({
      title: 'Download',
      description: `${fileName} is downloading...`,
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
    a.download = `ceo_requisitions_${new Date().toISOString().split('T')[0]}.csv`;
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
    <DashboardLayout title="Chief Executive Officer Dashboard">
      <div className="space-y-6">
        {/* Create Requisition Button */}
        <div className="flex justify-end">
          <Button 
            onClick={() => navigate('/ceo/new-requisition')} 
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create New Requisition
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Requisitions for CEO Approval (&gt; $500)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  HOD-approved requisitions requiring your approval (&gt; $500 USD)
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
                <Card key={req.id} className="border-l-4 border-l-red-500">
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
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Chosen Requisition:</p>
                        {req.chosenRequisition && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreviewDocument(req.chosenRequisition!, 'chosen-requisition.pdf')}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => forceDownload(req.chosenRequisition!, 'chosen-requisition.pdf')}
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
                  </CardContent>
        </Card>
      ))
    )}
  </CardContent>
</Card>
</div>

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

export default CEODashboard;
