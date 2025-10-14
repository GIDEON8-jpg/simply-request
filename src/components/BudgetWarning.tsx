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
    .filter(r => r.department === department && (r.status === 'approved' || r.status === 'completed'))
    .reduce((sum, r) => sum + r.amount, 0);
  
  const remaining = budgetTotal - budgetUsed;
  const percentage = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0;

  if (percentage < 80) return null;

  return (
    <Alert variant={percentage >= 100 ? 'destructive' : 'default'} className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {percentage >= 100 ? 'Budget Exhausted!' : 'Budget Warning'}
      </AlertTitle>
      <AlertDescription>
        {percentage >= 100 
          ? `Department budget has been exhausted. Used: $${budgetUsed.toFixed(2)} of $${budgetTotal.toFixed(2)}. No more requisitions can be submitted.`
          : `You have used ${percentage.toFixed(1)}% of your department budget ($${budgetUsed.toFixed(2)} of $${budgetTotal.toFixed(2)}). Remaining: $${remaining.toFixed(2)}.`
        }
      </AlertDescription>
    </Alert>
  );
};

export default BudgetWarning;
