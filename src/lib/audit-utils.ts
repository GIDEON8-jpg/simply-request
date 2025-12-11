import { supabase } from '@/integrations/supabase/client';

export type AuditActionType = 'login' | 'logout' | 'approve' | 'reject' | 'on_hold' | 'submit' | 'payment';

export interface AuditLogEntry {
  user_id: string;
  user_name: string;
  action_type: AuditActionType;
  requisition_id?: string;
  details?: string;
}

export const logAuditEvent = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: entry.user_id,
        user_name: entry.user_name,
        action_type: entry.action_type,
        requisition_id: entry.requisition_id || null,
        details: entry.details || null,
      });

    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (err) {
    console.error('Error logging audit event:', err);
  }
};
