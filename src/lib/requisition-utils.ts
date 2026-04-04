import { Requisition } from '@/types/requisition';

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
    const usdAmount = req.currency === 'USD' ? req.amount : (req.usdConvertible || req.amount);
    const role = req.approvedByRole;
    
    // Use role-based routing when available
    if (role) {
      if (role === 'hod' || role === 'preparer' || role === 'hr' || role === 'ceo_self' || role === 'technical_director_self' || role === 'finance_manager_self') {
        return 'Awaiting Deputy Finance Manager';
      }
      if (role === 'deputy_finance_manager') {
        return 'Awaiting Finance Manager';
      }
      if (role === 'finance_manager') {
        if (usdAmount <= 100) {
          return 'Awaiting Accountant';
        } else if (usdAmount <= 1000) {
          return 'Awaiting Technical Director';
        } else {
          return 'Awaiting CEO';
        }
      }
      if (role === 'technical_director' || role === 'ceo') {
        return 'Awaiting Accountant';
      }
      return 'Awaiting Accountant';
    }
    
    // Fallback: name-based matching for old data without approvedByRole
    if (!req.approvedBy || req.approvedBy.includes('HOD')) {
      return 'Awaiting Deputy Finance Manager';
    }
    if (req.approvedBy === 'Deputy Finance Manager') {
      return 'Awaiting Finance Manager';
    }
    if (req.approvedBy === 'Finance Manager') {
      if (usdAmount <= 100) {
        return 'Awaiting Accountant';
      } else if (usdAmount <= 1000) {
        return 'Awaiting Technical Director';
      } else {
        return 'Awaiting CEO';
      }
    }
    if (['Technical Director', 'CEO'].includes(req.approvedBy)) {
      return 'Awaiting Accountant';
    }
    
    return 'Awaiting Deputy Finance Manager';
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
