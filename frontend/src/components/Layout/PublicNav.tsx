import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Logo } from '@/components/Logo'
import { Menu } from 'lucide-react'

interface PublicNavProps {
  currentPage?: 'about' | 'pricing' | 'contact'
}

export function PublicNav({ currentPage }: PublicNavProps) {
  const navLinkClass = (page: string) => {
    const isActive = currentPage === page
    return isActive
      ? 'text-sm font-medium text-foreground'
      : 'text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium'
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
      role="navigation"
      aria-label="Main navigation"
    >
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
                <Link
                  to="/about"
                  className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium"
                >
                  About
                </Link>
                <Link
                  to="/pricing"
                  className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium"
                >
                  Pricing
                </Link>
                <Link
                  to="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium"
                >
                  Contact
                </Link>
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="text-sm text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:underline transition-colors [&.active]:text-foreground [&.active]:font-medium"
                >
                  Get started
                </Link>
              </div>
            </SheetContent>
          </Sheet>
          <div className="hidden md:flex items-center gap-4 mr-4">
            <Link to="/about" className={navLinkClass('about')}>
              About
            </Link>
            <Link to="/pricing" className={navLinkClass('pricing')}>
              Pricing
            </Link>
            <Link to="/contact" className={navLinkClass('contact')}>
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
  )
}
