import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from '@/components/Logo'

export const Route = createFileRoute('/cookies')({
  component: CookiePolicyPage,
})

function CookiePolicyPage() {
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
              Cookie Policy
            </h1>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-IE', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="space-y-6">
            {/* What Are Cookies */}
            <Card>
              <CardHeader>
                <CardTitle>1. What Are Cookies</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  Cookies are small text files that are stored on your device (computer, tablet, or mobile phone)
                  when you visit a website. They are widely used to make websites work more efficiently and to
                  provide information to website owners.
                </p>
                <p className="text-muted-foreground">
                  Cookies help us remember your preferences, understand how you use our platform, and improve
                  your overall experience. Some cookies are essential for the platform to function properly,
                  while others help us enhance features and personalize content.
                </p>
              </CardContent>
            </Card>

            {/* How We Use Cookies */}
            <Card>
              <CardHeader>
                <CardTitle>2. How We Use Cookies</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  ExtraShifty uses cookies and similar technologies for the following purposes:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong className="text-foreground">Authentication:</strong> To keep you logged in and maintain your session securely</li>
                  <li><strong className="text-foreground">Security:</strong> To protect your account and detect fraudulent activity</li>
                  <li><strong className="text-foreground">Preferences:</strong> To remember your settings such as language and theme</li>
                  <li><strong className="text-foreground">Analytics:</strong> To understand how users interact with our platform</li>
                  <li><strong className="text-foreground">Performance:</strong> To measure and improve platform performance</li>
                  <li><strong className="text-foreground">Functionality:</strong> To enable features and remember your choices</li>
                </ul>
              </CardContent>
            </Card>

            {/* Types of Cookies */}
            <Card>
              <CardHeader>
                <CardTitle>3. Types of Cookies</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  We use the following categories of cookies on our platform:
                </p>

                <h4 className="font-semibold text-foreground mt-6 mb-2">Essential Cookies</h4>
                <p className="text-muted-foreground mb-4">
                  These cookies are necessary for the platform to function and cannot be disabled. They include:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
                  <li>Authentication and session management cookies</li>
                  <li>Security cookies for fraud prevention</li>
                  <li>Load balancing and server optimization cookies</li>
                </ul>

                <h4 className="font-semibold text-foreground mt-6 mb-2">Analytics Cookies</h4>
                <p className="text-muted-foreground mb-4">
                  These cookies help us understand how users interact with our platform. We use aggregated,
                  anonymized data to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
                  <li>Measure page performance and load times</li>
                  <li>Identify popular features and content</li>
                  <li>Find and fix issues and errors</li>
                  <li>Improve user experience based on usage patterns</li>
                </ul>

                <h4 className="font-semibold text-foreground mt-6 mb-2">Functional Cookies</h4>
                <p className="text-muted-foreground mb-4">
                  These cookies remember your preferences to provide a personalized experience:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
                  <li>Language and region settings</li>
                  <li>Theme preferences (light/dark mode)</li>
                  <li>Recently viewed shifts and search history</li>
                  <li>Notification preferences</li>
                </ul>

                <h4 className="font-semibold text-foreground mt-6 mb-2">Third-Party Cookies</h4>
                <p className="text-muted-foreground mb-4">
                  We use trusted third-party services that may set their own cookies:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong className="text-foreground">Stripe:</strong> For secure payment processing</li>
                  <li><strong className="text-foreground">Analytics providers:</strong> For platform improvement and usage statistics</li>
                </ul>
              </CardContent>
            </Card>

            {/* Managing Cookies */}
            <Card>
              <CardHeader>
                <CardTitle>4. Managing Cookies</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  You can control and manage cookies through your browser settings. Most browsers allow you to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>View what cookies are stored on your device</li>
                  <li>Delete cookies individually or all at once</li>
                  <li>Block cookies from specific websites</li>
                  <li>Block all third-party cookies</li>
                  <li>Clear all cookies when you close your browser</li>
                  <li>Set preferences for how cookies should be handled</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  <strong className="text-foreground">Please note:</strong> Disabling essential cookies will prevent
                  you from using certain features of the platform, including logging in and applying for shifts.
                  We recommend keeping essential cookies enabled for the best experience.
                </p>
                <p className="text-muted-foreground mt-4">
                  For more information about how to manage cookies in your browser, please visit your browser's
                  help documentation or the website{' '}
                  <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 hover:underline">
                    www.allaboutcookies.org
                  </a>.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>5. Contact</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  If you have any questions about our use of cookies or this Cookie Policy, please contact us:
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
                  We may update this Cookie Policy from time to time to reflect changes in our practices or for
                  other operational, legal, or regulatory reasons. Any changes will be posted on this page with
                  an updated revision date.
                </p>
                <p className="text-muted-foreground mt-4">
                  For more information about how we handle your personal data, please see our{' '}
                  <Link to="/legal/privacy" className="text-brand-600 hover:text-brand-700 hover:underline">
                    Privacy Policy
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
