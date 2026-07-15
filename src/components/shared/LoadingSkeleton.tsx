/**
 * Branded loading shell — surface tokens instead of pure black slabs.
 * DESIGN.md: spacious, warm dark gallery (not a broken admin dashboard).
 */
export function LoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl animate-pulse space-y-8">
        <div className="h-3 w-24 rounded-sm bg-primary/20" />
        <div className="h-8 w-56 rounded-sm bg-muted" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] rounded-none border border-border bg-card"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
