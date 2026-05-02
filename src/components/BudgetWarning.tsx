import { Department } from '@/types/requisition';

interface BudgetWarningProps {
  department: Department;
}

// Budget enforcement has been removed. Requisitions are no longer blocked
// by department budgets — Finance/Accounts will review spend manually.
// This component is intentionally a no-op so existing imports keep working.
const BudgetWarning = (_props: BudgetWarningProps) => null;

export default BudgetWarning;
