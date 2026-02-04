import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
})

function PricingPage() {
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
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No subscriptions. No hidden fees. Pay only when you fill shifts.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-16">
            {/* For Workers */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-xl">For Workers</CardTitle>
                <CardDescription>Find shifts and get paid</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">Free</span>
                  <span className="text-muted-foreground ml-2">forever</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <PricingFeature>Browse unlimited shifts</PricingFeature>
                  <PricingFeature>Apply to any shift</PricingFeature>
                  <PricingFeature>48-hour payment guarantee</PricingFeature>
                  <PricingFeature>Build your reputation</PricingFeature>
                  <PricingFeature>No platform fees deducted</PricingFeature>
                </ul>
                <Link to="/signup">
                  <Button className="w-full">
                    Start finding shifts
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* For Businesses */}
            <Card className="relative border-brand-500 border-2">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </div>
              <CardHeader>
                <CardTitle className="text-xl">For Businesses</CardTitle>
                <CardDescription>Fill shifts on demand</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">10%</span>
                  <span className="text-muted-foreground ml-2">per shift filled</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <PricingFeature>Post unlimited shifts</PricingFeature>
                  <PricingFeature>Instant worker matching</PricingFeature>
                  <PricingFeature>Verified workers only</PricingFeature>
                  <PricingFeature>Built-in payments</PricingFeature>
                  <PricingFeature>No monthly subscription</PricingFeature>
                </ul>
                <Link to="/signup">
                  <Button className="w-full">
                    Start posting shifts
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* For Agencies */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">For Agencies</CardTitle>
                <CardDescription>Scale your operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">Custom</span>
                  <span className="text-muted-foreground ml-2">volume pricing</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <PricingFeature>Staff pool management</PricingFeature>
                  <PricingFeature>Client portal</PricingFeature>
                  <PricingFeature>Automated invoicing</PricingFeature>
                  <PricingFeature>Payroll integration</PricingFeature>
                  <PricingFeature>Dedicated support</PricingFeature>
                </ul>
                <Link to="/signup">
                  <Button variant="outline" className="w-full">
                    Contact sales
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
            <div className="space-y-6">
              <FaqItem
                question="When do I pay?"
                answer="You only pay when a worker accepts your shift and completes the work. There are no upfront costs, no monthly fees, and no commitment."
              />
              <FaqItem
                question="How does the 10% fee work?"
                answer="The 10% platform fee is calculated on the total shift cost (hourly rate × hours). For example, a €100 shift would have a €10 platform fee, totaling €110."
              />
              <FaqItem
                question="When do workers get paid?"
                answer="Workers receive payment within 48 hours of shift completion. We handle all payment processing - no chasing invoices."
              />
              <FaqItem
                question="Are there any hidden fees?"
                answer="No. What you see is what you pay. 10% for businesses, free for workers. No subscription fees, no cancellation fees, no surprises."
              />
            </div>
          </div>
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

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle className="h-4 w-4 text-brand-600 shrink-0" />
      <span className="text-sm">{children}</span>
    </li>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b border-border pb-6">
      <h3 className="font-semibold mb-2">{question}</h3>
      <p className="text-muted-foreground">{answer}</p>
    </div>
  )
}
