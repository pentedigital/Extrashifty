import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/terms')({
  component: TermsOfServicePage,
})

function TermsOfServicePage() {
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
              Terms of Service
            </h1>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-IE', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="space-y-6">
            {/* Acceptance of Terms */}
            <Card>
              <CardHeader>
                <CardTitle>1. Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  By accessing or using the ExtraShifty platform, you agree to be bound by these Terms of Service
                  and all applicable laws and regulations. If you do not agree with any of these terms, you are
                  prohibited from using or accessing this platform.
                </p>
                <p className="text-muted-foreground">
                  ExtraShifty reserves the right to modify these terms at any time. We will notify you of any
                  material changes via email or through a notice on our platform. Your continued use of the
                  platform after such modifications constitutes your acceptance of the updated terms.
                </p>
              </CardContent>
            </Card>

            {/* User Accounts */}
            <Card>
              <CardHeader>
                <CardTitle>2. User Accounts</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  To use certain features of the platform, you must create an account. You agree to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Provide accurate, current, and complete information during registration</li>
                  <li>Maintain and promptly update your account information</li>
                  <li>Maintain the security and confidentiality of your account credentials</li>
                  <li>Accept responsibility for all activities that occur under your account</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                  <li>Be at least 18 years of age to create an account</li>
                  <li>Not create more than one account per person or entity</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  We reserve the right to suspend or terminate accounts that violate these terms or that we
                  reasonably believe are being used for fraudulent purposes.
                </p>
              </CardContent>
            </Card>

            {/* Platform Rules */}
            <Card>
              <CardHeader>
                <CardTitle>3. Platform Rules</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  All users of the ExtraShifty platform must adhere to the following rules:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Do not provide false, misleading, or inaccurate information</li>
                  <li>Do not harass, abuse, threaten, or discriminate against other users</li>
                  <li>Do not circumvent the platform for direct hiring arrangements</li>
                  <li>Do not use the platform for any illegal or unauthorized purpose</li>
                  <li>Do not manipulate ratings, reviews, or feedback systems</li>
                  <li>Do not attempt to access other users' accounts or personal information</li>
                  <li>Do not upload malicious code or interfere with the platform's operation</li>
                  <li>Do not violate any applicable laws, regulations, or third-party rights</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  <strong className="text-foreground">For Workers:</strong> You must complete identity verification before
                  accepting shifts, ensure you have the legal right to work, arrive on time, and complete shifts as agreed.
                  Cancellations with less than 24 hours notice may affect your rating.
                </p>
                <p className="text-muted-foreground mt-4">
                  <strong className="text-foreground">For Businesses:</strong> You must provide accurate shift details including
                  role, time, location, and pay rate. You agree to pay workers through the platform and provide a safe
                  working environment.
                </p>
              </CardContent>
            </Card>

            {/* Payments */}
            <Card>
              <CardHeader>
                <CardTitle>4. Payments</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  All payments on the ExtraShifty platform are subject to the following terms:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Businesses pay the displayed shift cost when accepting workers</li>
                  <li>Workers receive payment within 48 hours of shift completion and approval</li>
                  <li>All payments are processed through our secure payment provider</li>
                  <li>You are responsible for any applicable taxes on your earnings</li>
                  <li>Refunds and disputes are handled according to our Dispute Resolution process</li>
                  <li>Payments may be delayed pending investigation of potential violations</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Workers using ExtraShifty are independent contractors, not employees of ExtraShifty or the hiring business.
                  You are responsible for your own tax obligations and any required insurance.
                </p>
              </CardContent>
            </Card>

            {/* Liability */}
            <Card>
              <CardHeader>
                <CardTitle>5. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  ExtraShifty is a marketplace platform that connects workers with businesses. To the maximum extent
                  permitted by law:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>We are not responsible for the conduct, actions, or omissions of any user</li>
                  <li>We do not guarantee shift availability, worker performance, or business reliability</li>
                  <li>We provide the platform "as is" without warranties of any kind</li>
                  <li>Our total liability is limited to the fees paid to us in the previous 12 months</li>
                  <li>We are not liable for any indirect, incidental, special, or consequential damages</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  You agree to indemnify and hold harmless ExtraShifty from any claims, damages, or expenses arising
                  from your use of the platform or violation of these terms.
                </p>
              </CardContent>
            </Card>

            {/* Termination */}
            <Card>
              <CardHeader>
                <CardTitle>6. Termination</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  Either party may terminate this agreement at any time:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>You may close your account at any time through your account settings</li>
                  <li>We may suspend or terminate your account for violation of these terms</li>
                  <li>We may terminate accounts that have been inactive for an extended period</li>
                  <li>Outstanding payments will be processed before account closure</li>
                  <li>Certain provisions of these terms will survive termination</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Upon termination, your right to use the platform ceases immediately. We may retain certain
                  information as required by law or for legitimate business purposes.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>7. Contact</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <ul className="list-none space-y-2 text-muted-foreground">
                  <li><strong className="text-foreground">Email:</strong>{' '}
                    <a href="mailto:legal@extrashifty.com" className="text-brand-600 hover:text-brand-700 hover:underline">
                      legal@extrashifty.com
                    </a>
                  </li>
                  <li><strong className="text-foreground">Address:</strong> ExtraShifty Ltd, Dublin, Ireland</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  These terms are governed by the laws of Ireland. Any disputes shall be resolved in the courts
                  of Ireland, unless otherwise required by applicable consumer protection laws.
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
