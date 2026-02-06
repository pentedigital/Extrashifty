export function AppFooter() {
  return (
    <footer className="border-t bg-background py-4 px-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ExtraShifty. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-foreground">Help</a>
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
        </div>
      </div>
    </footer>
  )
}
