import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

// Guards vercel.json against reverting to the state that broke prod:
// deploymentEnabled:false (no git deploys) or a missing framework preset (404s).
describe('vercel.json deploy config', () => {
  const raw = readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8')

  it('is valid JSON', () => {
    expect(() => JSON.parse(raw)).not.toThrow()
  })

  it('pins the framework preset to nextjs', () => {
    expect(JSON.parse(raw).framework).toBe('nextjs')
  })

  it('re-enables git auto-deploy for main only', () => {
    expect(JSON.parse(raw).git.deploymentEnabled).toEqual({ main: true })
  })

  it('preserves the main-only ignoreCommand build gate', () => {
    expect(JSON.parse(raw).ignoreCommand).toBe(
      'if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 1; else exit 0; fi'
    )
  })
})
