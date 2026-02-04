import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Users, Zap, Shield, Heart } from 'lucide-react'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
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
          <section className="text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-6">
              Join thousands of hospitality professionals already using ExtraShifty.
            </p>
            <Link to="/signup">
              <Button size="lg">Create free account</Button>
            </Link>
          </section>
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
