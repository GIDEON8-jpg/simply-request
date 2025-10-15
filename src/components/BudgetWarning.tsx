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

  if (remaining > 0 && budgetUsed < budgetTotal) return null;

  return (
    <Alert variant={remaining <= 0 ? 'destructive' : 'default'} className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {remaining <= 0 ? 'Budget Exhausted!' : 'Budget Warning'}
      </AlertTitle>
      <AlertDescription>
        {remaining <= 0 
          ? `Department budget has been exhausted. Total budget: $${budgetTotal.toFixed(2)} | Used: $${budgetUsed.toFixed(2)} | Remaining: $${remaining.toFixed(2)}. No more requisitions can be submitted.`
          : `Budget: $${budgetTotal.toFixed(2)} | Used: $${budgetUsed.toFixed(2)} | Remaining: $${remaining.toFixed(2)}`
        }
      </AlertDescription>
    </Alert>
  );
};

export default BudgetWarning;
