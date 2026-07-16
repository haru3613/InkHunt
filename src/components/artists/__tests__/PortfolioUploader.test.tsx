import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PortfolioUploader } from '../PortfolioUploader'

const { uploadFile } = vi.hoisted(() => ({
  uploadFile: vi.fn<(bucket: string, file: File) => Promise<string>>(),
}))

vi.mock('@/lib/upload/client', () => ({
  uploadFile,
}))

describe('PortfolioUploader', () => {
  beforeEach(() => {
    uploadFile.mockReset()
  })

  it('uploads selected files and calls onUpload with fulfilled urls', async () => {
    uploadFile
      .mockResolvedValueOnce('https://cdn.example/a.jpg')
      .mockResolvedValueOnce('https://cdn.example/b.jpg')
    const onUpload = vi.fn()
    const user = userEvent.setup()

    render(<PortfolioUploader onUpload={onUpload} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()

    const f1 = new File(['a'], 'a.jpg', { type: 'image/jpeg' })
    const f2 = new File(['b'], 'b.jpg', { type: 'image/jpeg' })
    await user.upload(input, [f1, f2])

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith([
        'https://cdn.example/a.jpg',
        'https://cdn.example/b.jpg',
      ])
    })
    expect(uploadFile).toHaveBeenCalledTimes(2)
    expect(uploadFile).toHaveBeenCalledWith('portfolio', f1)
  })

  it('ignores failed uploads and skips onUpload when all fail', async () => {
    uploadFile.mockRejectedValue(new Error('fail'))
    const onUpload = vi.fn()
    const user = userEvent.setup()

    render(<PortfolioUploader onUpload={onUpload} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File(['x'], 'x.jpg', { type: 'image/jpeg' }))

    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalled()
    })
    expect(onUpload).not.toHaveBeenCalled()
  })

  it('disables the button when disabled prop is true', () => {
    render(<PortfolioUploader onUpload={vi.fn()} disabled />)
    expect(screen.getByRole('button', { name: /上傳作品/ })).toBeDisabled()
  })
})
