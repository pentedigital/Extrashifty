import { Link } from '@tanstack/react-router'
import { Logo } from '@/components/Logo'

type FooterVariant = 'simple' | 'full'

interface PublicFooterProps {
  variant?: FooterVariant
  /** Links to show in simple variant, defaults to Home, About, Pricing, Contact based on current page */
  simpleLinks?: Array<{ to: string; label: string }>
}

const focusLinkClass =
  'hover:text-brand-600 dark:hover:text-brand-400 focus:outline-none focus:text-brand-600 focus:underline transition-colors'

export function PublicFooter({ variant = 'simple', simpleLinks }: PublicFooterProps) {
  if (variant === 'full') {
    return <FullFooter />
  }

  return <SimpleFooter links={simpleLinks} />
}

function SimpleFooter({ links }: { links?: Array<{ to: string; label: string }> }) {
  const defaultLinks = [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/contact', label: 'Contact' },
  ]

  const navLinks = links || defaultLinks

  return (
    <footer className="py-10 md:py-12 px-4 sm:px-6 border-t border-border bg-background" role="contentinfo">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} className={focusLinkClass}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-8 border-t border-border text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ExtraShifty. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/legal/privacy" className={focusLinkClass}>
              Privacy
            </Link>
            <Link to="/legal/terms" className={focusLinkClass}>
              Terms
            </Link>
            <Link to="/legal/cookies" className={focusLinkClass}>
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FullFooter() {
  return (
    <footer className="py-10 md:py-12 px-4 sm:px-6 border-t border-border bg-background" role="contentinfo">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10 md:mb-12">
          <div className="col-span-2 md:col-span-1">
            <Logo linkTo="/" className="mb-4" />
            <p className="text-brand-600 dark:text-brand-400 font-medium">Your shift covered.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li>
                <Link to="/signup" className={focusLinkClass}>
                  For Businesses
                </Link>
              </li>
              <li>
                <Link to="/signup" className={focusLinkClass}>
                  For Workers
                </Link>
              </li>
              <li>
                <Link to="/signup" className={focusLinkClass}>
                  For Agencies
                </Link>
              </li>
              <li>
                <Link to="/pricing" className={focusLinkClass}>
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li>
                <Link to="/about" className={focusLinkClass}>
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className={focusLinkClass}>
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li>
                <Link to="/legal/privacy" className={focusLinkClass}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/legal/terms" className={focusLinkClass}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/legal/cookies" className={focusLinkClass}>
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} ExtraShifty. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
