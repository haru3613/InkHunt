import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepPortfolio, PortfolioData } from '../StepPortfolio'

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; sizes?: string }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    const { fill: _fill, sizes: _sizes, ...rest } = props
    return <img {...rest} />
  },
}))

// URL.createObjectURL is not available in jsdom
const mockObjectUrl = 'blob:http://localhost/mock-url'
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => mockObjectUrl),
  revokeObjectURL: vi.fn(),
})

function makeImageFile(name: string): File {
  return new File(['data'], name, { type: 'image/jpeg' })
}

const emptyData: PortfolioData = {
  files: [],
  previewUrls: [],
}

const dataWithImages: PortfolioData = {
  files: [makeImageFile('work1.jpg'), makeImageFile('work2.jpg')],
  previewUrls: ['blob:mock-url-1', 'blob:mock-url-2'],
}

describe('StepPortfolio', () => {
  let onChange: ReturnType<typeof vi.fn>
  let onSubmit: ReturnType<typeof vi.fn>
  let onSkip: ReturnType<typeof vi.fn>
  let onBack: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onChange = vi.fn()
    onSubmit = vi.fn()
    onSkip = vi.fn()
    onBack = vi.fn()
  })

  it('renders drop zone area', () => {
    render(
      <StepPortfolio
        data={emptyData}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={false}
      />,
    )

    expect(screen.getByText(/拖拉圖片至此/)).toBeInTheDocument()
    expect(screen.getByText(/點擊選擇/)).toBeInTheDocument()
  })

  it('shows submit and skip buttons', () => {
    render(
      <StepPortfolio
        data={emptyData}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={false}
      />,
    )

    expect(screen.getByRole('button', { name: '送出審核' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '跳過' })).toBeInTheDocument()
  })

  it('submit button shows 送出審核 when not submitting', () => {
    render(
      <StepPortfolio
        data={emptyData}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={false}
      />,
    )

    expect(screen.getByRole('button', { name: '送出審核' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '送出中...' })).not.toBeInTheDocument()
  })

  it('submit button shows 送出中... when isSubmitting', () => {
    render(
      <StepPortfolio
        data={emptyData}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={true}
      />,
    )

    expect(screen.getByRole('button', { name: '送出中...' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '送出審核' })).not.toBeInTheDocument()
  })

  it('all buttons disabled when isSubmitting', () => {
    render(
      <StepPortfolio
        data={emptyData}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={true}
      />,
    )

    expect(screen.getByRole('button', { name: '送出中...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '跳過' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '上一步' })).toBeDisabled()
  })

  it('all buttons enabled when not submitting', () => {
    render(
      <StepPortfolio
        data={emptyData}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={false}
      />,
    )

    expect(screen.getByRole('button', { name: '送出審核' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: '跳過' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: '上一步' })).not.toBeDisabled()
  })

  it('calls onSubmit when submit button clicked', () => {
    render(
      <StepPortfolio
        data={emptyData}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '送出審核' }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('calls onSkip when skip button clicked', () => {
    render(
      <StepPortfolio
        data={emptyData}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '跳過' }))

    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('calls onBack when back button clicked', () => {
    render(
      <StepPortfolio
        data={emptyData}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '上一步' }))

    expect(onBack).toHaveBeenCalledOnce()
  })

  it('does not call onSubmit when isSubmitting and submit clicked', () => {
    render(
      <StepPortfolio
        data={emptyData}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={true}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '送出中...' }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('adding image files via input triggers onChange with new files in preview grid', () => {
    const { container } = render(
      <StepPortfolio
        data={emptyData}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={false}
      />,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = makeImageFile('tattoo.jpg')

    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(onChange).toHaveBeenCalledOnce()
    const callArg = onChange.mock.calls[0][0] as PortfolioData
    expect(callArg.files).toHaveLength(1)
    expect(callArg.files[0]).toBe(file)
    expect(callArg.previewUrls).toHaveLength(1)
    expect(callArg.previewUrls[0]).toBe(mockObjectUrl)
  })

  it('non-image files are filtered out when added via input', () => {
    const { container } = render(
      <StepPortfolio
        data={emptyData}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={false}
      />,
    )

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const pdfFile = new File(['data'], 'doc.pdf', { type: 'application/pdf' })

    fireEvent.change(fileInput, { target: { files: [pdfFile] } })

    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows preview images when previewUrls are provided', () => {
    render(
      <StepPortfolio
        data={dataWithImages}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={false}
      />,
    )

    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(2)
    expect(images[0]).toHaveAttribute('src', 'blob:mock-url-1')
    expect(images[1]).toHaveAttribute('src', 'blob:mock-url-2')
  })

  it('remove button calls onChange without the removed file', () => {
    render(
      <StepPortfolio
        data={dataWithImages}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={false}
      />,
    )

    // Remove buttons are rendered as ✕ characters
    const removeButtons = screen.getAllByRole('button', { name: /\u2715/ })
    // Click first remove button (index 0)
    fireEvent.click(removeButtons[0])

    expect(onChange).toHaveBeenCalledOnce()
    const callArg = onChange.mock.calls[0][0] as PortfolioData
    expect(callArg.files).toHaveLength(1)
    expect(callArg.files[0]).toBe(dataWithImages.files[1])
    expect(callArg.previewUrls).toHaveLength(1)
    expect(callArg.previewUrls[0]).toBe('blob:mock-url-2')
  })

  it('remove button calls onChange without the second file when second is removed', () => {
    render(
      <StepPortfolio
        data={dataWithImages}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={false}
      />,
    )

    const removeButtons = screen.getAllByRole('button', { name: /\u2715/ })
    // Click second remove button (index 1)
    fireEvent.click(removeButtons[1])

    expect(onChange).toHaveBeenCalledOnce()
    const callArg = onChange.mock.calls[0][0] as PortfolioData
    expect(callArg.files).toHaveLength(1)
    expect(callArg.files[0]).toBe(dataWithImages.files[0])
    expect(callArg.previewUrls).toHaveLength(1)
    expect(callArg.previewUrls[0]).toBe('blob:mock-url-1')
  })

  it('preview grid is not rendered when there are no images', () => {
    render(
      <StepPortfolio
        data={emptyData}
        onChange={onChange}
        onSubmit={onSubmit}
        onSkip={onSkip}
        onBack={onBack}
        isSubmitting={false}
      />,
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
