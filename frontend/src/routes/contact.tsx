import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Mail, MessageSquare, Building2 } from 'lucide-react'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
})

function ContactPage() {
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
              Get in touch
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have a question or need help? We'd love to hear from you.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Options */}
            <div className="space-y-6">
              <ContactOption
                icon={Mail}
                title="Email us"
                description="For general inquiries"
                action="hello@extrashifty.com"
                href="mailto:hello@extrashifty.com"
              />
              <ContactOption
                icon={MessageSquare}
                title="Support"
                description="For existing users"
                action="support@extrashifty.com"
                href="mailto:support@extrashifty.com"
              />
              <ContactOption
                icon={Building2}
                title="Sales"
                description="For enterprise & agencies"
                action="sales@extrashifty.com"
                href="mailto:sales@extrashifty.com"
              />
            </div>

            {/* Contact Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input id="firstName" placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input id="lastName" placeholder="Doe" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="john@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" placeholder="How can we help?" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more about your inquiry..."
                      rows={5}
                    />
                  </div>
                  <Button type="submit" className="w-full sm:w-auto">
                    Send message
                  </Button>
                </form>
              </CardContent>
            </Card>
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

function ContactOption({
  icon: Icon,
  title,
  description,
  action,
  href,
}: {
  icon: React.ElementType
  title: string
  description: string
  action: string
  href: string
}) {
  return (
    <div className="p-6 rounded-xl bg-card border border-border">
      <div className="h-10 w-10 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-brand-600" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <a
        href={href}
        className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
      >
        {action}
      </a>
    </div>
  )
}
