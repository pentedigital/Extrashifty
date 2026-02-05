import { Link } from '@tanstack/react-router'
import { Home, ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/Logo'

interface NotFoundProps {
  /** Custom title for the 404 page */
  title?: string
  /** Custom description message */
  description?: string
  /** Whether to show within authenticated layout (no full page chrome) */
  minimal?: boolean
}

export function NotFound({
  title = 'Page not found',
  description = "Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you may have mistyped the URL.",
  minimal = false,
}: NotFoundProps) {
  const content = (
    <div className="text-center">
      {/* 404 Illustration */}
      <div className="mb-8">
        <div className="relative mx-auto w-fit">
          <span className="text-[120px] font-bold text-muted-foreground/20 leading-none select-none">
            404
          </span>
          <Search className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 text-muted-foreground" />
        </div>
      </div>

      {/* Message */}
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3">
        {title}
      </h1>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        {description}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button asChild>
          <Link to="/dashboard">
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Link>
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    </div>
  )

  if (minimal) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        {content}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-8 pb-10">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          {content}
        </CardContent>
      </Card>
    </div>
  )
}
