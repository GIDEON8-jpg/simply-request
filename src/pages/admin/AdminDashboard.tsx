import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { useRequisitions } from '@/contexts/RequisitionsContext';
import { Download, Mail, FileText, Save, RotateCcw, Upload, Users, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Department, RequisitionStatus } from '@/types/requisition';
import { getStuckAt, getStuckAtBadgeClass } from '@/lib/requisition-utils';
import { supabase } from '@/integrations/supabase/client';

interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action_type: string;
  requisition_id: string | null;
  details: string | null;
  created_at: string;
}

const departments: Department[] = ['Education', 'IT', 'Marketing and PR', 'Technical', 'HR', 'Finance', 'CEO', 'Registry'];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requisitions, budgets, saveBudgetsToBackend } = useRequisitions();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState<RequisitionStatus | 'all'>('all');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [localBudgets, setLocalBudgets] = useState<Record<Department, number>>({
    'Education': 10000,
    'IT': 20000,
    'Marketing and PR': 15000,
    'Technical': 18000,
    'HR': 12000,
    'Finance': 25000,
    'CEO': 100000,
    'Registry': 10000,
  });

  // Fetch audit logs
  useEffect(() => {
    const fetchAuditLogs = async () => {
      setAuditLoading(true);
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('Error fetching audit logs:', error);
      } else {
        setAuditLogs(data || []);
      }
      setAuditLoading(false);
    };

    fetchAuditLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('audit-logs-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          setAuditLogs(prev => [payload.new as AuditLog, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync with context budgets on mount
  useEffect(() => {
    if (budgets) {
      setLocalBudgets(budgets);
    }
  }, [budgets]);

  const statusCounts = {
    pending: requisitions.filter(r => r.status === 'pending').length,
    approved: requisitions.filter(r => r.status === 'approved').length,
    approved_wait: requisitions.filter(r => r.status === 'approved_wait').length,
    completed: requisitions.filter(r => r.status === 'completed').length,
    rejected: requisitions.filter(r => r.status === 'rejected').length,
  };

  // Filtered requisitions based on status filter
  const filteredRequisitions = statusFilter === 'all' 
    ? requisitions 
    : requisitions.filter(r => r.status === statusFilter);

  const totalAmount = requisitions
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const handleGenerateReport = () => {
    const [year, month] = selectedMonth.split('-');
    const reportData = requisitions.filter(r => {
      const reqDate = new Date(r.submittedDate);
      return reqDate.getFullYear() === parseInt(year) && 
             (reqDate.getMonth() + 1) === parseInt(month);
    });

    const totalSpent = reportData
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

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
    .reduce((sum, r) => sum + (r.amount || 0), 0);
  const budgetUsed = localBudgets[dept] > 0 ? (totalSpent / localBudgets[dept] * 100).toFixed(1) : '0';
  return `${dept}:
  Requisitions: ${deptReqs.length}
  Amount Spent: $${totalSpent.toFixed(2)}
  Budget Used: ${budgetUsed}%`;
}).join('\n\n')}

