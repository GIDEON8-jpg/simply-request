import { RequisitionStatus } from '@/types/requisition';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: RequisitionStatus;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const statusConfig = {
    pending: { label: 'Pending', className: 'status-pending' },
    approved: { label: 'Approved', className: 'status-approved' },
    approved_wait: { label: 'Approved but Wait', className: 'status-approved-wait' },
    completed: { label: 'Completed', className: 'status-completed' },
    rejected: { label: 'Rejected', className: 'status-rejected' },
  };

  const config = statusConfig[status];

  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
};

export default StatusBadge;
