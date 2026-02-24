import Link from "next/link";

const footerLinks = {
  product: [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Docs", href: "/docs" },
    { label: "Changelog", href: "/changelog" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Press", href: "/press" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Security", href: "/security" },
    { label: "Status", href: "/status" },
  ],
};

export function Footer() {
  return (
    <footer
      className="border-t border-[var(--sidebar-border)]"
      style={{ backgroundColor: "var(--sidebar-bg)" }}
    >
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-12 md:grid-cols-4">
          {/* Col 1: Logo + tagline */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                <div className="grid grid-cols-2 gap-[3px]">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-[2px] ${
                        i === 3 ? "bg-gray-400" : "bg-white/60"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span
                className="text-[17px] font-bold tracking-tight text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Relayne
              </span>
            </div>
            <p className="mt-3 text-sm text-[var(--sidebar-text)] max-w-xs">
              The AI coordinator for property operations. Your team reviews
              exceptions, not tickets.
            </p>
          </div>

          {/* Col 2: Product */}
          <div>
            <h4 className="text-sm font-semibold text-white">Product</h4>
            <ul className="mt-4 space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--sidebar-text)] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Company */}
          <div>
            <h4 className="text-sm font-semibold text-white">Company</h4>
            <ul className="mt-4 space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--sidebar-text)] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white">Legal</h4>
            <ul className="mt-4 space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--sidebar-text)] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[var(--sidebar-border)] pt-8">
          <p className="text-sm text-[var(--sidebar-text)]">
            © 2025 Relayne Inc. · Made for property managers who want to move
            fast
          </p>
        </div>
      </div>
    </footer>
  );
}
