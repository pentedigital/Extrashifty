import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/legal/cookies')({
  component: CookiesPage,
})

function CookiesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Skip to main content - Accessibility */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-md"
      >
        Skip to main content
      </a>

      {/* Navigation */}
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

      <main id="main" className="pt-24 md:pt-32 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto prose prose-gray dark:prose-invert">
          <h1>Cookie Policy</h1>
          <p className="lead">Last updated: {new Date().toLocaleDateString('en-IE', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <h2>What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit a website.
            They help websites remember your preferences and improve your experience.
          </p>

          <h2>How We Use Cookies</h2>
          <p>ExtraShifty uses the following types of cookies:</p>

          <h3>Essential Cookies</h3>
          <p>
            These cookies are necessary for the platform to function and cannot be disabled.
            They include:
          </p>
          <ul>
            <li><strong>Authentication:</strong> Keeping you logged in</li>
            <li><strong>Security:</strong> Preventing fraud and protecting your account</li>
            <li><strong>Session:</strong> Remembering your actions during a session</li>
          </ul>

          <h3>Analytics Cookies</h3>
          <p>
            These help us understand how users interact with our platform so we can improve it.
            We use aggregated, anonymized data to:
          </p>
          <ul>
            <li>Measure page performance</li>
            <li>Identify popular features</li>
            <li>Find and fix issues</li>
          </ul>

          <h3>Functional Cookies</h3>
          <p>
            These remember your preferences to provide a personalized experience:
          </p>
          <ul>
            <li>Language and region settings</li>
            <li>Theme preferences (light/dark mode)</li>
            <li>Recently viewed shifts</li>
          </ul>

          <h2>Third-Party Cookies</h2>
          <p>
            We use trusted third-party services that may set their own cookies:
          </p>
          <ul>
            <li><strong>Stripe:</strong> For secure payment processing</li>
            <li><strong>Analytics:</strong> For platform improvement</li>
          </ul>

          <h2>Managing Cookies</h2>
          <p>
            You can control cookies through your browser settings. Note that disabling
            essential cookies will prevent you from using certain features of the platform.
          </p>
          <p>
            Most browsers allow you to:
          </p>
          <ul>
            <li>View what cookies are stored</li>
            <li>Delete cookies individually or all at once</li>
            <li>Block cookies from specific sites</li>
            <li>Block all cookies (not recommended for ExtraShifty)</li>
          </ul>

          <h2>Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy from time to time. Changes will be posted on this page
            with an updated revision date.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions about our use of cookies, contact us at{' '}
            <a href="mailto:privacy@extrashifty.com" className="text-brand-600 hover:text-brand-700">
              privacy@extrashifty.com
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 md:py-12 px-4 sm:px-6 border-t border-border bg-background" role="contentinfo">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo />
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Home</Link>
              <Link to="/about" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">About</Link>
              <Link to="/pricing" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Pricing</Link>
              <Link to="/contact" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Contact</Link>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-8 border-t border-border text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} ExtraShifty. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/legal/privacy" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Privacy</Link>
              <Link to="/legal/terms" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Terms</Link>
              <Link to="/legal/cookies" className="font-medium text-foreground">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
