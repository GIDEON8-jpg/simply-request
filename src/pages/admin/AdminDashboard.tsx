import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { mockRequisitions } from '@/data/mockData';
import { Download, Mail, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const AdminDashboard = () => {
  const { toast } = useToast();
  const [requisitions] = useState(mockRequisitions);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const statusCounts = {
    pending: requisitions.filter(r => r.status === 'pending').length,
    approved: requisitions.filter(r => r.status === 'approved').length,
    completed: requisitions.filter(r => r.status === 'completed').length,
    rejected: requisitions.filter(r => r.status === 'rejected').length,
  };

  const totalAmount = requisitions
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);

  const handleGenerateReport = () => {
    toast({
      title: "Generating Report",
      description: `Report for ${selectedMonth} is being generated`,
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
        {/* Generate Report Section */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Monthly Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reportMonth">Select Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-01">January 2025</SelectItem>
                  <SelectItem value="2025-02">February 2025</SelectItem>
                  <SelectItem value="2025-03">March 2025</SelectItem>
                  <SelectItem value="2025-04">April 2025</SelectItem>
                  <SelectItem value="2025-05">May 2025</SelectItem>
                  <SelectItem value="2025-06">June 2025</SelectItem>
                  <SelectItem value="2025-07">July 2025</SelectItem>
                  <SelectItem value="2025-08">August 2025</SelectItem>
                  <SelectItem value="2025-09">September 2025</SelectItem>
                  <SelectItem value="2025-10">October 2025</SelectItem>
                  <SelectItem value="2025-11">November 2025</SelectItem>
                  <SelectItem value="2025-12">December 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleGenerateReport} className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
              <Button onClick={handleExportEmail} variant="outline" className="flex-1">
                <Mail className="mr-2 h-4 w-4" />
                Export to Email
              </Button>
              <Button onClick={handleDownloadCSV} variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
          </CardContent>
        </Card>

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

      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
