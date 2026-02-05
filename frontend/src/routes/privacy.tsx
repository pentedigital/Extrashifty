import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/privacy')({
  component: PrivacyPolicyPage,
})

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
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

      <main className="pt-24 md:pt-32 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-IE', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="space-y-6">
            {/* Information We Collect */}
            <Card>
              <CardHeader>
                <CardTitle>1. Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  We collect information you provide directly to us when you create an account, apply for shifts,
                  post shifts, or contact us for support. The types of information we collect include:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong className="text-foreground">Account Information:</strong> Name, email address, phone number, and profile photo</li>
                  <li><strong className="text-foreground">Identity Verification:</strong> Government-issued ID and proof of right to work (for workers)</li>
                  <li><strong className="text-foreground">Payment Information:</strong> Bank account details, payment history, and billing address</li>
                  <li><strong className="text-foreground">Shift Data:</strong> Shifts posted, applications submitted, work history, ratings, and reviews</li>
                  <li><strong className="text-foreground">Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
                  <li><strong className="text-foreground">Usage Information:</strong> Pages viewed, features used, and time spent on the platform</li>
                </ul>
              </CardContent>
            </Card>

            {/* How We Use Information */}
            <Card>
              <CardHeader>
                <CardTitle>2. How We Use Information</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  We use the information we collect to provide, maintain, and improve our services:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Operate and improve the ExtraShifty platform</li>
                  <li>Match workers with available shifts and facilitate applications</li>
                  <li>Process payments and manage financial transactions</li>
                  <li>Verify user identities and maintain platform security and trust</li>
                  <li>Send notifications about shifts, applications, payments, and account updates</li>
                  <li>Respond to your comments, questions, and support requests</li>
                  <li>Analyze usage patterns to improve user experience</li>
                  <li>Detect, investigate, and prevent fraudulent transactions and abuse</li>
                  <li>Comply with legal obligations and enforce our terms of service</li>
                </ul>
              </CardContent>
            </Card>

            {/* Data Sharing */}
            <Card>
              <CardHeader>
                <CardTitle>3. Data Sharing</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  We share your information only in the following circumstances:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong className="text-foreground">With Other Users:</strong> Your profile information is visible to businesses when you apply for shifts, and to workers when you post shifts</li>
                  <li><strong className="text-foreground">With Service Providers:</strong> We use trusted third parties for payment processing, identity verification, analytics, and customer support</li>
                  <li><strong className="text-foreground">For Legal Compliance:</strong> When required by law, subpoena, or other legal process, or to protect our rights and the safety of our users</li>
                  <li><strong className="text-foreground">Business Transfers:</strong> In connection with any merger, acquisition, or sale of company assets</li>
                  <li><strong className="text-foreground">With Your Consent:</strong> When you give us explicit permission to share your information</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  We do not sell your personal information to third parties for marketing purposes.
                </p>
              </CardContent>
            </Card>

            {/* Your Rights */}
            <Card>
              <CardHeader>
                <CardTitle>4. Your Rights</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  Under applicable data protection laws, including GDPR, you have the following rights:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong className="text-foreground">Access:</strong> Request a copy of your personal data we hold</li>
                  <li><strong className="text-foreground">Rectification:</strong> Request correction of inaccurate or incomplete data</li>
                  <li><strong className="text-foreground">Erasure:</strong> Request deletion of your personal data under certain conditions</li>
                  <li><strong className="text-foreground">Restriction:</strong> Request limitation of processing of your personal data</li>
                  <li><strong className="text-foreground">Portability:</strong> Receive your data in a structured, machine-readable format</li>
                  <li><strong className="text-foreground">Objection:</strong> Object to processing based on legitimate interests or direct marketing</li>
                  <li><strong className="text-foreground">Withdraw Consent:</strong> Withdraw consent where processing is based on your consent</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  To exercise any of these rights, please contact us using the information provided below.
                  We will respond to your request within 30 days.
                </p>
              </CardContent>
            </Card>

            {/* Contact Us */}
            <Card>
              <CardHeader>
                <CardTitle>5. Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <ul className="list-none space-y-2 text-muted-foreground">
                  <li><strong className="text-foreground">Email:</strong>{' '}
                    <a href="mailto:privacy@extrashifty.com" className="text-brand-600 hover:text-brand-700 hover:underline">
                      privacy@extrashifty.com
                    </a>
                  </li>
                  <li><strong className="text-foreground">Address:</strong> ExtraShifty Ltd, Dublin, Ireland</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  For more information about our use of cookies, please see our{' '}
                  <Link to="/legal/cookies" className="text-brand-600 hover:text-brand-700 hover:underline">
                    Cookie Policy
                  </Link>.
                </p>
              </CardContent>
            </Card>

            {/* Back to Home */}
            <div className="text-center pt-4">
              <Link to="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} ExtraShifty. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Link to="/legal/privacy" className="text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Link>
              <Link to="/legal/terms" className="text-muted-foreground hover:text-foreground">
                Terms of Service
              </Link>
              <Link to="/legal/cookies" className="text-muted-foreground hover:text-foreground">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
