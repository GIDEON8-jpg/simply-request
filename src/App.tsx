import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SuppliersProvider } from "@/contexts/SuppliersContext";
import { RequisitionsProvider } from "@/contexts/RequisitionsContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import PreparerDashboard from "./pages/preparer/PreparerDashboard";
import HODDashboard from "./pages/hod/HODDashboard";
import NewRequisition from "./pages/hod/NewRequisition";
import AdminDashboard from "./pages/admin/AdminDashboard";
import BulkImport from "./pages/admin/BulkImport";
import FinanceDashboard from "./pages/finance/FinanceDashboard";
import DeputyFinanceDashboard from "./pages/finance/DeputyFinanceDashboard";
import HRDashboard from "./pages/hr/HRDashboard";
import AccountantDashboard from "./pages/accountant/AccountantDashboard";
import TechnicalDirectorDashboard from "./pages/technical/TechnicalDirectorDashboard";
import CEODashboard from "./pages/ceo/CEODashboard";
import PaymentSchedule from "./pages/payment/PaymentSchedule";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = user?.roles || (user?.role ? [user.role] : []);
    const hasAccess = allowedRoles.some(r => userRoles.includes(r as any));
    if (!hasAccess) {
      return <Navigate to={`/${user?.role}`} replace />;
    }
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SuppliersProvider>
        <RequisitionsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            
            {/* Preparer Routes */}
            <Route path="/preparer" element={
              <ProtectedRoute allowedRoles={["preparer"]}>
                <PreparerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/preparer/new-requisition" element={
              <ProtectedRoute allowedRoles={["preparer"]}>
                <NewRequisition />
              </ProtectedRoute>
            } />
            
            {/* HOD Routes */}
            <Route path="/hod" element={
              <ProtectedRoute allowedRoles={["hod"]}>
                <HODDashboard />
              </ProtectedRoute>
            } />
            <Route path="/hod/new-requisition" element={
              <ProtectedRoute allowedRoles={["hod"]}>
                <NewRequisition />
              </ProtectedRoute>
            } />
            
            {/* Finance Manager Routes */}
            <Route path="/finance_manager" element={
              <ProtectedRoute allowedRoles={["finance_manager"]}>
                <FinanceDashboard />
              </ProtectedRoute>
            } />
            <Route path="/finance_manager/new-requisition" element={
              <ProtectedRoute allowedRoles={["finance_manager"]}>
                <NewRequisition />
              </ProtectedRoute>
            } />
            
            {/* Deputy Finance Manager Routes */}
            <Route path="/deputy_finance_manager" element={
              <ProtectedRoute allowedRoles={["deputy_finance_manager"]}>
                <DeputyFinanceDashboard />
              </ProtectedRoute>
            } />
            <Route path="/deputy_finance_manager/new-requisition" element={
              <ProtectedRoute allowedRoles={["deputy_finance_manager"]}>
                <NewRequisition />
              </ProtectedRoute>
            } />
            
            {/* HR Routes */}
            <Route path="/hr" element={
              <ProtectedRoute allowedRoles={["hr"]}>
                <HRDashboard />
              </ProtectedRoute>
            } />
            <Route path="/hr/new-requisition" element={
              <ProtectedRoute allowedRoles={["hr"]}>
                <NewRequisition />
              </ProtectedRoute>
            } />
            
            {/* Accountant Routes */}
            <Route path="/accountant" element={
              <ProtectedRoute allowedRoles={["accountant"]}>
                <AccountantDashboard />
              </ProtectedRoute>
            } />
            
            {/* Technical Director Routes */}
            <Route path="/technical_director" element={
              <ProtectedRoute allowedRoles={["technical_director"]}>
                <TechnicalDirectorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/technical_director/new-requisition" element={
              <ProtectedRoute allowedRoles={["technical_director"]}>
                <NewRequisition />
              </ProtectedRoute>
            } />
            
            {/* CEO Routes */}
            <Route path="/ceo" element={
              <ProtectedRoute allowedRoles={["ceo"]}>
                <CEODashboard />
              </ProtectedRoute>
            } />
            <Route path="/ceo/new-requisition" element={
              <ProtectedRoute allowedRoles={["ceo"]}>
                <NewRequisition />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/bulk-import" element={
              <ProtectedRoute>
                <BulkImport />
              </ProtectedRoute>
            } />
            
            {/* Payment Schedule - Accessible by Finance, Accountant, CEO */}
            <Route path="/payment-schedule" element={
              <ProtectedRoute>
                <PaymentSchedule />
              </ProtectedRoute>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
          </TooltipProvider>
        </RequisitionsProvider>
      </SuppliersProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
