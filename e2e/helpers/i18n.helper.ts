import zhTW from '../../messages/zh-TW.json'
import en from '../../messages/en.json'

type Messages = typeof zhTW
type Locale = 'zh-TW' | 'en'

/**
 * Create a translation helper that reads from messages/*.json.
 * Used in POMs and tests so we never hardcode i18n strings.
 */
export function createTranslator(locale: Locale = 'zh-TW') {
  const messages: Messages = locale === 'zh-TW' ? zhTW : en

  return function t(
    key: string,
    params?: Record<string, string | number>,
  ): string {
    const parts = key.split('.')
    let value: unknown = messages
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part]
      } else {
        throw new Error(`Missing translation key: ${key}`)
      }
    }
    if (typeof value !== 'string') {
      throw new Error(`Translation key "${key}" is not a string`)
    }
    if (params) {
      let result = value
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v))
      }
      return result
    }
    return value
  }
}

export type Translator = ReturnType<typeof createTranslator>
