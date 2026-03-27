import Link from "next/link"

const footerLinks = [
  { href: "/about", label: "關於我們" },
  { href: "/privacy", label: "隱私政策" },
  { href: "/terms", label: "使用條款" },
] as const

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-100 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-sm text-stone-500">
            &copy; {new Date().getFullYear()} InkHunt
          </p>
          <nav aria-label="Footer links" className="flex gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-stone-500 transition-colors hover:text-stone-700"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
