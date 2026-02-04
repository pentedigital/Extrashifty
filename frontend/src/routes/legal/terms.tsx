import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/legal/terms')({
  component: TermsPage,
})

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <span className="font-semibold text-xl tracking-tight">ExtraShifty</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 md:pt-32 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto prose prose-gray dark:prose-invert">
          <h1>Terms of Service</h1>
          <p className="lead">Last updated: {new Date().toLocaleDateString('en-IE', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using ExtraShifty, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our platform.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            ExtraShifty is a marketplace platform that connects hospitality businesses with workers
            for shift-based employment. We facilitate the posting of shifts, applications, matching,
            and payment processing.
          </p>

          <h2>3. User Accounts</h2>
          <ul>
            <li>You must provide accurate and complete information when creating an account</li>
            <li>You are responsible for maintaining the security of your account</li>
            <li>You must be at least 18 years old to use our services</li>
            <li>One person or entity may not maintain more than one account</li>
          </ul>

          <h2>4. For Workers</h2>
          <ul>
            <li>You must complete identity verification before accepting shifts</li>
            <li>You are responsible for ensuring you have the legal right to work</li>
            <li>You must arrive on time and complete shifts as agreed</li>
            <li>Cancellations with less than 24 hours notice may affect your rating</li>
            <li>You are an independent contractor, not an employee of ExtraShifty or the business</li>
          </ul>

          <h2>5. For Businesses</h2>
          <ul>
            <li>You must provide accurate shift details including role, time, location, and pay rate</li>
            <li>You agree to pay workers through the platform within the agreed timeframe</li>
            <li>You must provide a safe working environment</li>
            <li>You may not contact workers outside the platform for future shifts (circumvention)</li>
          </ul>

          <h2>6. Payments</h2>
          <ul>
            <li>Businesses pay a 10% platform fee on completed shifts</li>
            <li>Workers receive payment within 48 hours of shift completion</li>
            <li>All payments are processed through our secure payment provider</li>
            <li>Refunds and disputes are handled according to our Dispute Resolution process</li>
          </ul>

          <h2>7. Prohibited Conduct</h2>
          <p>Users may not:</p>
          <ul>
            <li>Provide false or misleading information</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Circumvent the platform for direct hiring</li>
            <li>Use the platform for any illegal purpose</li>
            <li>Manipulate ratings or reviews</li>
          </ul>

          <h2>8. Limitation of Liability</h2>
          <p>
            ExtraShifty is a marketplace platform and is not responsible for the conduct of users.
            We do not guarantee shift availability, worker performance, or business reliability.
            Our liability is limited to the fees paid to us in the previous 12 months.
          </p>

          <h2>9. Termination</h2>
          <p>
            We may suspend or terminate your account at any time for violation of these terms.
            You may close your account at any time through settings. Outstanding payments will
            be processed before account closure.
          </p>

          <h2>10. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. We will notify you of significant changes
            via email or platform notification. Continued use after changes constitutes acceptance.
          </p>

          <h2>11. Contact</h2>
          <p>
            For questions about these Terms, contact us at{' '}
            <a href="mailto:legal@extrashifty.com" className="text-brand-600 hover:text-brand-700">
              legal@extrashifty.com
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-border">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ExtraShifty. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
