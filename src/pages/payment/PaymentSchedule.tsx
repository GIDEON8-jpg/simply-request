import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRequisitions } from '@/contexts/RequisitionsContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { FileDown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface PaymentRecord {
  id: string;
  requisitionId: string;
  popFileName: string;
  paymentDate: string;
  processedBy: string;
  status: string;
  requisitionTitle?: string;
  requisitionAmount?: number;
  requisitionCurrency?: string;
  department?: string;
  supplierName?: string;
}

const PaymentSchedule = () => {
  const { requisitions } = useRequisitions();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('payments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          requisitions (
            title,
            amount,
            currency,
            department,
            chosen_supplier_id
          )
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      const enrichedPayments: PaymentRecord[] = await Promise.all(
        (data || []).map(async (payment: any) => {
          const req = requisitions.find(r => r.id === payment.requisition_id);
          return {
            id: payment.id,
            requisitionId: payment.requisition_id,
            popFileName: payment.pop_file_name,
            paymentDate: payment.payment_date,
            processedBy: payment.processed_by,
            status: payment.status,
            requisitionTitle: req?.title || payment.requisitions?.title,
            requisitionAmount: req?.amount || payment.requisitions?.amount,
            requisitionCurrency: req?.currency || payment.requisitions?.currency,
            department: req?.department || payment.requisitions?.department,
            supplierName: req?.chosenSupplier?.name,
          };
        })
      );

      setPayments(enrichedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment records',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (payments.length === 0) {
      toast({
        title: "No Data",
        description: "No payment records to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Payment ID', 'Requisition ID', 'Title', 'Department', 'Supplier', 'Amount', 'Currency', 'Payment Date', 'Proof of Payment', 'Processed By', 'Status'];
    const csvRows = [headers.join(',')];

    payments.forEach(payment => {
      const row = [
        payment.id,
        payment.requisitionId,
        `"${payment.requisitionTitle || 'N/A'}"`,
        payment.department || 'N/A',
        `"${payment.supplierName || 'N/A'}"`,
        payment.requisitionAmount || 0,
        payment.requisitionCurrency || 'USD',
        new Date(payment.paymentDate).toLocaleDateString(),
        `"${payment.popFileName}"`,
        `"${payment.processedBy}"`,
        payment.status
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment_schedule_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Exported",
      description: `${payments.length} payment records exported to CSV`,
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

  return (
    <DashboardLayout title="Payment Schedule Report">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Payment Schedule</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  All completed payments and their records
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleExportCSV} variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button onClick={() => navigate(-1)} variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading payment records...</p>
            ) : payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No payment records found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Req. ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Proof of Payment</TableHead>
                      <TableHead>Processed By</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}</TableCell>
                        <TableCell className="font-mono text-xs">{payment.requisitionId.slice(0, 8)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{payment.requisitionTitle || 'N/A'}</TableCell>
                        <TableCell>{payment.department || 'N/A'}</TableCell>
                        <TableCell>{payment.supplierName || 'N/A'}</TableCell>
                        <TableCell className="font-semibold">
                          {payment.requisitionAmount 
                            ? `${getCurrencySymbol(payment.requisitionCurrency || 'USD')}${payment.requisitionAmount.toFixed(2)}`
                            : 'N/A'
                          }
                        </TableCell>
                        <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{payment.popFileName}</TableCell>
                        <TableCell>{payment.processedBy}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            payment.status === 'paid' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {payment.status}
                          </span>
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
    </DashboardLayout>
  );
};

export default PaymentSchedule;
