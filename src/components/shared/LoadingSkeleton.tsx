export function LoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="min-h-screen bg-[#0A0A0A] px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-[#1F1F1F]" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-[#141414]" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-[#141414]" />
          ))}
        </div>
      </div>
    </div>
  )
}
