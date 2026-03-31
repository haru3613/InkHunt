import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepStylePicker, StylePickerData } from '../StepStylePicker'

vi.mock('../StyleCard', () => ({
  StyleCard: ({ name, selected, onToggle }: { name: string; selected: boolean; onToggle: () => void }) => (
    <button
      data-testid={`style-${name}`}
      data-selected={selected}
      onClick={onToggle}
    >
      {name}
    </button>
  ),
}))

const emptyData: StylePickerData = {
  selectedSlugs: [],
  canCover: false,
  acceptCustom: false,
  hasFlashDesigns: false,
}

const oneSelectedData: StylePickerData = {
  selectedSlugs: ['fine-line'],
  canCover: false,
  acceptCustom: false,
  hasFlashDesigns: false,
}

const fiveSelectedData: StylePickerData = {
  selectedSlugs: ['fine-line', 'micro', 'realism', 'floral', 'blackwork'],
  canCover: false,
  acceptCustom: false,
  hasFlashDesigns: false,
}

describe('StepStylePicker', () => {
  let onChange: (data: StylePickerData) => void
  let onNext: () => void
  let onBack: () => void

  beforeEach(() => {
    onChange = vi.fn() as unknown as (data: StylePickerData) => void
    onNext = vi.fn() as unknown as () => void
    onBack = vi.fn() as unknown as () => void
  })

  it('renders all style groups', () => {
    render(
      <StepStylePicker data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    expect(screen.getByText('熱門風格')).toBeInTheDocument()
    expect(screen.getByText('經典風格')).toBeInTheDocument()
    expect(screen.getByText('藝術風格')).toBeInTheDocument()
    expect(screen.getByText('特殊分類')).toBeInTheDocument()
  })

  it('renders style cards for each group', () => {
    render(
      <StepStylePicker data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    expect(screen.getByTestId('style-極簡線條')).toBeInTheDocument()
    expect(screen.getByTestId('style-日式傳統')).toBeInTheDocument()
    expect(screen.getByTestId('style-水彩')).toBeInTheDocument()
    expect(screen.getByTestId('style-字體')).toBeInTheDocument()
  })

  it('clicking style calls onChange with updated selectedSlugs', () => {
    render(
      <StepStylePicker data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    fireEvent.click(screen.getByTestId('style-極簡線條'))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      ...emptyData,
      selectedSlugs: ['fine-line'],
    })
  })

  it('max 5 styles: prevents selection beyond 5', () => {
    render(
      <StepStylePicker
        data={fiveSelectedData}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    // Clicking a 6th style (anime is not in fiveSelectedData) should not call onChange
    fireEvent.click(screen.getByTestId('style-漫畫/動漫'))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('deselecting a style removes it from selectedSlugs', () => {
    render(
      <StepStylePicker
        data={oneSelectedData}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    // fine-line is already selected — clicking it again should deselect
    fireEvent.click(screen.getByTestId('style-極簡線條'))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      ...oneSelectedData,
      selectedSlugs: [],
    })
  })

  it('Next button disabled when no styles selected', () => {
    render(
      <StepStylePicker data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    expect(screen.getByRole('button', { name: '下一步' })).toBeDisabled()
  })

  it('Next button enabled when at least 1 style selected', () => {
    render(
      <StepStylePicker
        data={oneSelectedData}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    expect(screen.getByRole('button', { name: '下一步' })).not.toBeDisabled()
  })

  it('canCover toggle switch calls onChange with toggled value', () => {
    render(
      <StepStylePicker data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    fireEvent.click(screen.getByRole('switch', { name: /可做遮蓋/ }))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      ...emptyData,
      canCover: true,
    })
  })

  it('acceptCustom toggle switch calls onChange with toggled value', () => {
    render(
      <StepStylePicker data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    fireEvent.click(screen.getByRole('switch', { name: /接受客製設計/ }))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      ...emptyData,
      acceptCustom: true,
    })
  })

  it('hasFlashDesigns toggle switch calls onChange with toggled value', () => {
    render(
      <StepStylePicker data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    fireEvent.click(screen.getByRole('switch', { name: /有現成圖案/ }))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      ...emptyData,
      hasFlashDesigns: true,
    })
  })

  it('toggle switch turns off when currently enabled', () => {
    const dataWithToggles: StylePickerData = {
      ...emptyData,
      canCover: true,
    }
    render(
      <StepStylePicker
        data={dataWithToggles}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    fireEvent.click(screen.getByRole('switch', { name: /可做遮蓋/ }))

    expect(onChange).toHaveBeenCalledWith({
      ...dataWithToggles,
      canCover: false,
    })
  })

  it('Back button calls onBack', () => {
    render(
      <StepStylePicker data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '上一步' }))

    expect(onBack).toHaveBeenCalledOnce()
  })

  it('selected style card receives data-selected=true', () => {
    render(
      <StepStylePicker
        data={oneSelectedData}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    const selectedCard = screen.getByTestId('style-極簡線條')
    expect(selectedCard).toHaveAttribute('data-selected', 'true')
  })

  it('unselected style card receives data-selected=false', () => {
    render(
      <StepStylePicker
        data={oneSelectedData}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    const unselectedCard = screen.getByTestId('style-微刺青')
    expect(unselectedCard).toHaveAttribute('data-selected', 'false')
  })
})
