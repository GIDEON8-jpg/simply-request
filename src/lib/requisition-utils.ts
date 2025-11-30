import { Requisition } from '@/types/requisition';

/**
 * Determines where a requisition is currently stuck in the approval chain.
 * This helps requisition owners understand what approver needs to act next.
 */
export const getStuckAt = (req: Requisition): string => {
  if (req.status === 'completed') return 'Completed';
  if (req.status === 'rejected') return 'Rejected';
  
  const usdAmount = req.currency === 'USD' ? req.amount : (req.usdConvertible || req.amount);
  
  // If pending, it's waiting for HOD approval
  if (req.status === 'pending') {
    return 'Awaiting HOD Approval';
  }
  
  // If approved_wait, it's on hold
  if (req.status === 'approved_wait') {
    return 'On Hold';
  }
  
  // If approved, check the approval chain based on amount
  if (req.status === 'approved') {
    // Check if it has been approved by HOD only (first level)
    // approvedBy contains "HOD" if approved by HOD
    if (!req.approvedBy || req.approvedBy.includes('HOD')) {
      // Route based on amount
      if (usdAmount <= 100) {
        return 'Awaiting Finance Manager';
      } else if (usdAmount <= 1000) {
        return 'Awaiting Technical Director';
      } else {
        return 'Awaiting CEO';
      }
    }
    
    // If approved by Finance Manager, Technical Director, or CEO, it's waiting for Accountant
    if (['Finance Manager', 'Technical Director', 'CEO'].includes(req.approvedBy)) {
      return 'Awaiting Accountant';
    }
    
    return 'Awaiting Accountant';
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
