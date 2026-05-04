import Image from "next/image"

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#1e1e2e] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">

          {/* Brand — white logo on dark footer */}
          <Image
            src="/logo-white.svg"
            alt="Data & More"
            width={130}
            height={32}
            className="h-7 w-auto object-contain"
          />

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-white/50">
            <a
              href="https://dataandmore.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Website
            </a>
            <a
              href="https://dataandmore.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Privacy
            </a>
            <a
              href="mailto:support@dataandmore.com"
              className="hover:text-white transition-colors"
            >
              Contact
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-white/30">
            © {year} Data &amp; More ApS
          </p>
        </div>
      </div>
    </footer>
  )
}
