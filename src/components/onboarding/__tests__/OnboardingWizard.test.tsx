import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

const { draftStore, draftStorageFails } = vi.hoisted(() => ({ draftStore: new Map(), draftStorageFails: { value: false } }))
vi.mock('@/lib/onboarding-draft', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/onboarding-draft')>(),
  acquireOnboardingDraftLock: vi.fn(async () => () => {}),
  readOnboardingDraft: vi.fn(async (accountId: string) => { if (draftStorageFails.value) throw new Error('storage blocked'); return draftStore.get(accountId) ?? null }),
  writeOnboardingDraft: vi.fn(async (accountId: string, draft: unknown) => { if (draftStorageFails.value) throw new Error('storage blocked'); draftStore.set(accountId, draft) }),
  clearOnboardingDraft: vi.fn(async (accountId: string) => { draftStore.delete(accountId) }),
}))

// --- Module mocks (must be hoisted before component import) ---

vi.mock('@/lib/upload/client', () => ({ uploadFile: vi.fn() }))
// HAR-667: OnboardingComplete (rendered on the final step) uses the
// locale-aware router — bare next/navigation drops the locale segment.
vi.mock('@/i18n/navigation', () => ({ useRouter: vi.fn(() => ({ replace: vi.fn() })) }))

vi.mock('../OnboardingProgress', () => ({
  OnboardingProgress: ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
    <div data-testid="progress">
      {currentStep}/{totalSteps}
    </div>
  ),
}))

vi.mock('../StepBasicInfo', () => ({
  StepBasicInfo: ({
    data,
    onChange,
    onNext,
  }: {
    data: { display_name: string }
    onChange: (d: { display_name: string; ig_handle: string; bio: string }) => void
    onNext: () => void
  }) => (
    <div data-testid="step-basic">
      <input
        data-testid="name-input"
        value={data.display_name}
        onChange={(e) =>
          onChange({ display_name: e.target.value, ig_handle: '', bio: '' })
        }
      />
      <button data-testid="next-1" onClick={onNext}>
        Next
      </button>
    </div>
  ),
}))

vi.mock('../StepStylePicker', () => ({
  onboardingStyleLabel: (slug: string) => slug,
  StepStylePicker: ({
    onChange,
    onNext,
    onBack,
  }: {
    data: { selectedSlugs: string[] }
    onChange: (d: { selectedSlugs: string[]; canCover: boolean; acceptCustom: boolean; hasFlashDesigns: boolean }) => void
    onNext: () => void
    onBack: () => void
  }) => (
    <div data-testid="step-style">
      <button
        data-testid="select-style"
        onClick={() =>
          onChange({ selectedSlugs: ['fine-line'], canCover: false, acceptCustom: true, hasFlashDesigns: false })
        }
      >
        Select
      </button>
      <button data-testid="next-2" onClick={onNext}>
        Next
      </button>
      <button data-testid="back-2" onClick={onBack}>
        Back
      </button>
    </div>
  ),
}))

vi.mock('../StepPriceLocation', () => ({
  StepPriceLocation: ({
    onChange,
    onNext,
    onBack,
  }: {
    data: { cities: string[]; price_min: string }
    onChange: (d: { cities: string[]; district: string; price_min: string; price_max: string; pricing_note: string }) => void
    onNext: () => void
    onBack: () => void
  }) => (
    <div data-testid="step-price">
      <button
        data-testid="set-city"
        onClick={() =>
          onChange({ cities: ['台北市'], district: '', price_min: '2000', price_max: '', pricing_note: '' })
        }
      >
        SetCity
      </button>
      <button data-testid="next-3" onClick={onNext}>
        Next
      </button>
      <button data-testid="back-3" onClick={onBack}>
        Back
      </button>
    </div>
  ),
}))

vi.mock('../StepPortfolio', () => ({
  StepPortfolio: ({
    data,
    onChange,
    onSubmit,
    onSkip,
    onBack,
    isSubmitting,
  }: {
    data: { files: File[]; previewUrls: string[] }
    onChange: (data: { files: File[]; previewUrls: string[] }) => void
    onSubmit: () => void
    onSkip: () => void
    onBack: () => void
    isSubmitting: boolean
  }) => (
    <div data-testid="step-portfolio">
      <button
        data-testid="add-portfolio-file"
        onClick={() => {
          const file = new File(['image'], `work-${data.files.length + 1}.jpg`, { type: 'image/jpeg' })
          onChange({ files: [...data.files, file], previewUrls: [...data.previewUrls, `blob:${file.name}`] })
        }}
      >
        Add file
      </button>
      <button data-testid="submit" onClick={onSubmit}>
        Submit
      </button>
      <button data-testid="skip" onClick={onSkip}>
        Skip
      </button>
      <button data-testid="back-4" onClick={onBack}>
        Back
      </button>
      {isSubmitting && <span data-testid="submitting">Submitting...</span>}
    </div>
  ),
}))

