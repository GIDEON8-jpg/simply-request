import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/StatusBadge';
import { mockRequisitions } from '@/data/mockData';
import { Check, X, Clock, FileText, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const FinanceDashboard = () => {
  const { toast } = useToast();
  const [requisitions, setRequisitions] = useState(mockRequisitions);
  const [comments, setComments] = useState<{ [key: string]: string }>({});

  const pendingRequisitions = requisitions.filter(r => r.status === 'pending');

  const handleAction = (reqId: string, action: 'approve' | 'reject' | 'wait') => {
    const comment = comments[reqId];
    
    if (action === 'reject' && !comment) {
      toast({
        title: "Comment Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    const actionText = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Approved but Wait';
    toast({
      title: `Requisition ${actionText}`,
      description: `Email notification sent to HOD`,
    });

    setRequisitions(prev => prev.map(req => 
      req.id === reqId 
        ? { ...req, status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'approved_wait' as any, approverComments: comment }
        : req
    ));
  };

  return (
    <DashboardLayout title="Finance/CEO Dashboard">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Requisitions for Review</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequisitions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending requisitions</p>
            ) : (
              <div className="space-y-6">
                {pendingRequisitions.map((req) => (
                  <Card key={req.id} className={`border-2 ${req.type === 'deviation' ? 'border-red-300 bg-red-50/50' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{req.id} - {req.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{req.department}</Badge>
                            <Badge variant="outline">${req.amount.toFixed(2)}</Badge>
                            {req.type === 'deviation' && (
                              <Badge className="bg-red-600 text-white">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                DEVIATION
                              </Badge>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={req.status} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Submitted by</p>
                          <p className="font-medium">{req.submittedBy}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date</p>
                          <p className="font-medium">{new Date(req.submittedDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Supplier</p>
                          <p className="font-medium">{req.chosenSupplier.name} ({req.chosenSupplier.icazNumber})</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Budget Code</p>
                          <p className="font-medium">{req.budgetCode}</p>
                        </div>
                      </div>

                      {req.type === 'deviation' && req.deviationReason && (
                        <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                          <p className="font-semibold text-red-900 mb-1">Deviation Reason:</p>
                          <p className="text-red-800">{req.deviationReason}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-muted-foreground mb-1">Description</p>
                        <p>{req.description}</p>
                      </div>

                      {req.taxClearanceAttached && (
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded">
                          <FileText className="h-4 w-4" />
                          <span>✓ Tax Clearance: {req.taxClearanceAttached.fileName} (Auto-attached)</span>
                        </div>
                      )}

                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Documents: {req.documents.length} file(s) attached</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`comment-${req.id}`}>Comments {req.status === 'pending' && '(Required for rejection)'}</Label>
                        <Textarea
                          id={`comment-${req.id}`}
                          value={comments[req.id] || ''}
                          onChange={(e) => setComments({ ...comments, [req.id]: e.target.value })}
                          placeholder="Enter your comments..."
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={() => handleAction(req.id, 'approve')}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          APPROVE
                        </Button>
                        <Button
                          onClick={() => handleAction(req.id, 'wait')}
                          className="flex-1 bg-orange-600 hover:bg-orange-700"
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          APPROVE BUT WAIT
                        </Button>
                        <Button
                          onClick={() => handleAction(req.id, 'reject')}
                          className="flex-1"
                          variant="destructive"
                        >
                          <X className="mr-2 h-4 w-4" />
                          REJECT
                        </Button>
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

export default FinanceDashboard;
