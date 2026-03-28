'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import type { QuoteTemplate } from '@/components/chat/QuoteFormModal'

const MAX_TEMPLATES = 5

interface QuoteTemplateManagerProps {
  readonly templates: QuoteTemplate[]
  readonly onSave: (templates: QuoteTemplate[]) => Promise<void>
}

function makeEmptyTemplate(): QuoteTemplate {
  return { label: '', price: 0, note: '' }
}

export function QuoteTemplateManager({
  templates,
  onSave,
}: QuoteTemplateManagerProps) {
  const t = useTranslations('quote')

  const [localTemplates, setLocalTemplates] = useState<QuoteTemplate[]>(
    templates.length > 0 ? templates : [],
  )
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = useCallback(() => {
    if (localTemplates.length >= MAX_TEMPLATES) return
    setLocalTemplates((prev) => [...prev, makeEmptyTemplate()])
    setSavedSuccess(false)
  }, [localTemplates.length])

  const handleDelete = useCallback((index: number) => {
    setLocalTemplates((prev) => prev.filter((_, i) => i !== index))
    setSavedSuccess(false)
  }, [])

  const handleChange = useCallback(
    (index: number, field: keyof QuoteTemplate, value: string | number) => {
      setLocalTemplates((prev) =>
        prev.map((tpl, i) =>
          i === index ? { ...tpl, [field]: value } : tpl,
        ),
      )
      setSavedSuccess(false)
    },
    [],
  )

  const handleSave = useCallback(async () => {
    setError(null)
    setIsSaving(true)
    setSavedSuccess(false)
    try {
      await onSave(localTemplates)
      setSavedSuccess(true)
    } catch {
      setError(t('saveError'))
    } finally {
      setIsSaving(false)
    }
  }, [localTemplates, onSave])

  const saveLabel = isSaving
    ? t('saving')
    : savedSuccess
      ? t('saved')
      : t('saveTemplates')

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground font-display">
        {t('templateTitle')}
      </h2>

      {localTemplates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          {t('noTemplates')}
        </p>
      ) : (
        <ul className="space-y-3">
          {localTemplates.map((tpl, index) => (
            <li
              key={index}
              className="bg-card border border-border rounded-md p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('templateLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  aria-label="刪除模板"
                  className="text-destructive hover:opacity-70 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <input
                type="text"
                value={tpl.label}
                onChange={(e) => handleChange(index, 'label', e.target.value)}
                placeholder="例如：小圖案"
                maxLength={50}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors"
              />

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  NT$
                </label>
                <div className="flex items-center rounded-md border border-border bg-background focus-within:border-primary/60">
                  <span className="pl-3 text-sm text-muted-foreground">NT$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={tpl.price === 0 ? '' : tpl.price}
                    onChange={(e) =>
                      handleChange(index, 'price', parseInt(e.target.value, 10) || 0)
                    }
                    placeholder="0"
                    className="w-full bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('templateNote')}
                </label>
                <textarea
                  value={tpl.note ?? ''}
                  onChange={(e) => handleChange(index, 'note', e.target.value)}
                  placeholder="預約須知、建議尺寸等..."
                  maxLength={200}
                  rows={2}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:border-primary/60 transition-colors"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={localTemplates.length >= MAX_TEMPLATES}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={16} />
        {t('addTemplate')}
        {localTemplates.length >= MAX_TEMPLATES && (
          <span className="text-xs">（最多 {MAX_TEMPLATES} 個）</span>
        )}
      </button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saveLabel}
      </button>
    </div>
  )
}
