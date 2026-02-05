import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/legal/privacy')({
  component: PrivacyPage,
})

function PrivacyPage() {
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
          <h1>Privacy Policy</h1>
          <p className="lead">Last updated: {new Date().toLocaleDateString('en-IE', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us, such as when you create an account,
            apply for shifts, post shifts, or contact us for support.
          </p>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, phone number, profile photo</li>
            <li><strong>Identity Verification:</strong> Government ID, proof of right to work (for workers)</li>
            <li><strong>Payment Information:</strong> Bank account details, payment history</li>
            <li><strong>Shift Data:</strong> Shifts posted, applications, work history, ratings and reviews</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Match workers with shifts and facilitate payments</li>
            <li>Verify identities and maintain platform trust</li>
            <li>Send notifications about shifts, applications, and payments</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>3. Information Sharing</h2>
          <p>
            We share your information only in the following circumstances:
          </p>
          <ul>
            <li><strong>With other users:</strong> Your profile information is visible to businesses when you apply for shifts</li>
            <li><strong>With service providers:</strong> We use third parties for payment processing, identity verification, and analytics</li>
            <li><strong>For legal reasons:</strong> When required by law or to protect rights and safety</li>
          </ul>

          <h2>4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal data,
            including encryption, secure servers, and access controls.
          </p>

          <h2>5. Your Rights (GDPR)</h2>
          <p>Under GDPR, you have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to processing</li>
            <li>Data portability</li>
            <li>Withdraw consent</li>
          </ul>

          <h2>6. Cookies</h2>
          <p>
            We use cookies and similar technologies to provide and improve our services.
            See our <Link to="/legal/cookies" className="text-brand-600 hover:text-brand-700">Cookie Policy</Link> for more details.
          </p>

          <h2>7. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{' '}
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
              <Link to="/legal/privacy" className="font-medium text-foreground">Privacy</Link>
              <Link to="/legal/terms" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Terms</Link>
              <Link to="/legal/cookies" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
