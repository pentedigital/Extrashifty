import { Building, CreditCard, Star, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'

interface PaymentMethod {
  id: string
  type: 'card' | 'bank_account'
  last_four: string
  brand?: string
  bank_name?: string
  is_default: boolean
}

interface PaymentMethodSelectorProps {
  methods: PaymentMethod[]
  selectedId: string
  onSelect: (id: string) => void
  allowedTypes?: ('card' | 'bank_account')[]
  showAddButton?: boolean
  className?: string
}

export function PaymentMethodSelector({
  methods,
  selectedId,
  onSelect,
  allowedTypes,
  showAddButton = true,
  className,
}: PaymentMethodSelectorProps) {
  const filteredMethods = allowedTypes
    ? methods.filter(m => allowedTypes.includes(m.type))
    : methods

  const getMethodIcon = (method: PaymentMethod) => {
    if (method.type === 'bank_account') {
      return <Building className="h-5 w-5" />
    }
    return <CreditCard className="h-5 w-5" />
  }

  const getMethodLabel = (method: PaymentMethod) => {
    if (method.type === 'bank_account') {
      return method.bank_name ? `${method.bank_name} ****${method.last_four}` : `Bank ****${method.last_four}`
    }
    const brandName = method.brand
      ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1)
      : 'Card'
    return `${brandName} ****${method.last_four}`
  }

  if (filteredMethods.length === 0 && !showAddButton) {
    return (
      <div className={cn('p-4 text-center text-muted-foreground', className)}>
        No payment methods available
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {filteredMethods.map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => onSelect(method.id)}
          className={cn(
            'w-full flex items-center justify-between p-4 border rounded-lg transition-colors',
            selectedId === method.id
              ? 'border-brand-600 bg-brand-50'
              : 'border-border hover:bg-muted/50'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-full',
              selectedId === method.id ? 'bg-brand-100' : 'bg-muted'
            )}>
              {getMethodIcon(method)}
            </div>
            <div className="text-left">
              <p className="font-medium">{getMethodLabel(method)}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {method.type.replace('_', ' ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {method.is_default && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-warning text-warning" />
                Default
              </span>
            )}
            <div
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                selectedId === method.id
                  ? 'border-brand-600 bg-brand-600'
                  : 'border-gray-300'
              )}
            >
              {selectedId === method.id && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </div>
        </button>
      ))}

      {showAddButton && (
        <Link to="/wallet/payment-methods">
          <Button variant="outline" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Payment Method
          </Button>
        </Link>
      )}
    </div>
  )
}

// Compact version for inline use
interface PaymentMethodBadgeProps {
  method: PaymentMethod
  className?: string
}

export function PaymentMethodBadge({ method, className }: PaymentMethodBadgeProps) {
  const getMethodIcon = () => {
    if (method.type === 'bank_account') {
      return <Building className="h-3 w-3" />
    }
    return <CreditCard className="h-3 w-3" />
  }

  return (
    <span className={cn('inline-flex items-center gap-1 text-sm', className)}>
      {getMethodIcon()}
      <span>****{method.last_four}</span>
    </span>
  )
}
