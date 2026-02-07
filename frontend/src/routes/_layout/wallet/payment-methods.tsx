import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  CreditCard,
  Building,
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Star,
  Check,
} from 'lucide-react'
import {
  usePaymentMethods,
  useAddPaymentMethod,
  useRemovePaymentMethod,
  type PaymentMethodType,
} from '@/hooks/api/useWalletApi'
import { useToast } from '@/components/ui/toast'

export const Route = createFileRoute('/_layout/wallet/payment-methods')({
  component: PaymentMethodsPage,
})

const paymentTypeOptions = [
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'bank_account', label: 'Bank Account' },
]

const cardBrandOptions = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'amex', label: 'American Express' },
]

function PaymentMethodsPage() {
  const { addToast } = useToast()
  const { data, isLoading, error } = usePaymentMethods()
  const addPaymentMethod = useAddPaymentMethod()
  const removePaymentMethod = useRemovePaymentMethod()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Add form state
  const [formType, setFormType] = useState<PaymentMethodType>('card')
  const [formLastFour, setFormLastFour] = useState('')
  const [formBrand, setFormBrand] = useState('visa')
  const [formIsDefault, setFormIsDefault] = useState(false)
  const [formError, setFormError] = useState('')

  const paymentMethods = data?.items ?? []

  const handleAdd = async () => {
    if (!formLastFour || formLastFour.length !== 4 || !/^\d{4}$/.test(formLastFour)) {
      setFormError('Please enter the last 4 digits of your card or account')
      return
    }

    try {
      await addPaymentMethod.mutateAsync({
        type: formType,
        last_four: formLastFour,
        brand: formType === 'card' ? formBrand : undefined,
        is_default: formIsDefault,
      })
      addToast({
        type: 'success',
        title: 'Payment method added',
        description: 'Your payment method has been added successfully.',
      })
      setIsAddOpen(false)
      resetForm()
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to add payment method. Please try again.',
      })
    }
  }

  const handleRemove = async () => {
    if (!deleteId) return

    try {
      await removePaymentMethod.mutateAsync(deleteId)
      addToast({
        type: 'success',
        title: 'Payment method removed',
        description: 'Your payment method has been removed successfully.',
      })
      setDeleteId(null)
    } catch {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to remove payment method. Please try again.',
      })
    }
  }

  const resetForm = () => {
    setFormType('card')
    setFormLastFour('')
    setFormBrand('visa')
    setFormIsDefault(false)
    setFormError('')
  }

  const getPaymentMethodIcon = (type: PaymentMethodType) => {
    switch (type) {
      case 'card':
        return <CreditCard className="h-5 w-5" />
      case 'bank_account':
        return <Building className="h-5 w-5" />
      default:
        return <CreditCard className="h-5 w-5" />
    }
  }

  const formatPaymentMethodName = (method: {
    type: PaymentMethodType
    brand: string | null
    last_four: string
  }) => {
    if (method.type === 'card') {
      const brandName = method.brand
        ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1)
        : 'Card'
      return `${brandName} ending in ${method.last_four}`
    }
    return `Bank account ending in ${method.last_four}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/wallet">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Payment Methods</h1>
          <p className="text-muted-foreground">Manage your saved payment methods</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Payment Method
        </Button>
      </div>

      {/* Payment Methods List */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Payment Methods</CardTitle>
          <CardDescription>
            Your saved cards and bank accounts for withdrawals and top-ups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <EmptyState
              icon={CreditCard}
              title="Error loading payment methods"
              description="There was an error loading your payment methods. Please try again."
            />
          ) : paymentMethods.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No payment methods"
              description="Add a payment method to make withdrawals or top-ups easier."
              action={
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Payment Method
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-full">
                      {getPaymentMethodIcon(method.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{formatPaymentMethodName(method)}</p>
                        {method.is_default && (
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {method.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(method.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Method Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => {
        setIsAddOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
            <DialogDescription>
              Add a new card or bank account to your wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type">Payment Type</Label>
              <Select
                id="type"
                value={formType}
                onChange={(e) => {
                  setFormType(e.target.value as PaymentMethodType)
                  setFormError('')
                }}
                options={paymentTypeOptions}
              />
            </div>

            {formType === 'card' && (
              <div className="space-y-2">
                <Label htmlFor="brand">Card Brand</Label>
                <Select
                  id="brand"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  options={cardBrandOptions}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="lastFour">
                Last 4 Digits {formType === 'card' ? 'of Card Number' : 'of Account Number'}
              </Label>
              <Input
                id="lastFour"
                value={formLastFour}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setFormLastFour(value)
                  setFormError('')
                }}
                placeholder="1234"
                maxLength={4}
              />
              {formError && <p className="text-sm text-destructive">{formError}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="isDefault" className="font-normal">
                Set as default payment method
              </Label>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Note: This is a simplified form for demo purposes. In a production environment,
                you would integrate with a payment provider like Stripe for secure card handling.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddOpen(false)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addPaymentMethod.isPending}>
              {addPaymentMethod.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Add Payment Method
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this payment method? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleRemove}
              disabled={removePaymentMethod.isPending}
            >
              {removePaymentMethod.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
