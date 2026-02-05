import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { Users, Zap, Shield, Heart, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
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
              <Link to="/about" className="text-sm font-medium text-foreground">
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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              About ExtraShifty
            </h1>
            <p className="text-xl text-muted-foreground">
              We're building the future of hospitality staffing.
            </p>
          </div>

          {/* Mission */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            <p className="text-lg text-muted-foreground mb-4">
              ExtraShifty was born from a simple frustration: the hospitality industry's staffing problem.
              Restaurant managers scrambling at 5 PM to find cover. Skilled workers struggling to find
              flexible opportunities. Agencies drowning in spreadsheets and phone calls.
            </p>
            <p className="text-lg text-muted-foreground">
              We built the platform we wished existed - one that connects verified hospitality workers
              with businesses that need them, instantly. No more phone trees. No more last-minute panic.
              Just shifts, covered.
            </p>
          </section>

          {/* Values */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-8">Our Values</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <ValueCard
                icon={Zap}
                title="Speed matters"
                description="In hospitality, every minute counts. We obsess over making everything faster - matching, payments, everything."
              />
              <ValueCard
                icon={Shield}
                title="Trust is earned"
                description="Every worker is verified. Every payment is protected. We don't cut corners on trust."
              />
              <ValueCard
                icon={Users}
                title="People first"
                description="Behind every shift is a person - a worker trying to earn, a manager trying to serve. We build for them."
              />
              <ValueCard
                icon={Heart}
                title="Hospitality runs deep"
                description="We come from this industry. We understand the pressure, the pace, and the passion that drives it."
              />
            </div>
          </section>

          {/* Stats */}
          <section className="mb-16 bg-muted rounded-2xl p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-3xl md:text-4xl font-bold text-brand-600">5,000+</p>
                <p className="text-sm text-muted-foreground mt-1">Verified workers</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold text-brand-600">500+</p>
                <p className="text-sm text-muted-foreground mt-1">Businesses</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold text-brand-600">94%</p>
                <p className="text-sm text-muted-foreground mt-1">Fill rate</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold text-brand-600">1.8s</p>
                <p className="text-sm text-muted-foreground mt-1">Avg match time</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center bg-muted rounded-2xl p-8 md:p-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Join thousands of hospitality professionals already using ExtraShifty.
            </p>
            <Link to="/signup">
              <Button size="lg" className="hover:shadow-lg hover:-translate-y-0.5 transition-all">
                Create free account
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 md:py-12 px-4 sm:px-6 border-t border-border bg-background" role="contentinfo">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo />
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Home</Link>
              <Link to="/pricing" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Pricing</Link>
              <Link to="/contact" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Contact</Link>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 pt-8 border-t border-border text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} ExtraShifty. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/legal/privacy" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Privacy</Link>
              <Link to="/legal/terms" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Terms</Link>
              <Link to="/legal/cookies" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ValueCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="p-6 rounded-xl bg-card border border-border">
      <div className="h-10 w-10 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-brand-600" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
