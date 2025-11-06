import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import BudgetWarning from '@/components/BudgetWarning';
import { useRequisitions } from '@/contexts/RequisitionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Department, Requisition } from '@/types/requisition';
import { useToast } from '@/hooks/use-toast';

const HODDashboard = () => {
  const navigate = useNavigate();
  const { requisitions, getRemainingBudget } = useRequisitions();
  const { user } = useAuth();
  const { toast } = useToast();
  const previousRequisitionsRef = useRef<Requisition[]>([]);
  
  const userDepartment: Department = (user?.department as Department) || 'IT';

  const statusCounts = {
    pending: requisitions.filter(r => r.status === 'pending').length,
    approved: requisitions.filter(r => r.status === 'approved').length,
    approved_wait: requisitions.filter(r => r.status === 'approved_wait').length,
    completed: requisitions.filter(r => r.status === 'completed').length,
    rejected: requisitions.filter(r => r.status === 'rejected').length,
  };

  const totalAmount = requisitions
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

  return (
    <DashboardLayout title="Head of Department Dashboard">
      <div className="space-y-6">
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
                <p className="text-2xl font-bold">{requisitions.length}</p>
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
            <CardTitle>My Requisitions</CardTitle>
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
                {requisitions.map((req) => (
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
                          onClick={() => navigate('/hod/new-requisition', { state: { editRequisition: req } })}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit & Resubmit
                        </Button>
                      ) : req.status === 'completed' ? (
                        <span className="text-sm text-muted-foreground">Done</span>
                      ) : (
                        <Button variant="ghost" size="sm">View</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default HODDashboard;
