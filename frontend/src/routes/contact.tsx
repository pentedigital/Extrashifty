import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { Mail, MessageSquare, Building2, MapPin, Loader2 } from 'lucide-react'
import { SkipLink } from '@/components/Layout/SkipLink'
import { PublicNav } from '@/components/Layout/PublicNav'
import { PublicFooter } from '@/components/Layout/PublicFooter'

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
})

type ContactFormData = z.infer<typeof contactSchema>

export const Route = createFileRoute('/contact')({
  component: ContactPage,
})

function ContactPage() {
  const { addToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (formData: ContactFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/v1/utils/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) throw new Error('Failed to send message')

      addToast({
        type: 'success',
        title: 'Message sent!',
        description: "We'll get back to you within 24 hours.",
      })

      reset()
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to send',
        description: 'Something went wrong. Please try again or email us directly.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SkipLink />
      <PublicNav currentPage="contact" />

      <main id="main" className="pt-24 md:pt-32 pb-16 px-4 sm:px-6">
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
              <ContactOption
                icon={MapPin}
                title="Office"
                description="Visit us"
                action="Dublin, Ireland"
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
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      {...register('name')}
                      aria-invalid={errors.name ? 'true' : 'false'}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      {...register('email')}
                      aria-invalid={errors.email ? 'true' : 'false'}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="How can we help?"
                      {...register('subject')}
                      aria-invalid={errors.subject ? 'true' : 'false'}
                    />
                    {errors.subject && (
                      <p className="text-sm text-destructive">{errors.subject.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more about your inquiry..."
                      rows={5}
                      {...register('message')}
                      aria-invalid={errors.message ? 'true' : 'false'}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <PublicFooter
        simpleLinks={[
          { to: '/', label: 'Home' },
          { to: '/about', label: 'About' },
          { to: '/pricing', label: 'Pricing' },
        ]}
      />
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
  href?: string
}) {
  return (
    <div className="p-6 rounded-xl bg-card border border-border">
      <div className="h-10 w-10 rounded-lg bg-brand-500/10 flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      {href ? (
        <a
          href={href}
          className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
        >
          {action}
        </a>
      ) : (
        <span className="text-sm font-medium text-foreground">{action}</span>
      )}
    </div>
  )
}
