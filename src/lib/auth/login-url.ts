/**
 * Builds the LINE OAuth entry URL. Single source for the `redirect` param
 * shape — used by the client-side `useAuth.loginWithRedirect` and by server
 * components that render plain login links (e.g. /favorites).
 */
export function lineLoginUrl(redirectTo?: string): string {
  const params = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''
  return `/api/auth/line${params}`
}
