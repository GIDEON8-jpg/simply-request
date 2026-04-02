import { Requisition } from '@/types/requisition';

/**
 * Determines where a requisition is currently stuck in the approval chain.
 * 
 * New flow: HOD → Deputy Finance Manager → Finance Manager → (amount-based: Tech Director/CEO) → Accountant
 */
export const getStuckAt = (req: Requisition): string => {
  if (req.status === 'completed') return 'Completed';
  if (req.status === 'rejected') return 'Rejected';
  
  // If pending, it's waiting for HOD approval
  if (req.status === 'pending') {
    return 'Awaiting HOD Approval';
  }
  
  // If approved_wait, it's on hold
  if (req.status === 'approved_wait') {
    return 'On Hold';
  }
  
  // If approved, check the approval chain
  if (req.status === 'approved') {
    const usdAmount = req.currency === 'USD' ? req.amount : (req.usdConvertible || req.amount);
    
    // After HOD approval, goes to Deputy Finance Manager first
    if (!req.approvedBy || req.approvedBy.includes('HOD')) {
      return 'Awaiting Deputy Finance Manager';
    }
    
    // After Deputy FM, goes to Finance Manager
    if (req.approvedBy === 'Deputy Finance Manager') {
      return 'Awaiting Finance Manager';
    }
    
    // After Finance Manager, route based on amount
    if (req.approvedBy === 'Finance Manager') {
      if (usdAmount <= 100) {
        return 'Awaiting Accountant';
      } else if (usdAmount <= 1000) {
        return 'Awaiting Technical Director';
      } else {
        return 'Awaiting CEO';
      }
    }
    
    // After Technical Director or CEO, goes to Accountant
    if (['Technical Director', 'CEO'].includes(req.approvedBy)) {
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
