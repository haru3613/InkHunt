import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// --- Mocks ---

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/lib/upload/client', () => ({
  uploadFile: vi.fn(),
}))

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ''} />
  ),
}))

// Stub lucide icons so test queries don't depend on SVG internals
vi.mock('lucide-react', () => ({
  ImagePlus: () => <svg data-testid="icon-image-plus" />,
  X: () => <svg data-testid="icon-x" />,
  Loader2: () => <svg data-testid="icon-loader" />,
}))

// --- Component imports (after mocks) ---
import { ReferenceImageUpload } from '../ReferenceImageUpload'
import { uploadFile } from '@/lib/upload/client'

const mockedUploadFile = vi.mocked(uploadFile)

// --- Helpers ---

function makeFile(
  name = 'photo.jpg',
  type = 'image/jpeg',
  sizeBytes = 1024,
): File {
  const content = new Uint8Array(sizeBytes)
  return new File([content], name, { type })
}

// --- Tests ---

describe('ReferenceImageUpload', () => {
  const onImagesChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('empty state rendering', () => {
    it('renders exactly maxSlots empty upload slots when no images are provided', () => {
      render(
        <ReferenceImageUpload images={[]} onImagesChange={onImagesChange} maxSlots={3} />,
      )

      // Each empty slot has aria-label="uploadImage" (translation key)
      const emptySlots = screen.getAllByRole('button', { name: 'uploadImage' })
      expect(emptySlots).toHaveLength(3)
    })

    it('respects a custom maxSlots value', () => {
      render(
        <ReferenceImageUpload images={[]} onImagesChange={onImagesChange} maxSlots={2} />,
      )

      const emptySlots = screen.getAllByRole('button', { name: 'uploadImage' })
      expect(emptySlots).toHaveLength(2)
    })

    it('defaults to 3 slots when maxSlots is not provided', () => {
      render(<ReferenceImageUpload images={[]} onImagesChange={onImagesChange} />)

      const emptySlots = screen.getAllByRole('button', { name: 'uploadImage' })
      expect(emptySlots).toHaveLength(3)
    })

    it('shows the upload label text on the first empty slot when no images exist', () => {
      render(<ReferenceImageUpload images={[]} onImagesChange={onImagesChange} />)

      // The first slot renders a visible "uploadImage" text span
      expect(screen.getByText('uploadImage')).toBeInTheDocument()
    })
  })

  describe('uploaded images', () => {
    it('renders an img element for each uploaded image', () => {
      const images = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
      ]
      render(
        <ReferenceImageUpload images={images} onImagesChange={onImagesChange} maxSlots={3} />,
      )

      const thumbnails = screen.getAllByRole('img')
      expect(thumbnails).toHaveLength(2)
      expect(thumbnails[0]).toHaveAttribute('src', images[0])
      expect(thumbnails[1]).toHaveAttribute('src', images[1])
    })

    it('renders one fewer empty slot for each uploaded image', () => {
      const images = ['https://example.com/img1.jpg']
      render(
        <ReferenceImageUpload images={images} onImagesChange={onImagesChange} maxSlots={3} />,
      )

      // 1 uploaded → 2 empty slots
      const emptySlots = screen.getAllByRole('button', { name: 'uploadImage' })
      expect(emptySlots).toHaveLength(2)
    })

    it('hides all empty slots when maxSlots images are already uploaded', () => {
      const images = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg',
      ]
      render(
        <ReferenceImageUpload images={images} onImagesChange={onImagesChange} maxSlots={3} />,
      )

      expect(screen.queryByRole('button', { name: 'uploadImage' })).not.toBeInTheDocument()
    })
  })

  describe('removing images', () => {
    it('calls onImagesChange with the image removed when remove button is clicked', async () => {
      const images = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
      ]
      render(
        <ReferenceImageUpload images={images} onImagesChange={onImagesChange} maxSlots={3} />,
      )

      const removeButtons = screen.getAllByRole('button', { name: 'removeImage' })
      expect(removeButtons).toHaveLength(2)

      await userEvent.click(removeButtons[0])

      expect(onImagesChange).toHaveBeenCalledOnce()
      expect(onImagesChange).toHaveBeenCalledWith(['https://example.com/img2.jpg'])
    })

    it('removes the correct image by index', async () => {
      const images = ['a.jpg', 'b.jpg', 'c.jpg']
      render(
        <ReferenceImageUpload images={images} onImagesChange={onImagesChange} maxSlots={3} />,
      )

      const removeButtons = screen.getAllByRole('button', { name: 'removeImage' })
      await userEvent.click(removeButtons[1]) // remove index 1

      expect(onImagesChange).toHaveBeenCalledWith(['a.jpg', 'c.jpg'])
    })
  })

  describe('file validation', () => {
    it('shows an error and does not upload when file type is not allowed', async () => {
      render(<ReferenceImageUpload images={[]} onImagesChange={onImagesChange} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const badFile = makeFile('document.pdf', 'application/pdf', 1024)
      fireEvent.change(fileInput, { target: { files: [badFile] } })

      await waitFor(() => {
        expect(screen.getByText('invalidImageType')).toBeInTheDocument()
      })
      expect(mockedUploadFile).not.toHaveBeenCalled()
      expect(onImagesChange).not.toHaveBeenCalled()
    })

    it('shows an error and does not upload when file exceeds 5 MB', async () => {
      render(<ReferenceImageUpload images={[]} onImagesChange={onImagesChange} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      // 5 MB + 1 byte
      const largeFile = makeFile('large.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)
      fireEvent.change(fileInput, { target: { files: [largeFile] } })

      await waitFor(() => {
        expect(screen.getByText('imageTooLarge')).toBeInTheDocument()
      })
      expect(mockedUploadFile).not.toHaveBeenCalled()
      expect(onImagesChange).not.toHaveBeenCalled()
    })

    it('accepts image/jpeg files without a validation error', async () => {
      mockedUploadFile.mockResolvedValue('https://cdn.example.com/uploaded.jpg')
      render(<ReferenceImageUpload images={[]} onImagesChange={onImagesChange} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const validFile = makeFile('photo.jpg', 'image/jpeg', 1024)
      fireEvent.change(fileInput, { target: { files: [validFile] } })

      await waitFor(() => {
        expect(screen.queryByText('invalidImageType')).not.toBeInTheDocument()
        expect(screen.queryByText('imageTooLarge')).not.toBeInTheDocument()
      })
    })

    it('accepts image/png files without a validation error', async () => {
      mockedUploadFile.mockResolvedValue('https://cdn.example.com/uploaded.png')
      render(<ReferenceImageUpload images={[]} onImagesChange={onImagesChange} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const validFile = makeFile('photo.png', 'image/png', 2048)
      fireEvent.change(fileInput, { target: { files: [validFile] } })

      await waitFor(() => {
        expect(screen.queryByText('invalidImageType')).not.toBeInTheDocument()
      })
    })

    it('accepts a file exactly at the 5 MB limit without a size error', async () => {
      mockedUploadFile.mockResolvedValue('https://cdn.example.com/exact.jpg')
      render(<ReferenceImageUpload images={[]} onImagesChange={onImagesChange} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const exactFile = makeFile('exact.jpg', 'image/jpeg', 5 * 1024 * 1024)
      fireEvent.change(fileInput, { target: { files: [exactFile] } })

      await waitFor(() => {
        expect(screen.queryByText('imageTooLarge')).not.toBeInTheDocument()
      })
    })
  })

  describe('upload flow', () => {
    it('calls uploadFile with bucket "inquiries" and the selected file', async () => {
      mockedUploadFile.mockResolvedValue('https://cdn.example.com/new.jpg')
      render(<ReferenceImageUpload images={[]} onImagesChange={onImagesChange} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = makeFile('tattoo-ref.jpg', 'image/jpeg', 2048)
      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(mockedUploadFile).toHaveBeenCalledWith('inquiries', file)
      })
    })

    it('calls onImagesChange with the new public URL appended after upload', async () => {
      const existingImages = ['https://cdn.example.com/existing.jpg']
      mockedUploadFile.mockResolvedValue('https://cdn.example.com/new.jpg')
      render(
        <ReferenceImageUpload
          images={existingImages}
          onImagesChange={onImagesChange}
          maxSlots={3}
        />,
      )

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = makeFile('new.jpg', 'image/jpeg', 512)
      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(onImagesChange).toHaveBeenCalledWith([
          'https://cdn.example.com/existing.jpg',
          'https://cdn.example.com/new.jpg',
        ])
      })
    })

    it('shows the loading spinner (Loader2 icon) during upload', async () => {
      // Upload that never resolves so we can observe the loading state
      mockedUploadFile.mockReturnValue(new Promise(() => {}))
      render(<ReferenceImageUpload images={[]} onImagesChange={onImagesChange} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = makeFile('loading.jpg', 'image/jpeg', 1024)
      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
      })
    })

    it('hides the loading spinner after upload completes', async () => {
      mockedUploadFile.mockResolvedValue('https://cdn.example.com/done.jpg')
      render(<ReferenceImageUpload images={[]} onImagesChange={onImagesChange} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = makeFile('done.jpg', 'image/jpeg', 1024)
      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument()
      })
    })

    it('shows uploadFailed error and hides spinner when upload throws', async () => {
      mockedUploadFile.mockRejectedValue(new Error('Storage error'))
      render(<ReferenceImageUpload images={[]} onImagesChange={onImagesChange} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = makeFile('fail.jpg', 'image/jpeg', 1024)
      fireEvent.change(fileInput, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText('uploadFailed')).toBeInTheDocument()
        expect(screen.queryByTestId('icon-loader')).not.toBeInTheDocument()
      })
      expect(onImagesChange).not.toHaveBeenCalled()
    })
  })

  describe('error dismissal', () => {
    it('clears a previous error when a valid file is selected after a bad one', async () => {
      mockedUploadFile.mockResolvedValue('https://cdn.example.com/ok.jpg')
      render(<ReferenceImageUpload images={[]} onImagesChange={onImagesChange} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement

      // First: bad file
      const badFile = makeFile('bad.pdf', 'application/pdf', 512)
      fireEvent.change(fileInput, { target: { files: [badFile] } })

      await waitFor(() => {
        expect(screen.getByText('invalidImageType')).toBeInTheDocument()
      })

      // Then: valid file
      const goodFile = makeFile('good.jpg', 'image/jpeg', 512)
      fireEvent.change(fileInput, { target: { files: [goodFile] } })

      await waitFor(() => {
        expect(screen.queryByText('invalidImageType')).not.toBeInTheDocument()
      })
    })
  })
})
