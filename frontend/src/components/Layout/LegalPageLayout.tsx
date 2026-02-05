import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import type { ReactNode } from 'react'

type LegalPage = 'privacy' | 'terms' | 'cookies'

interface LegalPageLayoutProps {
  children: ReactNode
  currentPage: LegalPage
}

function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-md"
    >
      Skip to main content
    </a>
  )
}

function PublicNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border" role="navigation" aria-label="Main navigation">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between">
        <Logo linkTo="/" />
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex items-center gap-4 mr-4">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
          <Link to="/login">
            <Button variant="ghost" size="sm" className="focus-visible:ring-2 focus-visible:ring-brand-500">Sign in</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm" className="focus-visible:ring-2 focus-visible:ring-brand-500">Get started</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}

interface LegalFooterProps {
  currentPage: LegalPage
}

function LegalFooter({ currentPage }: LegalFooterProps) {
  const linkClass = "hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
  const currentClass = "font-medium text-foreground"

  return (
    <footer className="py-10 md:py-12 px-4 sm:px-6 border-t border-border bg-background" role="contentinfo">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/" className={linkClass}>Home</Link>
            <Link to="/about" className={linkClass}>About</Link>
            <Link to="/pricing" className={linkClass}>Pricing</Link>
            <Link to="/contact" className={linkClass}>Contact</Link>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-8 border-t border-border text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ExtraShifty. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link
              to="/legal/privacy"
              className={currentPage === 'privacy' ? currentClass : linkClass}
              aria-current={currentPage === 'privacy' ? 'page' : undefined}
            >
              Privacy
            </Link>
            <Link
              to="/legal/terms"
              className={currentPage === 'terms' ? currentClass : linkClass}
              aria-current={currentPage === 'terms' ? 'page' : undefined}
            >
              Terms
            </Link>
            <Link
              to="/legal/cookies"
              className={currentPage === 'cookies' ? currentClass : linkClass}
              aria-current={currentPage === 'cookies' ? 'page' : undefined}
            >
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function LegalPageLayout({ children, currentPage }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SkipLink />
      <PublicNav />
      <main id="main" className="pt-24 md:pt-32 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto prose prose-gray dark:prose-invert">
          {children}
        </div>
      </main>
      <LegalFooter currentPage={currentPage} />
    </div>
  )
}
