import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StepPriceLocation, PriceLocationData } from '../StepPriceLocation'

const emptyData: PriceLocationData = {
  cities: [],
  district: '',
  price_min: '',
  price_max: '',
  pricing_note: '',
}

const validData: PriceLocationData = {
  cities: ['台北市'],
  district: '大安區',
  price_min: '2000',
  price_max: '8000',
  pricing_note: '依複雜度另議',
}

describe('StepPriceLocation', () => {
  let onChange: ReturnType<typeof vi.fn>
  let onNext: ReturnType<typeof vi.fn>
  let onBack: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onChange = vi.fn()
    onNext = vi.fn()
    onBack = vi.fn()
  })

  it('renders city buttons for all groups', () => {
    render(
      <StepPriceLocation data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    // North group
    expect(screen.getByRole('button', { name: '台北市' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新北市' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '桃園市' })).toBeInTheDocument()

    // Central group
    expect(screen.getByRole('button', { name: '台中市' })).toBeInTheDocument()

    // South group
    expect(screen.getByRole('button', { name: '高雄市' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '台南市' })).toBeInTheDocument()

    // East group
    expect(screen.getByRole('button', { name: '花蓮縣' })).toBeInTheDocument()

    // Islands group
    expect(screen.getByRole('button', { name: '澎湖縣' })).toBeInTheDocument()
  })

  it('clicking city toggles selection (adds to cities)', () => {
    render(
      <StepPriceLocation data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '台北市' }))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      ...emptyData,
      cities: ['台北市'],
    })
  })

  it('clicking selected city deselects it (removes from cities)', () => {
    render(
      <StepPriceLocation
        data={validData}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    // 台北市is already selected in validData
    fireEvent.click(screen.getByRole('button', { name: '台北市' }))

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      ...validData,
      cities: [],
    })
  })

  it('clicking a second city adds it to existing selection', () => {
    const withOneCity: PriceLocationData = { ...emptyData, cities: ['台北市'] }
    render(
      <StepPriceLocation
        data={withOneCity}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '高雄市' }))

    expect(onChange).toHaveBeenCalledWith({
      ...withOneCity,
      cities: ['台北市', '高雄市'],
    })
  })

  it('Next button disabled when no city selected', () => {
    render(
      <StepPriceLocation
        data={{ ...emptyData, price_min: '2000' }}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    expect(screen.getByRole('button', { name: '下一步' })).toBeDisabled()
  })

  it('Next button disabled when no price_min filled', () => {
    render(
      <StepPriceLocation
        data={{ ...emptyData, cities: ['台北市'] }}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    expect(screen.getByRole('button', { name: '下一步' })).toBeDisabled()
  })

  it('Next button disabled when both city and price_min are empty', () => {
    render(
      <StepPriceLocation data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    expect(screen.getByRole('button', { name: '下一步' })).toBeDisabled()
  })

  it('Next button enabled when city and price_min are filled', () => {
    render(
      <StepPriceLocation
        data={validData}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    expect(screen.getByRole('button', { name: '下一步' })).not.toBeDisabled()
  })

  it('Next button disabled when price_min is only whitespace', () => {
    render(
      <StepPriceLocation
        data={{ ...emptyData, cities: ['台北市'], price_min: '   ' }}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    expect(screen.getByRole('button', { name: '下一步' })).toBeDisabled()
  })

  it('district input calls onChange with updated district', () => {
    render(
      <StepPriceLocation data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    fireEvent.change(screen.getByPlaceholderText('例：大安區、信義區'), {
      target: { value: '信義區' },
    })

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      ...emptyData,
      district: '信義區',
    })
  })

  it('price_min input calls onChange with updated price_min', () => {
    render(
      <StepPriceLocation data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    fireEvent.change(screen.getByPlaceholderText('例：2000'), {
      target: { value: '3000' },
    })

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      ...emptyData,
      price_min: '3000',
    })
  })

  it('price_max input calls onChange with updated price_max', () => {
    render(
      <StepPriceLocation data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    fireEvent.change(screen.getByPlaceholderText('例：8000'), {
      target: { value: '10000' },
    })

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      ...emptyData,
      price_max: '10000',
    })
  })

  it('pricing_note textarea calls onChange with updated pricing_note', () => {
    render(
      <StepPriceLocation data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    fireEvent.change(screen.getByPlaceholderText(/依據尺寸及複雜度/), {
      target: { value: '依複雜度另議' },
    })

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith({
      ...emptyData,
      pricing_note: '依複雜度另議',
    })
  })

  it('Back button calls onBack', () => {
    render(
      <StepPriceLocation data={emptyData} onChange={onChange} onNext={onNext} onBack={onBack} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '上一步' }))

    expect(onBack).toHaveBeenCalledOnce()
  })

  it('Next button calls onNext when valid', () => {
    render(
      <StepPriceLocation
        data={validData}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '下一步' }))

    expect(onNext).toHaveBeenCalledOnce()
  })

  it('prefills fields from data prop', () => {
    render(
      <StepPriceLocation
        data={validData}
        onChange={onChange}
        onNext={onNext}
        onBack={onBack}
      />,
    )

    expect(screen.getByDisplayValue('大安區')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('8000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('依複雜度另議')).toBeInTheDocument()
  })
})
