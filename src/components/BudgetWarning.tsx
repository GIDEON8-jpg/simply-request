import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRequisitions } from '@/contexts/RequisitionsContext';
import { Department } from '@/types/requisition';

interface BudgetWarningProps {
  department: Department;
}

const BudgetWarning = ({ department }: BudgetWarningProps) => {
  const { budgets, requisitions } = useRequisitions();
  
  const budgetTotal = budgets[department] || 0;
  const budgetUsed = requisitions
    .filter(r => r.department === department && r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);
  
  const remaining = budgetTotal - budgetUsed;

  // Show warning when budget reaches $100 or below
  if (remaining > 100) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Budget Exhausted!</AlertTitle>
      <AlertDescription>
        Department budget has been exhausted (${remaining.toFixed(2)} remaining). Total budget: ${budgetTotal.toFixed(2)} | Used: ${budgetUsed.toFixed(2)}. No more requisitions can be submitted.
      </AlertDescription>
    </Alert>
  );
};

export default BudgetWarning;
