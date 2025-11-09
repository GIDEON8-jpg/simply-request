import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRequisitions } from '@/contexts/RequisitionsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { format } from 'date-fns';

const PreparerDashboard = () => {
  const navigate = useNavigate();
  const { requisitions } = useRequisitions();
  const { user } = useAuth();

  const myRequisitions = requisitions.filter(
    r => r.submittedById === user?.id
  );

  const pendingCount = myRequisitions.filter(r => r.status === 'pending').length;
  const approvedCount = myRequisitions.filter(r => r.status === 'approved' || r.status === 'completed').length;
  const rejectedCount = myRequisitions.filter(r => r.status === 'rejected').length;

  return (
    <DashboardLayout title="My Requisitions">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{approvedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{rejectedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Create New Requisition Button */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Requisitions</CardTitle>
              <Button onClick={() => navigate('/preparer/new-requisition')}>
                <Plus className="mr-2 h-4 w-4" />
                New Requisition
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {myRequisitions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No requisitions yet. Click "New Requisition" to create your first one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequisitions.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.id}</TableCell>
                      <TableCell>{req.title}</TableCell>
                      <TableCell>
                        {req.currency} {req.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={req.status} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(req.submittedDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {req.status === 'rejected' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/preparer/new-requisition', { state: { editRequisition: req } })}
                          >
                            Resubmit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PreparerDashboard;
