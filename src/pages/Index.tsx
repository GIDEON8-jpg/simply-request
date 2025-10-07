import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
      <div className="text-center max-w-2xl px-4">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="mb-4 text-5xl font-bold">Requisition Management System</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Streamline your purchase requests, approvals, and payments with automated workflows
        </p>
        <Button onClick={() => navigate('/login')} size="lg" className="text-lg px-8 py-6">
          Access System
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="font-semibold text-primary">HOD</p>
            <p className="text-muted-foreground">Create & Track Requests</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="font-semibold text-primary">Finance/CEO</p>
            <p className="text-muted-foreground">Review & Approve</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="font-semibold text-primary">Accountant</p>
            <p className="text-muted-foreground">Process Payments</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="font-semibold text-primary">HR & Admin</p>
            <p className="text-muted-foreground">Manage Suppliers</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="font-semibold text-primary">Admin</p>
            <p className="text-muted-foreground">System Overview</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
