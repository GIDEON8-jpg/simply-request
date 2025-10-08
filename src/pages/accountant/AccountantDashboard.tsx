import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockRequisitions } from '@/data/mockData';
import { Upload, CheckCircle, Mail, FileDown, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

const AccountantDashboard = () => {
  const { toast } = useToast();
  const [requisitions, setRequisitions] = useState(mockRequisitions);
  const [uploadedPOP, setUploadedPOP] = useState<{ [key: string]: File[] }>({});

  const approvedRequisitions = requisitions.filter(r => r.status === 'approved');
  
  const paymentSchedule = [
    { id: 'REQ-001', description: 'ICT Accessories', supplier: 'MultiChoice', amount: 510.00, date: '21/09/25', status: 'Paid' },
    { id: 'REQ-002', description: 'Multicopy Paper', supplier: 'ABC', amount: 255.00, date: '21/09/25', status: 'Paid' },
    { id: 'REQ-003', description: 'Servicing', supplier: 'TelOne', amount: 109.00, date: '21/09/25', status: 'Paid' },
    { id: 'REQ-008', description: 'IT Equipment', supplier: 'Tech Solutions', amount: 2300.00, date: '05/10/25', status: 'Pending' },
  ];

  const totalAmount = paymentSchedule.reduce((sum, item) => sum + item.amount, 0);
  const paidAmount = paymentSchedule.filter(item => item.status === 'Paid').reduce((sum, item) => sum + item.amount, 0);
  const pendingAmount = totalAmount - paidAmount;

  const handleUploadPOP = (reqId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedPOP({ ...uploadedPOP, [reqId]: [...(uploadedPOP[reqId] || []), ...files] });
      toast({
        title: "Proof of Payment Uploaded",
        description: `${files.length} file(s) uploaded`,
      });
    }
  };

  const removePOPFile = (reqId: string, fileIndex: number) => {
    setUploadedPOP(prev => ({
      ...prev,
      [reqId]: prev[reqId].filter((_, i) => i !== fileIndex)
    }));
  };

  const handleMarkComplete = (reqId: string) => {
    setRequisitions(prev => prev.map(req => 
      req.id === reqId ? { ...req, status: 'completed' as any } : req
    ));
    toast({
      title: "Status Synced",
      description: "Requisition status updated to Completed and synced with system",
    });
    // In real app: sync with backend to update status across all dashboards
  };

  const handleNotifyHOD = (reqId: string) => {
    toast({
      title: "Email Sent",
      description: "HOD has been notified that payment is complete",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Exporting to PDF",
      description: "Payment schedule report is being generated",
    });
  };

  const handleEmailReport = () => {
    toast({
      title: "Email Sent",
      description: "Payment schedule report has been emailed",
    });
  };

  return (
    <DashboardLayout title="Accountant Dashboard">
      <div className="space-y-6">
        {/* Approved Requisitions - Payment Processing */}
        <Card>
          <CardHeader>
            <CardTitle>Approved Requisitions - Payment Processing</CardTitle>
          </CardHeader>
          <CardContent>
            {approvedRequisitions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No approved requisitions pending payment</p>
            ) : (
              <div className="space-y-6">
                {approvedRequisitions.map((req) => (
                  <Card key={req.id} className="border-2 border-green-200 bg-green-50/30">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-bold">{req.id} - {req.title}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{req.department}</Badge>
                            <Badge variant="outline">${req.amount.toFixed(2)}</Badge>
                            <Badge className="bg-green-600 text-white">✓ APPROVED (Awaiting Payment)</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Supplier</p>
                          <p className="font-medium">{req.chosenSupplier.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Submitted by</p>
                          <p className="font-medium">{req.submittedBy}</p>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="font-semibold mb-2">Step 1: Process Payment</p>
                        <Button className="w-full bg-orange-600 hover:bg-orange-700" size="lg">
                          🔄 PROCESS PAYMENT
                        </Button>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="font-semibold mb-2">Step 2: Upload Proof of Payment (Multiple files allowed)</p>
                        <input
                          type="file"
                          id={`pop-${req.id}`}
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleUploadPOP(req.id, e)}
                          className="hidden"
                          multiple
                        />
                        <label
                          htmlFor={`pop-${req.id}`}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer flex flex-col items-center"
                        >
                          <Upload className="h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">
                            📎 Click to upload proof of payment files
                          </p>
                          <p className="text-xs text-gray-500">PDF, JPG, PNG (multiple files allowed)</p>
                        </label>

                        {uploadedPOP[req.id] && uploadedPOP[req.id].length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium">Uploaded Files ({uploadedPOP[req.id].length}):</p>
                            {uploadedPOP[req.id].map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <span className="text-sm text-gray-700">✓ {file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePOPFile(req.id, index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="font-semibold mb-3">Step 3: Complete Process</p>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleMarkComplete(req.id)}
                            disabled={!uploadedPOP[req.id] || uploadedPOP[req.id].length === 0}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            MARK AS COMPLETED
                          </Button>
                          <Button
                            onClick={() => handleNotifyHOD(req.id)}
                            disabled={!uploadedPOP[req.id] || uploadedPOP[req.id].length === 0}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            NOTIFY HOD - Payment Done
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Schedule Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment Schedule Report</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportPDF}>
                  <FileDown className="mr-2 h-4 w-4" />
                  📊 EXPORT TO PDF
                </Button>
                <Button variant="outline" onClick={handleEmailReport}>
                  <Send className="mr-2 h-4 w-4" />
                  📧 EMAIL SCHEDULE REPORT
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Req ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentSchedule.map((item) => (
                  <TableRow key={item.id} className={item.status === 'Pending' ? 'bg-yellow-50' : 'bg-gray-50'}>
                    <TableCell className="font-medium">{item.id}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.supplier}</TableCell>
                    <TableCell>${item.amount.toFixed(2)}</TableCell>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>
                      <Badge className={item.status === 'Paid' ? 'bg-gray-500' : 'bg-yellow-500'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-gray-100">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell>${totalAmount.toFixed(2)}</TableCell>
                  <TableCell colSpan={2}>
                    Paid: ${paidAmount.toFixed(2)} | Pending: ${pendingAmount.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AccountantDashboard;
