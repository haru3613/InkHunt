import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadFile } from '../client'

const SIGNED_URL = 'https://storage.example.com/upload?token=abc'
const PUBLIC_URL = 'https://cdn.example.com/portfolio/test.jpg'

function makeSignedUrlResponse(ok: boolean) {
  return {
    ok,
    json: vi.fn().mockResolvedValue({ signed_url: SIGNED_URL, public_url: PUBLIC_URL }),
  }
}

function makePutResponse() {
  return { ok: true }
}

describe('uploadFile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    global.fetch = vi.fn()
  })

  it('throws when file exceeds 10 MB', async () => {
    const file = new File(['content'], 'large.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })

    await expect(uploadFile('portfolio', file)).rejects.toThrow(
      'File too large: large.jpg (max 10 MB)',
    )
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('happy path: calls signed-url endpoint, then PUT to signed URL, returns public_url', async () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeSignedUrlResponse(true))
      .mockResolvedValueOnce(makePutResponse())
    global.fetch = fetchMock

    const result = await uploadFile('portfolio', file)

    expect(result).toBe(PUBLIC_URL)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/upload/signed-url')
    expect(fetchMock.mock.calls[1][0]).toBe(SIGNED_URL)
  })

  it('throws when signed-url endpoint returns non-ok response', async () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    vi.mocked(global.fetch).mockResolvedValueOnce(makeSignedUrlResponse(false) as never)

    await expect(uploadFile('portfolio', file)).rejects.toThrow('Failed to get upload URL')
  })

  it('passes correct bucket, filename, content_type in signed-url request body', async () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeSignedUrlResponse(true))
      .mockResolvedValueOnce(makePutResponse())
    global.fetch = fetchMock

    await uploadFile('inquiries', file)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/upload/signed-url')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({
      bucket: 'inquiries',
      filename: 'test.jpg',
      content_type: 'image/jpeg',
    })
  })

  it('uses correct Content-Type header in PUT request', async () => {
    const file = new File(['content'], 'test.png', { type: 'image/png' })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeSignedUrlResponse(true))
      .mockResolvedValueOnce(makePutResponse())
    global.fetch = fetchMock

    await uploadFile('portfolio', file)

    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe(SIGNED_URL)
    expect(init.method).toBe('PUT')
    expect(init.headers).toEqual({ 'Content-Type': 'image/png' })
    expect(init.body).toBe(file)
  })
})
