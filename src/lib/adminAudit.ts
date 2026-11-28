import type { AdminClient } from '@/lib/adminAuth';

interface AdminAuditAction {
  adminId: string;
  action: string;
  targetTable: string;
  targetId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export async function logAdminAction(
  client: AdminClient,
  entry: AdminAuditAction
): Promise<void> {
  const { error } = await client.rpc('log_admin_action', {
    p_admin_id: entry.adminId,
    p_action: entry.action,
    p_target_table: entry.targetTable,
    p_target_id: entry.targetId,
    p_old_value: entry.oldValue,
    p_new_value: entry.newValue,
    p_ip_address: entry.ipAddress,
    p_user_agent: entry.userAgent,
  });

  if (error) {
    console.error(`[admin-audit] ${entry.action} could not be recorded: ${error.message}`);
  }
}

export function getAdminRequestMetadata(request: Request) {
  return {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: request.headers.get('user-agent') ?? null,
  };
}
