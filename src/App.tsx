import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SuppliersProvider } from "./contexts/SuppliersContext";
import { RequisitionsProvider } from "./contexts/RequisitionsContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import HODDashboard from "./pages/hod/HODDashboard";
import NewRequisition from "./pages/hod/NewRequisition";
import AdminDashboard from "./pages/admin/AdminDashboard";
import FinanceDashboard from "./pages/finance/FinanceDashboard";
import HRDashboard from "./pages/hr/HRDashboard";
import AccountantDashboard from "./pages/accountant/AccountantDashboard";
import TechnicalDirectorDashboard from "./pages/technical/TechnicalDirectorDashboard";
import CEODashboard from "./pages/ceo/CEODashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode; allowedRole?: string }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={`/${user?.role}`} replace />;
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
            
            {/* HOD Routes */}
            <Route path="/hod" element={
              <ProtectedRoute allowedRole="hod">
                <HODDashboard />
              </ProtectedRoute>
            } />
            <Route path="/hod/new-requisition" element={
              <ProtectedRoute allowedRole="hod">
                <NewRequisition />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* Finance Routes */}
            <Route path="/finance" element={
              <ProtectedRoute allowedRole="finance">
                <FinanceDashboard />
              </ProtectedRoute>
            } />
            
            {/* HR Routes */}
            <Route path="/hr" element={
              <ProtectedRoute allowedRole="hr">
                <HRDashboard />
              </ProtectedRoute>
            } />
            
            {/* Accountant Routes */}
            <Route path="/accountant" element={
              <ProtectedRoute allowedRole="accountant">
                <AccountantDashboard />
              </ProtectedRoute>
            } />
            
            {/* Technical Director Routes */}
            <Route path="/technical" element={
              <ProtectedRoute allowedRole="technical">
                <TechnicalDirectorDashboard />
              </ProtectedRoute>
            } />
            
            {/* CEO Routes */}
            <Route path="/ceo" element={
              <ProtectedRoute allowedRole="ceo">
                <CEODashboard />
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
