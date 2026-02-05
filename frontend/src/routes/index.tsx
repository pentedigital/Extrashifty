import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Logo } from '@/components/Logo'
import { tokenManager } from '@/lib/api'
import { LiveActivityTicker, LiveStatCounter, LiveShiftCard } from '@/components/Landing/LiveActivityTicker'
import {
  Users,
  TrendingUp,
  Shield,
  CheckCircle,
  BadgeCheck,
  Lock,
  ArrowRight,
  Briefcase,
  Calendar,
  Star,
  Quote,
  Menu,
} from 'lucide-react'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (tokenManager.hasTokens()) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LandingPage,
})

function LandingPage() {
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
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="focus-visible:ring-2 focus-visible:ring-brand-500">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <div className="flex flex-col gap-4 mt-8">
                  <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium">
                    About
                  </Link>
                  <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium">
                    Pricing
                  </Link>
                  <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium">
                    Contact
                  </Link>
                  <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium">
                    Sign in
                  </Link>
                  <Link to="/signup" className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium">
                    Get started
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
            <div className="hidden md:flex items-center gap-4 mr-4">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium">
                About
              </Link>
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium">
                Pricing
              </Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium">
                Contact
              </Link>
            </div>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="focus-visible:ring-2 focus-visible:ring-brand-500">
                Sign in
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="focus-visible:ring-2 focus-visible:ring-brand-500">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main id="main">
        {/* Hero Section */}
        <section className="pt-24 md:pt-32 pb-12 md:pb-16 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm sm:text-base text-brand-600 dark:text-brand-400 font-medium mb-4 animate-fade-in-up">
              Your shift covered.
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up animation-delay-100">
              <span className="block">One marketplace.</span>
              <span className="block">Every shift filled.</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 animate-fade-in-up animation-delay-200">
              Post a shift in 30 seconds. Get matched in under 2 minutes. Done.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-fade-in-up animation-delay-400">
              <Link to="/signup">
                <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 hover:shadow-lg hover:-translate-y-0.5 transition-all focus-visible:ring-2 focus-visible:ring-brand-500">
                  Post a shift
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 hover:shadow-md hover:-translate-y-0.5 transition-all focus-visible:ring-2 focus-visible:ring-brand-500">
                  Browse available shifts
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Live Activity Ticker */}
        <section className="py-6 md:py-8 px-4 sm:px-6 bg-muted/50 border-y border-border">
          <div className="max-w-6xl mx-auto">
            <LiveActivityTicker />
          </div>
        </section>

        {/* Live Stats Section */}
        <section className="py-12 md:py-16 px-4 sm:px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
              <LiveStatCounter
                label="Shifts Posted Today"
                value={1247}
                trend={23}
                icon={TrendingUp}
                color="brand"
              />
              <LiveStatCounter
                label="Shifts Filled"
                value={1189}
                suffix=""
                icon={CheckCircle}
                color="green"
              />
              <LiveStatCounter
                label="Workers Active Now"
                value={3847}
                trend={142}
                icon={Users}
                color="blue"
              />
            </div>
            <p className="text-center text-muted-foreground mt-8 text-sm">
              Real-time data. Real shifts. Real results.
            </p>
          </div>
        </section>

        {/* The Problem Section */}
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-muted">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-8 md:mb-10 text-center">
              The problem is simple.
            </h2>
            <div className="space-y-4 md:space-y-6 text-muted-foreground">
              <p className="text-base sm:text-lg animate-slide-in-left">John called in sick.</p>
              <p className="text-base sm:text-lg animate-slide-in-left animation-delay-100">Mary's running late.</p>
              <p className="text-base sm:text-lg animate-slide-in-left animation-delay-200">Your Saturday night bartender just quit.</p>
              <p className="text-lg sm:text-xl pt-4 animate-slide-in-left animation-delay-300">It's <span className="font-semibold text-foreground">5 PM</span>. Dinner service starts at 6.</p>
              <p className="text-base sm:text-lg animate-slide-in-left animation-delay-400">You're frantically calling everyone you know. Most don't pick up. The ones who do are already booked.</p>
              <p className="text-xl sm:text-2xl font-medium text-foreground pt-4">Now it's <span className="text-brand-600 dark:text-brand-400 font-bold">5:45</span>. You're <span className="text-brand-600 dark:text-brand-400 font-bold">short-staffed</span>. <span className="italic">Again.</span></p>
            </div>
            <p className="text-lg sm:text-xl text-muted-foreground text-center italic mt-10 md:mt-12">
              There has to be a better way.
            </p>
          </div>
        </section>

        {/* The Solution Section */}
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-background">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg sm:text-xl text-muted-foreground mb-4">There is.</p>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-brand-600 dark:text-brand-400 mb-6 md:mb-8">
              ExtraShifty.
            </h2>
            <p className="text-xl sm:text-2xl md:text-3xl text-foreground mb-4">
              Post your shift. Get matched instantly. Your shift covered.
            </p>
            <p className="text-lg sm:text-xl text-muted-foreground">That's it.</p>
          </div>
        </section>

        {/* Live Demo Cards */}
        <section className="py-12 md:py-16 px-4 sm:px-6 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-2">Happening Right Now</h2>
              <p className="text-muted-foreground">Real shifts being filled across the platform</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <LiveShiftCard
                title="Bartender"
                company="The Brazen Head"
                location="Dublin 8"
                rate={18}
                startTime="6:00 PM"
                endTime="12:00 AM"
                spotsFilled={1}
                spotsTotal={1}
                postedAgo="45 seconds ago"
              />
              <LiveShiftCard
                title="Server"
                company="Café Central"
                location="Dublin 2"
                rate={16}
                startTime="12:00 PM"
                endTime="8:00 PM"
                spotsFilled={2}
                spotsTotal={3}
                postedAgo="2 minutes ago"
              />
              <LiveShiftCard
                title="Line Cook"
                company="Hotel Dublin"
                location="Dublin 1"
                rate={20}
                startTime="7:00 AM"
                endTime="3:00 PM"
                spotsFilled={0}
                spotsTotal={2}
                postedAgo="just now"
              />
            </div>
          </div>
        </section>

        {/* Feature: For Businesses */}
        <section className="py-20 md:py-24 px-4 sm:px-6 bg-background">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-medium mb-4">
                <Briefcase className="h-5 w-5" aria-hidden="true" />
                For businesses
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Stop scrambling.
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-6">
                We built the system we wish existed.
              </p>
              <ul className="space-y-4 mb-8">
                <FeatureItem highlight="Post in 30 seconds.">Job title. Time. Rate. Done.</FeatureItem>
                <FeatureItem highlight="Match in 90 seconds.">Our algorithm matches skills, location, availability, and ratings to find the best workers near you.</FeatureItem>
                <FeatureItem highlight="No resumes. No interviews.">The platform does the vetting. Every worker is verified and rated.</FeatureItem>
                <FeatureItem highlight="Pay per shift.">Not per month. Not per year. Only when you need us.</FeatureItem>
              </ul>
              <div className="bg-card rounded-xl p-5 md:p-6 border border-border">
                <p className="text-foreground">
                  <span className="font-medium">John called in sick?</span> Shift posted. Worker matched. Problem solved.
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  No subscriptions. No commitment. No scrambling at 5 PM.
                </p>
                <p className="text-brand-600 dark:text-brand-400 font-semibold mt-3">Just shifts. Covered.</p>
              </div>
            </div>
            <div className="bg-muted rounded-2xl h-64 md:h-80 flex items-center justify-center order-first md:order-last">
              <div className="relative">
                <Briefcase className="h-20 w-20 md:h-24 md:w-24 text-brand-500/40" aria-hidden="true" />
                <CheckCircle className="absolute -bottom-2 -right-2 h-10 w-10 md:h-12 md:w-12 text-green-500/60" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        {/* Feature: For Workers */}
        <section className="py-20 md:py-24 px-4 sm:px-6 bg-muted">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <div className="bg-card rounded-2xl h-64 md:h-80 flex items-center justify-center shadow-sm">
              <div className="relative">
                <Users className="h-20 w-20 md:h-24 md:w-24 text-brand-500/40" aria-hidden="true" />
                <TrendingUp className="absolute -bottom-2 -right-2 h-10 w-10 md:h-12 md:w-12 text-green-500/60" aria-hidden="true" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-medium mb-4">
                <Users className="h-5 w-5" aria-hidden="true" />
                For workers
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Work on your terms.
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-6">
                Your time is yours.
              </p>
              <ul className="space-y-4 mb-8">
                <FeatureItem highlight="Browse shifts.">See what's available right now in your area.</FeatureItem>
                <FeatureItem highlight="Pick what fits.">Only work when you want, where you want.</FeatureItem>
                <FeatureItem highlight="Get paid within 48 hours.">Guaranteed payment after every shift. No chasing invoices.</FeatureItem>
                <FeatureItem highlight="Build your reputation.">Great ratings unlock premium shifts with higher pay.</FeatureItem>
              </ul>
              <p className="text-brand-600 dark:text-brand-400 font-semibold">
                No applications. No waiting. Just work.
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 md:py-24 px-4 sm:px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 md:mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Real people. Real results.
              </h2>
              <p className="text-muted-foreground text-lg">
                Don't take our word for it.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <TestimonialCard
                quote="I was down 3 people Friday night. Posted at 5:15 PM. Fully staffed by 5:45. Made €800 instead of canceling tables."
                author="Sarah M."
                role="Restaurant Owner"
                company="The Copper Kitchen, Dublin 2"
              />
              <TestimonialCard
                quote="I needed €200 for rent by Sunday. Picked up two shifts Saturday. Got paid within 48 hours. This is my backup income now."
                author="Marcus T."
                role="Bartender"
                company="Various venues, Dublin"
              />
              <TestimonialCard
                quote="We went from calling 50 people to find 5 workers to over 90% fill rate. ExtraShifty cut our admin time in half."
                author="Michelle G."
                role="Staffing Manager"
                company="Hospitality Solutions Ltd"
              />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 md:py-20 px-4 sm:px-6 bg-brand-600 dark:bg-brand-700 text-white">
          <div className="max-w-4xl mx-auto text-center mb-10 md:mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
              This is hospitality staffing. Reimagined.
            </h2>
          </div>
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-10 md:mb-12">
              <StatCardLight value="95%" label="of shifts get filled" />
              <StatCardLight value="5,000+" label="verified workers" />
              <StatCardLight value="Every" label="worker reviewed & rated" />
              <StatCardLight value="48hr" label="payment guarantee" />
            </div>
            <p className="text-center text-white/80 text-base sm:text-lg">
              These aren't just numbers. They're promises.
            </p>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-20 md:py-24 px-4 sm:px-6 bg-slate-900 dark:bg-slate-950 text-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 md:mb-14">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Trust isn't optional.
              </h2>
              <p className="text-lg sm:text-xl text-slate-300">
                We don't take shortcuts.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <TrustCard
                icon={BadgeCheck}
                title="Identity verified"
                description="Every single worker. Before their first shift."
              />
              <TrustCard
                icon={Shield}
                title="Background checks"
                description="Available on request for roles that require them."
              />
              <TrustCard
                icon={CheckCircle}
                title="Certifications tracked"
                description="Food safety. Alcohol service. All verified automatically."
              />
              <TrustCard
                icon={Star}
                title="Verified reviews"
                description="Every worker has ratings from real shifts. No fake profiles."
              />
              <TrustCard
                icon={Lock}
                title="Payments protected"
                description="Secure payments with guaranteed worker compensation. Both sides protected."
              />
              <div className="flex items-center justify-center p-6 md:p-8">
                <p className="text-base sm:text-lg text-slate-300 text-center">
                  Because trust is everything.<br />
                  <span className="text-white font-medium">And everything is verified.</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature: For Agencies */}
        <section className="py-20 md:py-24 px-4 sm:px-6 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 md:mb-12">
              <p className="text-muted-foreground mb-2">One more thing.</p>
              <div className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-medium mb-4">
                <Briefcase className="h-5 w-5" aria-hidden="true" />
                For agencies
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
                One platform.
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                You manage dozens of workers. Hundreds of shifts. Multiple clients.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <AgencyFeature title="Staff management" description="Centralized dashboard for all your workers." />
              <AgencyFeature title="Client portal" description="White-label portal with your branding." />
              <AgencyFeature title="Invoicing" description="Automated invoicing and billing." />
              <AgencyFeature title="Payroll" description="Payroll processing handled automatically." />
            </div>

            <p className="text-center text-base sm:text-lg text-muted-foreground mt-8 md:mt-10 max-w-2xl mx-auto">
              Whether you manage 10 workers or 1,000, ExtraShifty gives you the tools to coordinate shifts, track performance, and keep clients happy.
            </p>
            <p className="text-center text-lg sm:text-xl text-brand-600 dark:text-brand-400 font-semibold mt-4 md:mt-6">
              Scale without the chaos.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-24 px-4 sm:px-6 bg-muted">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-base sm:text-lg text-muted-foreground mb-4 md:mb-6">
              Mary's late. John's sick. Sarah just quit.
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6 md:mb-8 text-brand-600 dark:text-brand-400">
              Your shift covered.
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 md:mb-8">
              <Link to="/signup">
                <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 hover:shadow-lg hover:-translate-y-0.5 transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2" aria-label="Get started with ExtraShifty">
                  Get your shift covered
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              No credit card. No interviews. No waiting.
            </p>
            <p className="text-foreground font-medium mt-1 text-sm sm:text-base">
              Just better staffing.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-10 md:py-12 px-4 sm:px-6 border-t border-border bg-background" role="contentinfo">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10 md:mb-12">
            <div className="col-span-2 md:col-span-1">
              <Logo linkTo="/" className="mb-4" />
              <p className="text-brand-600 dark:text-brand-400 font-medium">
                Your shift covered.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><Link to="/signup" className="hover:text-brand-600 dark:hover:text-brand-400 focus:outline-none focus:text-brand-600 focus:underline transition-colors">For Businesses</Link></li>
                <li><Link to="/signup" className="hover:text-brand-600 dark:hover:text-brand-400 focus:outline-none focus:text-brand-600 focus:underline transition-colors">For Workers</Link></li>
                <li><Link to="/signup" className="hover:text-brand-600 dark:hover:text-brand-400 focus:outline-none focus:text-brand-600 focus:underline transition-colors">For Agencies</Link></li>
                <li><Link to="/pricing" className="hover:text-brand-600 dark:hover:text-brand-400 focus:outline-none focus:text-brand-600 focus:underline transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><Link to="/about" className="hover:text-brand-600 dark:hover:text-brand-400 focus:outline-none focus:text-brand-600 focus:underline transition-colors">About</Link></li>
                <li><span className="text-muted-foreground/50 cursor-not-allowed select-none" aria-disabled="true">Blog</span></li>
                <li><span className="text-muted-foreground/50 cursor-not-allowed select-none" aria-disabled="true">Careers</span></li>
                <li><Link to="/contact" className="hover:text-brand-600 dark:hover:text-brand-400 focus:outline-none focus:text-brand-600 focus:underline transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><Link to="/legal/privacy" className="hover:text-brand-600 dark:hover:text-brand-400 focus:outline-none focus:text-brand-600 focus:underline transition-colors">Privacy Policy</Link></li>
                <li><Link to="/legal/terms" className="hover:text-brand-600 dark:hover:text-brand-400 focus:outline-none focus:text-brand-600 focus:underline transition-colors">Terms of Service</Link></li>
                <li><Link to="/legal/cookies" className="hover:text-brand-600 dark:hover:text-brand-400 focus:outline-none focus:text-brand-600 focus:underline transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-muted-foreground text-sm">
            <p>&copy; {new Date().getFullYear()} ExtraShifty. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function StatCardLight({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <div className="text-center">
      <p className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">{value}</p>
      <p className="text-white/80 mt-2 text-sm sm:text-base">{label}</p>
    </div>
  )
}

