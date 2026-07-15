/**
 * Auth public surface.
 * - identity / admin: Edge-safe pure policy
 * - session: Node current/require/requireAdmin
 * - helpers: re-exports + domain (getArtistForUser, handleApiError, …)
 */
export type { AuthUser } from '@/lib/auth/identity'
export { buildAppMetadata, extractAuthUser } from '@/lib/auth/identity'
export { isAdmin, isAdminPath, isProtectedArtistPath, withLocalePrefix } from '@/lib/auth/admin'
export {
  current,
  getCurrentUser,
  requireAuth,
  requireAdmin,
} from '@/lib/auth/session'
export {
  getArtistForUser,
  handleApiError,
  authorizeInquiryAccess,
} from '@/lib/auth/helpers'
