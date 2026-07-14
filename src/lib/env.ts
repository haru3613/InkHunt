// Fail-loud env validation (HAR-662). Called once at server boot from
// instrumentation.ts register().
export const REQUIRED_SERVER_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_BASE_URL',
  'LINE_CHANNEL_ID',
  'LINE_CHANNEL_SECRET',
  'LINE_MESSAGING_CHANNEL_ACCESS_TOKEN',
] as const

export function missingEnvVars(
  env: Record<string, string | undefined> = process.env,
): string[] {
  return REQUIRED_SERVER_ENV.filter((key) => !env[key])
}

export function assertServerEnv(
  env: Record<string, string | undefined> = process.env,
): void {
  const missing = missingEnvVars(env)
  if (missing.length === 0) return
  const msg = `Missing required environment variables: ${missing.join(', ')}`
  if (env.NODE_ENV === 'production') throw new Error(msg)
  console.warn(`[env] ${msg}`)
}
