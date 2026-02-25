import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { HardDrive, Trash2, AlertTriangle, Calendar, Database, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import StatusBadge from '@/components/StatusBadge';
import { RequisitionStatus } from '@/types/requisition';

interface RequisitionHistory {
  id: string;
  requisitionNumber: number;
  title: string;
  department: string;
  amount: number;
  currency: string;
  status: RequisitionStatus;
  submitted_date: string;
  submitted_by_name: string;
}

interface StorageStats {
  totalRequisitions: number;
  totalDocuments: number;
  totalPayments: number;
  estimatedSizeBytes: number;
}

const TOTAL_STORAGE_LIMIT_GB = 100;
const TOTAL_STORAGE_LIMIT_BYTES = TOTAL_STORAGE_LIMIT_GB * 1024 * 1024 * 1024;

// Estimate average sizes
const AVG_REQUISITION_SIZE = 2 * 1024; // 2KB per requisition record
const AVG_DOCUMENT_SIZE = 500 * 1024; // 500KB per document (avg file size)
const AVG_PAYMENT_SIZE = 1 * 1024; // 1KB per payment record

const StorageManagement = () => {
  const { toast } = useToast();
  const [storageStats, setStorageStats] = useState<StorageStats>({
    totalRequisitions: 0,
    totalDocuments: 0,
    totalPayments: 0,
    estimatedSizeBytes: 0,
  });
  const [requisitionHistory, setRequisitionHistory] = useState<RequisitionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchStorageStats = async () => {
    setLoading(true);
    try {
      // Get counts from all tables
      const [reqResult, docResult, payResult] = await Promise.all([
        supabase.from('requisitions').select('id', { count: 'exact', head: true }),
        supabase.from('requisition_documents').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('id', { count: 'exact', head: true }),
      ]);

      const totalRequisitions = reqResult.count || 0;
      const totalDocuments = docResult.count || 0;
      const totalPayments = payResult.count || 0;

      // Estimate storage usage
      const estimatedSizeBytes = 
        (totalRequisitions * AVG_REQUISITION_SIZE) +
        (totalDocuments * AVG_DOCUMENT_SIZE) +
        (totalPayments * AVG_PAYMENT_SIZE);

      setStorageStats({
        totalRequisitions,
        totalDocuments,
        totalPayments,
        estimatedSizeBytes,
      });

      // Fetch requisition history
      const { data: historyData, error } = await supabase
        .from('requisitions')
        .select(`
          id,
          requisition_number,
          title,
          department,
          amount,
          currency,
          status,
          submitted_date,
          profiles!requisitions_submitted_by_fkey(full_name)
        `)
        .order('submitted_date', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching requisition history:', error);
      } else {
        const history = (historyData || []).map((req: any) => ({
          id: req.id,
          requisitionNumber: req.requisition_number,
          title: req.title,
          department: req.department,
          amount: req.amount,
          currency: req.currency,
          status: req.status as RequisitionStatus,
          submitted_date: req.submitted_date,
          submitted_by_name: req.profiles?.full_name || 'Unknown',
        }));
        setRequisitionHistory(history);
      }
    } catch (error) {
      console.error('Error fetching storage stats:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStorageStats();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsagePercentage = (): number => {
    return (storageStats.estimatedSizeBytes / TOTAL_STORAGE_LIMIT_BYTES) * 100;
  };

  const handleDeleteByDateRange = async () => {
    if (!dateFrom || !dateTo) {
      toast({
        title: 'Error',
        description: 'Please select both start and end dates',
        variant: 'destructive',
      });
      return;
    }

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-requisitions', {
        body: {
          action: 'delete_by_date_range',
          dateFrom,
          dateTo,
        },
      });

      if (error) throw error;

      toast({
        title: 'Cleanup Complete',
        description: `Deleted ${data.deletedCount || 0} requisitions from ${dateFrom} to ${dateTo}`,
      });

      // Refresh stats
      await fetchStorageStats();
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast({
        title: 'Cleanup Failed',
        description: error.message || 'Failed to delete requisitions',
        variant: 'destructive',
      });
    }
    setDeleting(false);
  };

  const handleNukeAllHistory = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-requisitions', {
        body: {
          action: 'nuke_all',
        },
      });

      if (error) throw error;

      toast({
        title: 'All History Deleted',
        description: `Deleted ${data.deletedCount || 0} requisitions and all related data`,
      });

      // Refresh stats
      await fetchStorageStats();
    } catch (error: any) {
      console.error('Nuke error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete all requisitions',
        variant: 'destructive',
      });
    }
    setDeleting(false);
  };

  const usagePercentage = getUsagePercentage();
  const usedStorage = storageStats.estimatedSizeBytes;
  const freeStorage = TOTAL_STORAGE_LIMIT_BYTES - usedStorage;

  return (
    <div className="space-y-6">
      {/* Storage Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Usage Overview
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Monitor and manage your project's storage allocation
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Storage Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used: {formatBytes(usedStorage)}</span>
              <span>Free: {formatBytes(freeStorage)}</span>
            </div>
            <Progress 
              value={usagePercentage} 
              className={`h-4 ${usagePercentage > 80 ? '[&>div]:bg-destructive' : usagePercentage > 50 ? '[&>div]:bg-yellow-500' : ''}`}
            />
            <p className="text-center text-sm text-muted-foreground">
              {usagePercentage.toFixed(2)}% of {TOTAL_STORAGE_LIMIT_GB}GB used
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{storageStats.totalRequisitions}</p>
              <p className="text-sm text-muted-foreground">Requisitions</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{storageStats.totalDocuments}</p>
              <p className="text-sm text-muted-foreground">Documents</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{storageStats.totalPayments}</p>
              <p className="text-sm text-muted-foreground">Payments</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Storage Cleanup Tools
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Delete old requisitions to free up storage space
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Cleanup */}
          <div className="p-4 border rounded-lg space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Delete by Date Range
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={!dateFrom || !dateTo || deleting}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleting ? 'Deleting...' : 'Delete Requisitions in Date Range'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all requisitions from {dateFrom} to {dateTo}, 
                    including their documents and payment records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteByDateRange} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Nuke All */}
          <div className="p-4 border border-destructive rounded-lg space-y-4">
            <h4 className="font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Delete All Requisition History
            </h4>
            <p className="text-sm text-muted-foreground">
              This will permanently delete ALL requisitions, documents, and payment records. 
              Use this only when you need to completely reset the system.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting} className="w-full">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {deleting ? 'Deleting...' : 'DELETE ALL HISTORY (DANGER)'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">⚠️ DANGER: Complete Data Deletion</AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>This action will permanently delete:</strong>
                    <ul className="list-disc ml-4 mt-2">
                      <li>{storageStats.totalRequisitions} requisitions</li>
                      <li>{storageStats.totalDocuments} documents</li>
                      <li>{storageStats.totalPayments} payment records</li>
                    </ul>
                    <p className="mt-4 text-destructive font-medium">
                      This action CANNOT be undone. All historical data will be lost.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleNukeAllHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Requisition History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Requisition History
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete list of all requisitions for reference (showing up to 500)
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading history...</p>
          ) : requisitionHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No requisitions found</p>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisitionHistory.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono text-xs">REQ_{req.requisitionNumber}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{req.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{req.department}</Badge>
                      </TableCell>
                      <TableCell>
                        {req.currency} {req.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={req.status} />
                      </TableCell>
                      <TableCell>{req.submitted_by_name}</TableCell>
                      <TableCell>
                        {req.submitted_date ? new Date(req.submitted_date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StorageManagement;