vi.mock('../OnboardingComplete', () => ({
  OnboardingComplete: () => <div data-testid="complete">Complete!</div>,
}))

// --- Import the component under test AFTER mocks ---
import { OnboardingWizard } from '../OnboardingWizard'
import { uploadFile } from '@/lib/upload/client'

// --- Helpers ---

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeOkResponse(body: object) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(body),
  }
}

function makeErrorResponse(body: object) {
  return {
    ok: false,
    json: vi.fn().mockResolvedValue(body),
  }
}

async function navigateToStep4() {
  fireEvent.click(screen.getByTestId('next-1'))
  fireEvent.click(screen.getByTestId('next-2'))
  fireEvent.click(screen.getByTestId('next-3'))
}

// --- Tests ---

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    draftStore.clear()
    draftStorageFails.value = false
  })

  it('refreshes the artist identity before exposing the completion actions', async () => {
    let finishRefresh!: () => void
    const onProfileCreated = vi.fn(() => new Promise<void>(resolve => { finishRefresh = resolve }))
    mockFetch.mockResolvedValue(makeOkResponse({ slug: 'new-artist' }))
    render(<OnboardingWizard onProfileCreated={onProfileCreated} />)
    await navigateToStep4()
    fireEvent.click(screen.getByTestId('submit'))
    await waitFor(() => expect(onProfileCreated).toHaveBeenCalledWith('new-artist'))
    expect(screen.queryByTestId('complete')).not.toBeInTheDocument()
    await act(async () => finishRefresh())
    expect(await screen.findByTestId('complete')).toBeInTheDocument()
  })

  it('restores the fourth step, text and selected image bytes after a remount', async () => {
    const first = render(<OnboardingWizard accountId="account-a" prefillName="A" />)
    await screen.findByTestId('name-input')
    fireEvent.change(screen.getByTestId('name-input'), { target: { value: '恢復我的草稿' } })
    fireEvent.click(screen.getByTestId('next-1'))
    fireEvent.click(screen.getByTestId('select-style'))
    fireEvent.click(screen.getByTestId('next-2'))
    fireEvent.click(screen.getByTestId('set-city'))
    fireEvent.click(screen.getByTestId('next-3'))
    fireEvent.click(screen.getByTestId('add-portfolio-file'))
    await waitFor(() => expect(draftStore.get('account-a')?.files).toHaveLength(1))
    first.unmount()
    render(<OnboardingWizard accountId="account-a" prefillName="A" />)
    expect(await screen.findByTestId('step-portfolio')).toBeInTheDocument()
    expect(screen.getByTestId('progress')).toHaveTextContent('4/4')
    expect(draftStore.get('account-a').files[0].size).toBe(5)
    fireEvent.click(screen.getByTestId('back-4'))
    fireEvent.click(screen.getByTestId('back-3'))
    fireEvent.click(screen.getByTestId('back-2'))
    expect(screen.getByTestId('name-input')).toHaveValue('恢復我的草稿')
  })

  it('never restores another account draft', async () => {
    const first = render(<OnboardingWizard accountId="account-a" />)
    await screen.findByTestId('name-input')
    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'A private draft' } })
    await waitFor(() => expect(draftStore.get('account-a')?.basicInfo.display_name).toBe('A private draft'))
    first.unmount()
    render(<OnboardingWizard accountId="account-b" prefillName="B" />)
    expect(await screen.findByTestId('name-input')).toHaveValue('B')
  })

  it('warns when browser storage is unavailable without blocking input', async () => {
    draftStorageFails.value = true
    render(<OnboardingWizard accountId="blocked-storage" />)
    expect(await screen.findByTestId('name-input')).toBeInTheDocument()
    expect(await screen.findByText(/目前無法保存草稿/)).toBeInTheDocument()
  })

  it('clears the draft only after the profile and identity refresh complete', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ slug: 'created' }))
    render(<OnboardingWizard accountId="account-a" onProfileCreated={async () => {}} />)
    await screen.findByTestId('name-input')
    await navigateToStep4()
    await waitFor(() => expect(draftStore.has('account-a')).toBe(true))
    fireEvent.click(screen.getByTestId('submit'))
    expect(await screen.findByTestId('complete')).toBeInTheDocument()
    expect(draftStore.has('account-a')).toBe(false)
  })

  it('retries identity sync without creating a second application', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ slug: 'created' }))
    const sync = vi.fn().mockRejectedValueOnce(new Error('Retry identity sync')).mockResolvedValueOnce(undefined)
    render(<OnboardingWizard onProfileCreated={sync} />)
    await navigateToStep4()
    fireEvent.click(screen.getByTestId('submit'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Retry identity sync')
    fireEvent.click(screen.getByTestId('submit'))
    expect(await screen.findByTestId('complete')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(sync).toHaveBeenCalledTimes(2)
  })

  it('stops later uploads when a server-saved file checkpoint cannot be persisted', async () => {
    vi.mocked(uploadFile).mockResolvedValue('https://example.com/file.jpg')
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/artists') return makeOkResponse({ slug: 'created' })
      draftStorageFails.value = true
      return makeOkResponse({ id: 'saved-work' })
    })
    render(<OnboardingWizard accountId="checkpoint-failure" />)
    await screen.findByTestId('name-input')
    await navigateToStep4()
    fireEvent.click(screen.getByTestId('add-portfolio-file'))
    fireEvent.click(screen.getByTestId('add-portfolio-file'))
    await waitFor(() => expect(draftStore.get('checkpoint-failure')?.files).toHaveLength(2))
    fireEvent.click(screen.getByTestId('submit'))
    expect(await screen.findByRole('alert')).toHaveTextContent('已停止後續上傳')
    expect(uploadFile).toHaveBeenCalledTimes(1)
  })

  it('recovers an owned profile after the original create response was lost', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection lost'))
      .mockResolvedValueOnce({ ...makeErrorResponse({ error: 'Already applied' }), status: 409 })
    const recover = vi.fn().mockResolvedValue('already-created')
    const sync = vi.fn().mockResolvedValue(undefined)
    render(<OnboardingWizard recoverExistingProfile={recover} onProfileCreated={sync} />)
    await navigateToStep4()
    fireEvent.click(screen.getByTestId('submit'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost')
    fireEvent.click(screen.getByTestId('submit'))
    expect(await screen.findByTestId('complete')).toBeInTheDocument()
    expect(recover).toHaveBeenCalledOnce()
    expect(sync).toHaveBeenCalledWith('already-created')
  })

  it('keeps selected files when a server profile exists but its create checkpoint was lost', async () => {
    const first = render(<OnboardingWizard accountId="lost-checkpoint" />)
    await screen.findByTestId('name-input')
    await navigateToStep4()
    fireEvent.click(screen.getByTestId('add-portfolio-file'))
    await waitFor(() => expect(draftStore.get('lost-checkpoint')?.files).toHaveLength(1))
    first.unmount()
    mockFetch.mockResolvedValue(makeOkResponse({ id: 'portfolio-item' }))
    vi.mocked(uploadFile).mockResolvedValue('https://example.com/image.jpg')
    render(<OnboardingWizard accountId="lost-checkpoint" initialArtistSlug="owned-existing" />)
    expect(await screen.findByTestId('step-portfolio')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('submit'))
    expect(await screen.findByTestId('complete')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe('/api/artists/owned-existing/portfolio')
  })

  it('starts on step 1 with progress 1/4', () => {
    render(<OnboardingWizard />)

    expect(screen.getByTestId('progress').textContent).toBe('1/4')
  })

  it('shows StepBasicInfo on initial render', () => {
    render(<OnboardingWizard />)

    expect(screen.getByTestId('step-basic')).toBeInTheDocument()
    expect(screen.queryByTestId('step-style')).not.toBeInTheDocument()
    expect(screen.queryByTestId('step-price')).not.toBeInTheDocument()
    expect(screen.queryByTestId('step-portfolio')).not.toBeInTheDocument()
  })

  it('navigates to step 2 when Next clicked on step 1', () => {
    render(<OnboardingWizard />)

    fireEvent.click(screen.getByTestId('next-1'))

    expect(screen.getByTestId('step-style')).toBeInTheDocument()
    expect(screen.queryByTestId('step-basic')).not.toBeInTheDocument()
    expect(screen.getByTestId('progress').textContent).toBe('2/4')
  })

  it('navigates back to step 1 from step 2', () => {
    render(<OnboardingWizard />)

    fireEvent.click(screen.getByTestId('next-1'))
    expect(screen.getByTestId('step-style')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('back-2'))

    expect(screen.getByTestId('step-basic')).toBeInTheDocument()
    expect(screen.queryByTestId('step-style')).not.toBeInTheDocument()
    expect(screen.getByTestId('progress').textContent).toBe('1/4')
  })

  it('full flow: step 1 → 2 → 3 → 4', () => {
    render(<OnboardingWizard />)

    // Step 1
    expect(screen.getByTestId('step-basic')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('next-1'))

    // Step 2
    expect(screen.getByTestId('step-style')).toBeInTheDocument()
    expect(screen.getByTestId('progress').textContent).toBe('2/4')
    fireEvent.click(screen.getByTestId('next-2'))

    // Step 3
    expect(screen.getByTestId('step-price')).toBeInTheDocument()
    expect(screen.getByTestId('progress').textContent).toBe('3/4')
    fireEvent.click(screen.getByTestId('next-3'))

    // Step 4
    expect(screen.getByTestId('step-portfolio')).toBeInTheDocument()
    expect(screen.getByTestId('progress').textContent).toBe('4/4')
  })

  it('submit calls fetch POST /api/artists with correct payload', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ slug: 'test-artist' }))

    render(<OnboardingWizard />)

    // Fill in basic info
    fireEvent.change(screen.getByTestId('name-input'), {
      target: { value: '測試刺青師' },
    })
    fireEvent.click(screen.getByTestId('next-1'))

    // Select style
    fireEvent.click(screen.getByTestId('select-style'))
    fireEvent.click(screen.getByTestId('next-2'))

    // Set city and price
    fireEvent.click(screen.getByTestId('set-city'))
    fireEvent.click(screen.getByTestId('next-3'))

    // Submit from step 4
    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'))
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/artists',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })

    const callArgs = mockFetch.mock.calls[0]
    const body = JSON.parse(callArgs[1].body)

    expect(body.display_name).toBe('測試刺青師')
    expect(body.style_slugs).toEqual(['fine-line'])
    expect(body.can_cover).toBe(false)
    expect(body.accept_custom).toBe(true)
    expect(body.has_flash_designs).toBe(false)
    expect(body.city).toBe('台北市')
    expect(body.price_min).toBe(2000)
  })

  it('submitted payload keys all survive POST /api/artists createArtistSchema (HAR-647 regression)', async () => {
    // Proves the wizard→API contract stays reconciled: every key the wizard
    // sends is one the schema actually accepts, so zod's safeParse never
    // silently strips style_slugs/service flags again.
    const { createArtistSchema } = await import('@/app/api/artists/schema')

    mockFetch.mockResolvedValue(makeOkResponse({ slug: 'test-artist' }))

    render(<OnboardingWizard />)

    fireEvent.change(screen.getByTestId('name-input'), {
      target: { value: '測試刺青師' },
    })
    fireEvent.click(screen.getByTestId('next-1'))
    fireEvent.click(screen.getByTestId('select-style'))
    fireEvent.click(screen.getByTestId('next-2'))
    fireEvent.click(screen.getByTestId('set-city'))
    fireEvent.click(screen.getByTestId('next-3'))

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'))
    })

    await waitFor(() => expect(mockFetch).toHaveBeenCalled())

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    const result = createArtistSchema.safeParse(sentBody)

    expect(result.success).toBe(true)
    if (result.success) {
      // Every key the wizard sent is present in the parsed (accepted) data —
      // none were dropped as "unrecognized keys".
      for (const key of Object.keys(sentBody)) {
        expect(result.data).toHaveProperty(key)
      }
      expect(result.data.style_slugs).toEqual(['fine-line'])
      expect(result.data.can_cover).toBe(false)
      expect(result.data.accept_custom).toBe(true)
      expect(result.data.has_flash_designs).toBe(false)
    }
  })

  it('shows OnboardingComplete after successful submit', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ slug: 'test-artist' }))

    render(<OnboardingWizard />)
    await navigateToStep4()

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('complete')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('step-portfolio')).not.toBeInTheDocument()
  })

  it('shows error message when API returns non-ok', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse({ error: '名稱已被使用' }))

    render(<OnboardingWizard />)
    await navigateToStep4()

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'))
    })

    await waitFor(() => {
      expect(screen.getByText('名稱已被使用')).toBeInTheDocument()
    })

    // Wizard stays on step 4, not showing complete
    expect(screen.getByTestId('step-portfolio')).toBeInTheDocument()
    expect(screen.queryByTestId('complete')).not.toBeInTheDocument()
  })

  it('shows fallback error message when API response has no error field', async () => {
    mockFetch.mockResolvedValue(makeErrorResponse({}))

    render(<OnboardingWizard />)
    await navigateToStep4()

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'))
    })

    await waitFor(() => {
      expect(screen.getByText('申請失敗，請稍後再試')).toBeInTheDocument()
    })
  })

  it('skip portfolio calls handleSubmit with skipPortfolio=true — no uploadFile call', async () => {
    mockFetch.mockResolvedValue(makeOkResponse({ slug: 'test-artist' }))
    const mockUpload = vi.mocked(uploadFile)

    render(<OnboardingWizard />)
    await navigateToStep4()

    await act(async () => {
      fireEvent.click(screen.getByTestId('skip'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('complete')).toBeInTheDocument()
    })

    // POST /api/artists was called
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/artists',
      expect.objectContaining({ method: 'POST' }),
    )
    // uploadFile was never called because skipPortfolio=true
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('uploads portfolio files on submit when files are present (non-skip path)', async () => {
    const artistSlug = 'test-artist-upload'
    mockFetch
      .mockResolvedValueOnce(makeOkResponse({ slug: artistSlug }))
      .mockResolvedValue(makeOkResponse({}))

    const mockUpload = vi.mocked(uploadFile)
    mockUpload.mockResolvedValue('https://cdn.example.com/photo.jpg')

    render(<OnboardingWizard />)
    await navigateToStep4()
    fireEvent.click(screen.getByTestId('add-portfolio-file'))

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('complete')).toBeInTheDocument()
    })

    expect(mockUpload).toHaveBeenCalledOnce()
    const artistCalls = mockFetch.mock.calls.filter(
      (c: unknown[]) => (c[0] as string) === '/api/artists',
    )
    expect(artistCalls).toHaveLength(1)
    const portfolioCalls = mockFetch.mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes('/portfolio'),
    )
    expect(portfolioCalls).toHaveLength(1)
  })

  it('reports partial portfolio failures and retries only failed files without another artist POST', async () => {
    const mockUpload = vi.mocked(uploadFile)
    mockUpload
      .mockResolvedValueOnce('https://cdn.example.com/first.jpg')
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce('https://cdn.example.com/retry.jpg')
    mockFetch
      .mockResolvedValueOnce(makeOkResponse({ slug: 'retry-artist' }))
      .mockResolvedValueOnce(makeOkResponse({}))
      .mockResolvedValueOnce(makeOkResponse({}))

    render(<OnboardingWizard />)
    await navigateToStep4()
    fireEvent.click(screen.getByTestId('add-portfolio-file'))
    fireEvent.click(screen.getByTestId('add-portfolio-file'))
    fireEvent.click(screen.getByTestId('submit'))

    expect(await screen.findByText(/有 1 張作品上傳失敗/)).toBeInTheDocument()
    expect(screen.getByText('work-2.jpg')).toBeInTheDocument()
    expect(screen.queryByTestId('complete')).not.toBeInTheDocument()
    expect(mockFetch.mock.calls.filter((call: unknown[]) => call[0] === '/api/artists')).toHaveLength(1)

    fireEvent.click(screen.getByTestId('submit'))
    await waitFor(() => expect(screen.getByTestId('complete')).toBeInTheDocument())
    expect(mockFetch.mock.calls.filter((call: unknown[]) => call[0] === '/api/artists')).toHaveLength(1)
    expect(mockUpload).toHaveBeenCalledTimes(3)
  })

  it('prefills display_name from prefillName prop', () => {
    render(<OnboardingWizard prefillName="LINE 使用者" />)

    const input = screen.getByTestId('name-input') as HTMLInputElement
    expect(input.value).toBe('LINE 使用者')
  })

  it('prevents double submit via submittingRef guard', async () => {
    // Use a fetch that resolves slowly so we can fire two clicks before resolution
    let resolveFetch!: (value: unknown) => void
    const hangingPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })
    mockFetch.mockReturnValue(hangingPromise)

    render(<OnboardingWizard />)
    await navigateToStep4()

    // Fire two submit clicks in rapid succession
    fireEvent.click(screen.getByTestId('submit'))
    fireEvent.click(screen.getByTestId('submit'))

    // Resolve the single in-flight request
    resolveFetch(makeOkResponse({ slug: 'test-artist' }))

    await waitFor(() => {
      expect(screen.getByTestId('complete')).toBeInTheDocument()
    })

    // fetch should only have been called once despite two clicks
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

vi.mock('@/components/shared/LineNotificationHint', () => ({ LineNotificationHint: () => null }))