function FeatureItem({
  children,
  highlight
}: {
  children: React.ReactNode
  highlight?: string
}) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" aria-hidden="true" />
      <span className="text-muted-foreground">
        {highlight && <span className="font-medium text-foreground">{highlight}</span>}{' '}
        {children}
      </span>
    </li>
  )
}

function TrustCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 md:p-6 border border-slate-700">
      <div className="h-10 w-10 mb-4 rounded-lg bg-brand-500/30 flex items-center justify-center">
        <Icon className="h-5 w-5 text-brand-400" aria-hidden="true" />
      </div>
      <h3 className="font-semibold mb-2 text-white">{title}</h3>
      <p className="text-slate-300 text-sm">{description}</p>
    </div>
  )
}

function AgencyFeature({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="bg-muted rounded-xl p-5 md:p-6 text-center">
      <h3 className="font-semibold text-base sm:text-lg mb-2">{title}</h3>
      <p className="text-brand-600 dark:text-brand-400 text-sm">{description}</p>
    </div>
  )
}

function TestimonialCard({
  quote,
  author,
  role,
  company,
}: {
  quote: string
  author: string
  role: string
  company?: string
}) {
  return (
    <div className="bg-card rounded-xl p-5 md:p-6 border border-border">
      <Quote className="h-8 w-8 text-brand-500/30 mb-4" aria-hidden="true" />
      <p className="text-foreground mb-4 text-sm sm:text-base leading-relaxed">
        "{quote}"
      </p>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center shrink-0">
          <span className="text-brand-600 dark:text-brand-400 font-semibold text-sm">
            {author.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div>
          <p className="font-semibold text-foreground">{author}</p>
          <p className="text-sm text-muted-foreground">{role}</p>
          {company && <p className="text-xs text-muted-foreground/80">{company}</p>}
        </div>
      </div>
    </div>
  )
}
