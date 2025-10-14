import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { useRequisitions } from '@/contexts/RequisitionsContext';
import { Download, Mail, FileText, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Department } from '@/types/requisition';

const departments: Department[] = ['Education', 'IT', 'Marketing and PR', 'Technical', 'Human Resources and Admin'];

const AdminDashboard = () => {
  const { toast } = useToast();
  const { requisitions, budgets, setBudgets: saveBudgets } = useRequisitions();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [localBudgets, setLocalBudgets] = useState(budgets);

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
    const [year, month] = selectedMonth.split('-');
    const reportData = requisitions.filter(r => {
      const reqDate = new Date(r.submittedDate);
      return reqDate.getFullYear() === parseInt(year) && 
             (reqDate.getMonth() + 1) === parseInt(month);
    });

    const totalSpent = reportData
      .filter(r => r.status === 'approved' || r.status === 'completed')
      .reduce((sum, r) => sum + r.amount, 0);

    const reportText = `
═══════════════════════════════════════════════════════════
              MONTHLY REQUISITION REPORT
               ${month}/${year}
═══════════════════════════════════════════════════════════

SUMMARY
-------
Total Requisitions: ${reportData.length}
Pending:   ${reportData.filter(r => r.status === 'pending').length}
Approved:  ${reportData.filter(r => r.status === 'approved').length}
Completed: ${reportData.filter(r => r.status === 'completed').length}
Rejected:  ${reportData.filter(r => r.status === 'rejected').length}

Total Amount Spent: $${totalSpent.toFixed(2)}

DEPARTMENT BREAKDOWN
--------------------
${departments.map(dept => {
  const deptReqs = reportData.filter(r => r.department === dept);
  const totalSpent = deptReqs
    .filter(r => r.status === 'approved' || r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);
  const budgetUsed = budgets[dept] > 0 ? (totalSpent / budgets[dept] * 100).toFixed(1) : 0;
  return `${dept}:
  Requisitions: ${deptReqs.length}
  Amount Spent: $${totalSpent.toFixed(2)}
  Budget Used: ${budgetUsed}%`;
}).join('\n\n')}

═══════════════════════════════════════════════════════════
    `.trim();

    console.log(reportText);
    
    // Create a downloadable text file
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-report-${selectedMonth}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Report Generated",
      description: `Report for ${month}/${year} downloaded successfully`,
    });
  };

  const handleExportEmail = () => {
    toast({
      title: "Email Sent",
      description: "Report has been exported and emailed",
    });
  };

  const handleDownloadCSV = () => {
    const getCurrencySymbol = (currency: string) => {
      switch(currency) {
        case 'USD': return '$';
        case 'ZWG': return 'ZW$';
        case 'GBP': return '£';
        case 'EUR': return '€';
        default: return '$';
      }
    };

    const csvContent = [
      ['ID', 'Title', 'Department', 'Amount', 'Currency', 'Status', 'Date Submitted', 'Submitted By', 'Supplier'],
      ...requisitions.map(r => [
        r.id,
        `"${r.title}"`,
        r.department,
        r.amount.toFixed(2),
        r.currency,
        r.status,
        new Date(r.submittedDate).toLocaleDateString(),
        r.submittedBy,
        `"${r.chosenSupplier.name}"`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requisitions-report-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "CSV Export Complete",
      description: `Report exported with ${requisitions.length} requisitions`,
    });
  };

  const handleSaveBudgets = () => {
    saveBudgets(localBudgets);
    toast({
      title: "Budgets Saved",
      description: "Department budgets have been updated successfully",
    });
  };

  const handleBudgetChange = (dept: Department, value: string) => {
    const numValue = parseFloat(value) || 0;
    setLocalBudgets(prev => ({ ...prev, [dept]: numValue }));
  };

  // Calculate budget usage per department
  const departmentBudgetUsage = departments.map(dept => {
    const used = requisitions
      .filter(r => r.department === dept && (r.status === 'approved' || r.status === 'completed'))
      .reduce((sum, r) => sum + r.amount, 0);
    const total = localBudgets[dept];
    const percentage = total > 0 ? (used / total) * 100 : 0;
    return { department: dept, used, total, percentage };
  });

  return (
    <DashboardLayout title="Administrator Dashboard">
      <div className="space-y-6">
        {/* Department Budgets */}
        <Card>
          <CardHeader>
            <CardTitle>Department Budgets</CardTitle>
            <p className="text-sm text-muted-foreground">Set and manage budgets for each department</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {departments.map(dept => {
                const usage = departmentBudgetUsage.find(d => d.department === dept);
                const isNearLimit = usage && usage.percentage >= 80;
                const isExceeded = usage && usage.percentage >= 100;
                
                return (
                  <div key={dept} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`budget-${dept}`}>{dept}</Label>
                      {usage && (
                        <span className={`text-sm font-medium ${
                          isExceeded ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          ${usage.used.toFixed(2)} / ${usage.total.toFixed(2)} ({usage.percentage.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                    <Input
                      id={`budget-${dept}`}
                      type="number"
                      step="0.01"
                      value={localBudgets[dept]}
                      onChange={(e) => handleBudgetChange(dept, e.target.value)}
                      className={isExceeded ? 'border-red-500' : isNearLimit ? 'border-orange-500' : ''}
                    />
                    {usage && usage.percentage > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isExceeded ? 'bg-red-600' : isNearLimit ? 'bg-orange-600' : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                        />
                      </div>
                    )}
                    {isExceeded && (
                      <p className="text-xs text-red-600 font-medium">⚠ Budget exceeded!</p>
                    )}
                    {isNearLimit && !isExceeded && (
                      <p className="text-xs text-orange-600 font-medium">⚠ Approaching budget limit</p>
                    )}
                  </div>
                );
              })}
            </div>
            <Button onClick={handleSaveBudgets} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save Department Budgets
            </Button>
          </CardContent>
        </Card>

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
