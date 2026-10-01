const PROTECTED_PREFIX = '/api/media/inquiries/'
const PUBLIC_STORAGE_MARKER = '/storage/v1/object/public/inquiries/'
const STORAGE_MARKER = '/storage/v1/object/inquiries/'
const OWNER_SEGMENT = /^[A-Za-z0-9_-]{1,128}$/
const OBJECT_SEGMENT = /^[A-Za-z0-9_-]{1,180}\.(?:jpe?g|png|webp)$/i

function decodeSegment(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

/** Parse only an InkHunt protected media URL or a legacy Supabase inquiry URL.
 * Arbitrary URL query targets are never accepted. */
export function parseInquiryMediaPath(value: string): string | null {
  let pathname: string
  try {
    pathname = value.startsWith('/') ? new URL(value, 'https://inkhunt.invalid').pathname : new URL(value).pathname
  } catch {
    return null
  }

  const marker = pathname.startsWith(PROTECTED_PREFIX)
    ? PROTECTED_PREFIX
    : pathname.startsWith(PUBLIC_STORAGE_MARKER)
      ? PUBLIC_STORAGE_MARKER
      : pathname.startsWith(STORAGE_MARKER)
        ? STORAGE_MARKER
        : null
  if (!marker) return null

  const rawPath = pathname.slice(marker.length)
  const rawSegments = rawPath.split('/')
  if (rawSegments.length !== 2) return null

  const owner = decodeSegment(rawSegments[0])
  const object = decodeSegment(rawSegments[1])
  if (!owner || !object || !OWNER_SEGMENT.test(owner) || !OBJECT_SEGMENT.test(object)) return null
  return `${owner}/${object}`
}

export function buildProtectedInquiryMediaUrl(path: string): string {
  const parsed = parseInquiryMediaPath(`${PROTECTED_PREFIX}${path}`)
  if (!parsed) throw new Error('Invalid inquiry media path')
  return `${PROTECTED_PREFIX}${parsed.split('/').map(encodeURIComponent).join('/')}`
}

/** Convert legacy public inquiry Storage URLs to the authenticated app endpoint. */
export function toProtectedInquiryMediaUrl(value: string): string {
  const path = parseInquiryMediaPath(value)
  return path ? buildProtectedInquiryMediaUrl(path) : value
}

/** New writes may only attach an object created under the caller's opaque Auth UID. */
export function isOwnedInquiryMediaUrl(value: string, supabaseId: string): boolean {
  // New writes use only our canonical relative endpoint. Legacy public URLs
  // remain readable, but cannot be re-attached by a client.
  if (!value.startsWith(PROTECTED_PREFIX)) return false
  const path = parseInquiryMediaPath(value)
  return path !== null && path.split('/')[0] === supabaseId
}
