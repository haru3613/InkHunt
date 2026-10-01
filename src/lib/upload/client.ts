const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_INQUIRY_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export async function uploadFile(
  bucket: 'portfolio' | 'inquiries' | 'avatars',
  file: File,
): Promise<string> {
  const maximum = bucket === 'inquiries' ? MAX_INQUIRY_FILE_SIZE : MAX_FILE_SIZE
  if (file.size > maximum) {
    throw new Error(`File too large: ${file.name} (max ${maximum / 1024 / 1024} MB)`)
  }

  const res = await fetch('/api/upload/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bucket,
      filename: file.name,
      content_type: file.type,
      file_size: file.size,
    }),
  })

  if (!res.ok) {
    throw new Error('Failed to get upload URL')
  }

  const { signed_url, public_url, publicUrl } = await res.json()

  const putRes = await fetch(signed_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })

  if (!putRes.ok) {
    throw new Error(`Failed to upload file: ${file.name} (${putRes.status})`)
  }

  return publicUrl ?? public_url
}