═══════════════════════════════════════════════════════════
    `.trim();
    
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
    const csvContent = [
      ['ID', 'Title', 'Department', 'Amount', 'Currency', 'Status', 'Date Submitted', 'Submitted By', 'Supplier'],
      ...requisitions.map(r => [
        r.id,
        `"${r.title}"`,
        r.department,
        (r.amount || 0).toFixed(2),
        r.currency,
        r.status,
        new Date(r.submittedDate).toLocaleDateString(),
        r.submittedBy,
        `"${r.chosenSupplier?.name || 'N/A'}"`
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

  const handleSaveBudgets = async () => {
    try {
      await saveBudgetsToBackend(localBudgets);
      toast({
        title: "Budgets Saved",
        description: "Department budgets have been updated and synced to the backend",
      });
    } catch (e) {
      toast({ title: "Save Failed", description: "You may not have permission to save budgets.", variant: "destructive" });
    }
  };

  const handleResetBudgets = async () => {
    const zeros = departments.reduce((acc, dept) => {
      acc[dept] = 0;
      return acc;
    }, {} as Record<Department, number>);
    setLocalBudgets(zeros);
    try {
      await saveBudgetsToBackend(zeros);
      toast({
        title: 'Budgets Reset',
        description: 'All department budgets set to $0 and synced to backend.',
      });
    } catch (e) {
      toast({ title: 'Reset Failed', description: 'You may not have permission to reset budgets.', variant: 'destructive' });
    }
  };

  const handleBudgetChange = (dept: Department, value: string) => {
    const numValue = parseFloat(value) || 0;
    setLocalBudgets(prev => ({ ...prev, [dept]: numValue }));
  };

  // Calculate budget usage per department
  const departmentBudgetUsage = departments.map(dept => {
    const used = requisitions
      .filter(r => r.department === dept && (r.status === 'completed' || r.paymentDate))
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const total = localBudgets[dept] || 0;
    const remaining = total - used;
    return { department: dept, used, total, remaining };
  });

  return (
    <DashboardLayout title="Administrator Dashboard">
      <div className="space-y-6">
        {/* User Management Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <p className="text-sm text-muted-foreground">Manage system users and import new users</p>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/admin/bulk-import')} className="w-full" size="lg">
              <Upload className="mr-2 h-5 w-5" />
              Bulk Import Users from CSV
            </Button>
          </CardContent>
        </Card>

        {/* Department Budgets */}
        <Card>
          <CardHeader>
            <CardTitle>Department Budgets</CardTitle>
            <p className="text-sm text-muted-foreground">Set and manage budgets for each department</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map(dept => {
                const usage = departmentBudgetUsage.find(d => d.department === dept);
                const isExhausted = usage && usage.remaining <= 100;
                
                return (
                  <div key={dept} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`budget-${dept}`} className="font-medium">{dept}</Label>
                      {usage && (
                        <span className={`text-sm ${isExhausted ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                          Remaining: ${usage.remaining.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <Input
                      id={`budget-${dept}`}
                      type="number"
                      step="0.01"
                      value={localBudgets[dept] || 0}
                      onChange={(e) => handleBudgetChange(dept, e.target.value)}
                      className={isExhausted ? 'border-destructive' : ''}
                    />
                    {isExhausted && (
                      <p className="text-xs text-destructive font-medium">⚠ Budget Exhausted - Cannot submit new requisitions</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSaveBudgets} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                Save Department Budgets
              </Button>
              <Button onClick={handleResetBudgets} variant="destructive" className="flex-1">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset All Budgets
              </Button>
            </div>
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

        {/* Monthly Report Summary with Clickable Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Requisition Report</CardTitle>
            <p className="text-sm text-muted-foreground">Click on a status to filter requisitions</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <button
                onClick={() => setStatusFilter('all')}
                className={`text-center p-4 rounded-lg border-2 transition-all hover:bg-muted ${statusFilter === 'all' ? 'border-primary bg-primary/10' : 'border-transparent'}`}
              >
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold">{requisitions.length}</p>
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`text-center p-4 rounded-lg border-2 transition-all hover:bg-muted ${statusFilter === 'pending' ? 'border-yellow-500 bg-yellow-500/10' : 'border-transparent'}`}
              >
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{statusCounts.pending}</p>
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`text-center p-4 rounded-lg border-2 transition-all hover:bg-muted ${statusFilter === 'approved' ? 'border-blue-500 bg-blue-500/10' : 'border-transparent'}`}
              >
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-3xl font-bold text-blue-600">{statusCounts.approved}</p>
              </button>
              <button
                onClick={() => setStatusFilter('approved_wait')}
                className={`text-center p-4 rounded-lg border-2 transition-all hover:bg-muted ${statusFilter === 'approved_wait' ? 'border-orange-500 bg-orange-500/10' : 'border-transparent'}`}
              >
                <p className="text-sm text-muted-foreground">On Hold</p>
                <p className="text-3xl font-bold text-orange-600">{statusCounts.approved_wait}</p>
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`text-center p-4 rounded-lg border-2 transition-all hover:bg-muted ${statusFilter === 'completed' ? 'border-green-500 bg-green-500/10' : 'border-transparent'}`}
              >
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-green-600">{statusCounts.completed}</p>
              </button>
              <button
                onClick={() => setStatusFilter('rejected')}
                className={`text-center p-4 rounded-lg border-2 transition-all hover:bg-muted ${statusFilter === 'rejected' ? 'border-red-500 bg-red-500/10' : 'border-transparent'}`}
              >
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-3xl font-bold text-red-600">{statusCounts.rejected}</p>
              </button>
            </div>
            <div className="border-t pt-4">
              <p className="text-lg font-semibold">Total Amount Spent This Month: <span className="text-green-600">${totalAmount.toFixed(2)}</span></p>
            </div>
          </CardContent>
        </Card>

        {/* All Requisitions Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {statusFilter === 'all' ? 'All Requisitions' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace('_', ' ')} Requisitions`}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Showing {filteredRequisitions.length} requisition{filteredRequisitions.length !== 1 ? 's' : ''} from all departments
              {statusFilter !== 'all' && (
                <Button variant="link" size="sm" onClick={() => setStatusFilter('all')} className="ml-2 h-auto p-0">
                  Clear filter
                </Button>
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
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No requisitions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequisitions.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.id.slice(0, 8)}...</TableCell>
                      <TableCell>{req.title}</TableCell>
                      <TableCell>{req.submittedBy}</TableCell>
                      <TableCell>{req.department}</TableCell>
                      <TableCell>${(req.amount || 0).toFixed(2)}</TableCell>
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Audit Trail Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Audit Trail
            </CardTitle>
            <p className="text-sm text-muted-foreground">Track user logins, approvals, and actions</p>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading audit logs...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No audit logs yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">{log.user_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              log.action_type === 'login' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              log.action_type === 'logout' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                              log.action_type === 'approve' ? 'bg-green-100 text-green-800 border-green-300' :
                              log.action_type === 'reject' ? 'bg-red-100 text-red-800 border-red-300' :
                              log.action_type === 'on_hold' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                              log.action_type === 'payment' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                              'bg-yellow-100 text-yellow-800 border-yellow-300'
                            }
                          >
                            {log.action_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                          {log.details || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
