export type LinuskuAccountType = 'user' | 'driver';

export function getLinuskuAccountType(
  appMetadata: Record<string, unknown> | null | undefined,
  assignedBusId: string | null
): LinuskuAccountType {
  return appMetadata?.linusku_account_type === 'driver' || assignedBusId
    ? 'driver'
    : 'user';
}
