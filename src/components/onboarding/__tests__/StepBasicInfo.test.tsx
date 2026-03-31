import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepBasicInfo, BasicInfoData } from '../StepBasicInfo'

const emptyData: BasicInfoData = {
  display_name: '',
  ig_handle: '',
  bio: '',
}

const filledData: BasicInfoData = {
  display_name: 'Ink by Ray',
  ig_handle: 'inkbyray',
  bio: '專精極簡線條刺青，台北大安區工作室',
}

describe('StepBasicInfo', () => {
  let onChange: ReturnType<typeof vi.fn>
  let onNext: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onChange = vi.fn()
    onNext = vi.fn()
  })

  it('renders all three input fields', () => {
    render(<StepBasicInfo data={emptyData} onChange={onChange} onNext={onNext} />)

    expect(screen.getByPlaceholderText('例：Ink by Ray')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('your_handle')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('描述你的刺青風格、理念或經歷...')).toBeInTheDocument()
  })

  it('Next button disabled when display_name is empty', () => {
    render(<StepBasicInfo data={emptyData} onChange={onChange} onNext={onNext} />)

    const nextBtn = screen.getByRole('button', { name: '下一步' })
    expect(nextBtn).toBeDisabled()
  })

  it('Next button enabled when display_name has value', () => {
    render(<StepBasicInfo data={filledData} onChange={onChange} onNext={onNext} />)

    const nextBtn = screen.getByRole('button', { name: '下一步' })
    expect(nextBtn).not.toBeDisabled()
  })

  it('Next button disabled when display_name is only whitespace', () => {
    render(
      <StepBasicInfo
        data={{ ...emptyData, display_name: '   ' }}
        onChange={onChange}
        onNext={onNext}
      />,
    )

    const nextBtn = screen.getByRole('button', { name: '下一步' })
    expect(nextBtn).toBeDisabled()
  })

  it('calls onChange with updated display_name on input change', () => {
    render(<StepBasicInfo data={emptyData} onChange={onChange} onNext={onNext} />)

    fireEvent.change(screen.getByPlaceholderText('例：Ink by Ray'), {
      target: { value: 'New Artist' },
    })

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      display_name: 'New Artist',
      ig_handle: '',
      bio: '',
    })
  })

  it('calls onChange with updated ig_handle on input change', () => {
    render(<StepBasicInfo data={emptyData} onChange={onChange} onNext={onNext} />)

    fireEvent.change(screen.getByPlaceholderText('your_handle'), {
      target: { value: 'my_handle' },
    })

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      display_name: '',
      ig_handle: 'my_handle',
      bio: '',
    })
  })

  it('calls onChange with updated bio on textarea change', () => {
    render(<StepBasicInfo data={emptyData} onChange={onChange} onNext={onNext} />)

    fireEvent.change(screen.getByPlaceholderText('描述你的刺青風格、理念或經歷...'), {
      target: { value: '我是刺青師' },
    })

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      display_name: '',
      ig_handle: '',
      bio: '我是刺青師',
    })
  })

  it('calls onNext when Next button clicked', () => {
    render(<StepBasicInfo data={filledData} onChange={onChange} onNext={onNext} />)

    fireEvent.click(screen.getByRole('button', { name: '下一步' }))

    expect(onNext).toHaveBeenCalledOnce()
  })

  it('does not call onNext when Next button is disabled and clicked', () => {
    render(<StepBasicInfo data={emptyData} onChange={onChange} onNext={onNext} />)

    fireEvent.click(screen.getByRole('button', { name: '下一步' }))

    expect(onNext).not.toHaveBeenCalled()
  })

  it('prefills fields from data prop', () => {
    render(<StepBasicInfo data={filledData} onChange={onChange} onNext={onNext} />)

    expect(screen.getByDisplayValue('Ink by Ray')).toBeInTheDocument()
    expect(screen.getByDisplayValue('inkbyray')).toBeInTheDocument()
    expect(screen.getByDisplayValue('專精極簡線條刺青，台北大安區工作室')).toBeInTheDocument()
  })
})
