import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { mockRequisitions } from '@/data/mockData';
import { Upload, Download, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = () => {
  const { toast } = useToast();
  const [requisitions] = useState(mockRequisitions);

  const statusCounts = {
    pending: requisitions.filter(r => r.status === 'pending').length,
    approved: requisitions.filter(r => r.status === 'approved').length,
    completed: requisitions.filter(r => r.status === 'completed').length,
    rejected: requisitions.filter(r => r.status === 'rejected').length,
  };

  const totalAmount = requisitions
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);

  const handleUploadSuppliers = () => {
    toast({
      title: "Supplier List Uploaded",
      description: "Supplier database has been updated",
    });
  };

  const handleUploadBudget = () => {
    toast({
      title: "Budget Uploaded",
      description: "Monthly budget has been updated",
    });
  };

  const handleGenerateReport = () => {
    toast({
      title: "Generating Report",
      description: "Monthly requisition report is being generated",
    });
  };

  const handleExportEmail = () => {
    toast({
      title: "Email Sent",
      description: "Report has been exported and emailed",
    });
  };

  const handleDownloadCSV = () => {
    toast({
      title: "Downloading",
      description: "CSV file is being downloaded",
    });
  };

  return (
    <DashboardLayout title="Administrator Dashboard">
      <div className="space-y-6">
        {/* Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Supplier List</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                onClick={handleUploadSuppliers}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500">CSV file with supplier information</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload Monthly Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                onClick={handleUploadBudget}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500">Clears automatically every month</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Report Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Requisition Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Requisitions</p>
                <p className="text-3xl font-bold">{requisitions.length}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-[hsl(var(--status-pending))]">{statusCounts.pending}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold text-[hsl(var(--status-approved))]">{statusCounts.approved}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-[hsl(var(--status-completed))]">{statusCounts.completed}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold text-[hsl(var(--status-rejected))]">{statusCounts.rejected}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-lg font-semibold">Total Amount Spent This Month: <span className="text-green-600">${totalAmount.toFixed(2)}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleGenerateReport} variant="outline">
                Generate Report
              </Button>
              <Button onClick={handleExportEmail} variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Export to Email
              </Button>
              <Button onClick={handleDownloadCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* All Requisitions Table */}
        <Card>
          <CardHeader>
            <CardTitle>View ALL Requisitions</CardTitle>
            <p className="text-sm text-muted-foreground">Showing requisitions from all departments</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>HOD</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisitions.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.id}</TableCell>
                    <TableCell>{req.title}</TableCell>
                    <TableCell>{req.submittedBy}</TableCell>
                    <TableCell>{req.department}</TableCell>
                    <TableCell>${req.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* System Stats */}
        <Card>
          <CardHeader>
            <CardTitle>System Stats Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">ℹ️ Supplier management is handled by HR & Admin</p>
              <p>Total active suppliers: 5</p>
              <p>Total users: 5 (across all roles)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
