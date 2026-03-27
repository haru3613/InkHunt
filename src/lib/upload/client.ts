const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function uploadFile(
  bucket: 'portfolio' | 'inquiries',
  file: File,
): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${file.name} (max 10 MB)`)
  }

  const res = await fetch('/api/upload/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket, filename: file.name, content_type: file.type }),
  })

  if (!res.ok) {
    throw new Error('Failed to get upload URL')
  }

  const { signed_url, public_url } = await res.json()

  await fetch(signed_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })

  return public_url
}
