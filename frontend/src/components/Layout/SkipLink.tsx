interface SkipLinkProps {
  targetId?: string
  children?: React.ReactNode
}

export function SkipLink({ targetId = 'main', children = 'Skip to main content' }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-600 focus:text-white focus:rounded-md"
    >
      {children}
    </a>
  )
}
