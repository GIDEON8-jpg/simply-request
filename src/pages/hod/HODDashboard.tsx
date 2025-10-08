import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import BudgetWarning from '@/components/BudgetWarning';
import { mockRequisitions } from '@/data/mockData';
import { Plus, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HODDashboard = () => {
  const navigate = useNavigate();
  const [requisitions] = useState(mockRequisitions);
  
  // Budget tracking (frontend mock - will sync with backend)
  const monthlyBudget = 10000; // Mock budget
  const budgetUsed = requisitions
    .filter(r => r.status === 'approved' || r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);

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

  return (
    <DashboardLayout title="Head of Department Dashboard">
      <div className="space-y-6">
        {/* Budget Warning */}
        <BudgetWarning budgetUsed={budgetUsed} budgetTotal={monthlyBudget} />

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
          <Button onClick={() => navigate('/hod/new-requisition')} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create New Requisition
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
                        <Button variant="outline" size="sm">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit & Resubmit
                        </Button>
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
