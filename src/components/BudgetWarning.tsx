import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BudgetWarningProps {
  budgetUsed: number;
  budgetTotal: number;
}

const BudgetWarning = ({ budgetUsed, budgetTotal }: BudgetWarningProps) => {
  const percentage = (budgetUsed / budgetTotal) * 100;

  if (percentage < 80) return null;

  return (
    <Alert variant={percentage >= 100 ? 'destructive' : 'default'} className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {percentage >= 100 ? 'Budget Exceeded!' : 'Budget Warning'}
      </AlertTitle>
      <AlertDescription>
        {percentage >= 100 
          ? `You have exceeded your monthly budget by $${(budgetUsed - budgetTotal).toFixed(2)}. This requisition cannot be approved without additional budget allocation.`
          : `You have used ${percentage.toFixed(1)}% of your monthly budget ($${budgetUsed.toFixed(2)} of $${budgetTotal.toFixed(2)}). Please review before submitting.`
        }
      </AlertDescription>
    </Alert>
  );
};

export default BudgetWarning;
