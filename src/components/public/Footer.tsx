export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">D&M</span>
            </div>
            <span className="text-sm font-medium text-gray-700">Data &amp; More</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-5 text-sm text-gray-500">
            <a
              href="https://dataandmore.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-700 transition-colors"
            >
              Website
            </a>
            <a
              href="https://dataandmore.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-700 transition-colors"
            >
              Privacy
            </a>
            <a
              href="mailto:support@dataandmore.com"
              className="hover:text-blue-700 transition-colors"
            >
              Contact
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-gray-400">
            © {year} Data &amp; More ApS
          </p>
        </div>
      </div>
    </footer>
  )
}
