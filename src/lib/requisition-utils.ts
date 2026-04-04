import { Requisition } from '@/types/requisition';

type ApprovalRoutingSnapshot = Pick<Requisition, 'status' | 'currency' | 'amount' | 'usdConvertible' | 'approvedByRole' | 'approvedBy'>;

const getUsdAmount = (req: ApprovalRoutingSnapshot): number => {
  return req.currency === 'USD' ? req.amount : (req.usdConvertible || req.amount);
};

export const getNextApprovalRole = (req: ApprovalRoutingSnapshot): string | null => {
  if (req.status !== 'approved') return null;

  const usdAmount = getUsdAmount(req);
  const role = req.approvedByRole;

  if (role) {
    if (role === 'hod' || role === 'preparer' || role === 'hr' || role === 'ceo_self' || role === 'technical_director_self' || role === 'finance_manager_self') {
      return 'deputy_finance_manager';
    }
    if (role === 'deputy_finance_manager') {
      return 'finance_manager';
    }
    if (role === 'finance_manager') {
      if (usdAmount <= 100) return 'accountant';
      if (usdAmount <= 1000) return 'technical_director';
      return 'ceo';
    }
    if (role === 'technical_director' || role === 'ceo') {
      return 'accountant';
    }
    return 'accountant';
  }

  if (!req.approvedBy || req.approvedBy.includes('HOD')) {
    return 'deputy_finance_manager';
  }
  if (req.approvedBy === 'Deputy Finance Manager') {
    return 'finance_manager';
  }
  if (req.approvedBy === 'Finance Manager') {
    if (usdAmount <= 100) return 'accountant';
    if (usdAmount <= 1000) return 'technical_director';
    return 'ceo';
  }
  if (['Technical Director', 'CEO'].includes(req.approvedBy)) {
    return 'accountant';
  }

  return 'deputy_finance_manager';
};

const APPROVAL_STAGE_LABELS: Record<string, string> = {
  deputy_finance_manager: 'Awaiting Deputy Finance Manager',
  finance_manager: 'Awaiting Finance Manager',
  technical_director: 'Awaiting Technical Director',
  ceo: 'Awaiting CEO',
  accountant: 'Awaiting Accountant',
};

/**
 * Determines where a requisition is currently stuck in the approval chain.
 * 
 * New flow: HOD → Deputy Finance Manager → Finance Manager → (amount-based: Tech Director/CEO) → Accountant
 * Uses approvedByRole for reliable role-based routing.
 */
export const getStuckAt = (req: Requisition): string => {
  if (req.status === 'completed') return 'Completed';
  if (req.status === 'rejected') return 'Rejected';
  
  if (req.status === 'pending') {
    return 'Awaiting HOD Approval';
  }
  
  if (req.status === 'approved_wait') {
    return 'On Hold';
  }
  
  if (req.status === 'approved') {
    const nextRole = getNextApprovalRole(req);
    return nextRole ? APPROVAL_STAGE_LABELS[nextRole] || 'Awaiting Accountant' : 'Awaiting Deputy Finance Manager';
  }
  
  return 'Unknown';
};

/**
 * Returns the appropriate CSS class for the "stuck at" badge based on the status
 */
export const getStuckAtBadgeClass = (stuckAt: string): string => {
  switch (stuckAt) {
    case 'Completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Rejected':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'On Hold':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  }
};
