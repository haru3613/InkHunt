"use client"

import { useEffect } from "react"
import { reportError } from "@/lib/observability"

// HAR-663: last-resort boundary for a failure in the ROOT layout itself.
// Next.js requires this file to render its own <html>/<body> — the locale
// segment (and its next-intl provider) never mounted, so copy is hardcoded
// bilingual instead of translated, and styling is inline (globals.css may
// not have loaded either).
//
// Retry uses `unstable_retry()` (Next 16.2+), not bare `reset()` — see the
// rationale in src/app/[locale]/error.tsx.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  reset: () => void
  unstable_retry: () => void
}) {
  useEffect(() => {
    reportError("global-error-boundary", error)
  }, [error])

  return (
    <html lang="zh-TW">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "0 1.5rem",
          textAlign: "center",
          background: "#0A0A0A",
          color: "#F5F0EB",
          fontFamily: "sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          發生錯誤 / Something went wrong
        </h1>
        <p style={{ maxWidth: 420, fontSize: "0.875rem", color: "#8A8A8A" }}>
          很抱歉，網站出了點問題，請再試一次。
          <br />
          Sorry, something broke. Please try again.
        </p>
        <button
          onClick={unstable_retry}
          style={{
            border: "1px solid #C8A97E",
            background: "transparent",
            color: "#C8A97E",
            borderRadius: 4,
            padding: "0.5rem 1.25rem",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          重新整理 / Try again
        </button>
      </body>
    </html>
  )
}
