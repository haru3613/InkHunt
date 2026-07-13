import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * HAR-667: root-cause guard for the "/en renders mixed zh-TW ... router.push
 * uses next/navigation instead of @/i18n/navigation" audit finding.
 *
 * `next/navigation`'s `useRouter().push/replace` writes a bare (locale-less)
 * path, so navigating with it drops the current locale segment and the
 * next-intl middleware re-resolves the visitor back to the DEFAULT locale
 * (`zh-TW`) — an English visitor gets bounced off `/en`. `@/i18n/navigation`'s
 * `useRouter` (built on `createNavigation`) preserves the locale.
 *
 * This is a repo-wide static check rather than a per-file behavioral test: it
 * scans every source file for the specific combination that reproduces the
 * bug (imports `useRouter` from the bare module AND calls `.push(`/`.replace(`
 * on it) so a NEW offender introduced later fails CI too, not just the files
 * fixed in this round.
 */

const SRC_ROOT = path.join(__dirname, '..')

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, files)
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.includes('.test.')) {
      files.push(full)
    }
  }
  return files
}

describe('i18n navigation leak guard (HAR-667)', () => {
  it('never imports useRouter from next/navigation while calling router.push/replace', () => {
    const offenders: string[] = []

    for (const file of walk(SRC_ROOT)) {
      const content = fs.readFileSync(file, 'utf8')
      const importsBareRouter =
        /import\s*\{[^}]*\buseRouter\b[^}]*\}\s*from\s*['"]next\/navigation['"]/.test(content)
      if (!importsBareRouter) continue

      if (/\brouter\.(push|replace)\(/.test(content)) {
        offenders.push(path.relative(SRC_ROOT, file))
      }
    }

    expect(offenders).toEqual([])
  })
})
