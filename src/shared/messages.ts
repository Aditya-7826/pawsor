/** The one popup → content script message: "which site is this tab on?" */

export const HOSTNAME_REQUEST = { type: 'pawsor:hostname' } as const;

export interface HostnameResponse {
  hostname: string;
}

export function isHostnameRequest(msg: unknown): boolean {
  return (
    msg !== null &&
    typeof msg === 'object' &&
    (msg as { type?: unknown }).type === 'pawsor:hostname'
  );
}

export function isHostnameResponse(res: unknown): res is HostnameResponse {
  return (
    res !== null &&
    typeof res === 'object' &&
    typeof (res as { hostname?: unknown }).hostname === 'string'
  );
}
