import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ArrowLeft,
  CreditCard,
  Building,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Shield,
  Loader2,
  Plus,
} from 'lucide-react'
import { useConnectAccountStatus, useConnectOnboardingLink, type ConnectAccountStatus } from '@/hooks/api/usePaymentsApi'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/toast'

export const Route = createFileRoute('/_layout/settings/payment-setup')({
  component: PaymentSetupPage,
})

function PaymentSetupPage() {
  const { isStaff, isAgency } = useAuth()
  const { addToast } = useToast()

  const { data: connectStatus, isLoading, refetch } = useConnectAccountStatus()
  const getOnboardingLink = useConnectOnboardingLink()

  const status = connectStatus?.status ?? 'not_started'
  const isOnboardingComplete = connectStatus?.is_onboarding_complete ?? false
  const payoutsEnabled = connectStatus?.payouts_enabled ?? false
  const bankAccounts = connectStatus?.bank_accounts ?? []
  const requirements = connectStatus?.requirements

  const accountType = isStaff ? 'express' : 'standard'

  const getStatusBadge = (status: ConnectAccountStatus) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending Verification
          </Badge>
        )
      case 'restricted':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Restricted
          </Badge>
        )
      case 'not_started':
      default:
        return (
          <Badge variant="outline" className="gap-1">
            Not Started
          </Badge>
        )
    }
  }

  const handleStartOnboarding = async () => {
    try {
      const result = await getOnboardingLink.mutateAsync(accountType)
      // In production, this would redirect to Stripe
      window.open(result.url, '_blank')
      addToast({
        type: 'success',
        title: 'Opening Stripe...',
        description: 'Complete your account setup in the new window.',
      })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to generate onboarding link. Please try again.',
      })
    }
  }

  const handleRefresh = () => {
    refetch()
    addToast({
      type: 'success',
      title: 'Refreshed',
      description: 'Account status updated.',
    })
  }

  // Show for staff or agency only
  if (!isStaff && !isAgency && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Payment Setup</h1>
            <p className="text-muted-foreground">Configure how you receive payments</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={AlertCircle}
              title="Not available"
              description="Payment setup is only available for staff and agency users."
              action={
                <Link to="/settings">
                  <Button>Back to Settings</Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Payment Setup</h1>
          <p className="text-muted-foreground">
            {isStaff ? 'Set up how you receive your earnings' : 'Set up how your agency receives payments'}
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Status
        </Button>
      </div>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Status
              </CardTitle>
              <CardDescription>
                {isStaff ? 'Stripe Express Connect' : 'Stripe Standard Connect'} for secure payments
              </CardDescription>
            </div>
            {!isLoading && getStatusBadge(status)}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[80px]" />
              <Skeleton className="h-[40px] w-40" />
            </div>
          ) : status === 'not_started' ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Why set up Stripe Connect?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    Receive payments directly to your bank account
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    Secure, verified payment processing
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    {isStaff ? 'Get paid every Friday or instantly' : 'Receive earnings from client payments'}
                  </li>
                </ul>
              </div>
              <Button onClick={handleStartOnboarding} disabled={getOnboardingLink.isPending} className="gap-2">
                {getOnboardingLink.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          ) : status === 'pending' ? (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-2">Verification in Progress</h3>
                <p className="text-sm text-yellow-700">
                  Your account is being verified. This usually takes 1-2 business days.
                  We'll notify you once verification is complete.
                </p>
              </div>
              {requirements?.currently_due && requirements.currently_due.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Action Required</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Please complete the following requirements:
                  </p>
                  <ul className="space-y-1 text-sm">
                    {requirements.currently_due.map((req, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        {req.replace(/_/g, ' ')}
                      </li>
                    ))}
                  </ul>
                  <Button onClick={handleStartOnboarding} className="mt-4 gap-2" size="sm">
                    Complete Requirements
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : status === 'active' ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-green-800">Account Verified</h3>
                  <p className="text-sm text-green-700">
                    Your account is set up and ready to receive payments.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Payouts</p>
                  <p className="font-medium flex items-center gap-2">
                    {payoutsEnabled ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        Pending Setup
                      </>
                    )}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Bank Accounts</p>
                  <p className="font-medium">{bankAccounts.length} connected</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-medium text-red-800 mb-2">Account Restricted</h3>
                <p className="text-sm text-red-700">
                  Your account has restrictions. Please update your information to continue receiving payments.
                </p>
              </div>
              <Button onClick={handleStartOnboarding} disabled={getOnboardingLink.isPending} className="gap-2">
                {getOnboardingLink.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    Update Information
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Accounts */}
      {status !== 'not_started' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Bank Accounts
                </CardTitle>
                <CardDescription>
                  Bank accounts linked for payouts
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-[60px]" />
                <Skeleton className="h-[60px]" />
              </div>
            ) : bankAccounts.length === 0 ? (
              <EmptyState
                icon={Building}
                title="No bank accounts"
                description="Add a bank account to receive payouts."
                action={
                  <Button onClick={handleStartOnboarding} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Bank Account
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {bankAccounts.map((bank) => (
                  <div
                    key={bank.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-full">
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{bank.bank_name}</p>
                        <p className="text-sm text-muted-foreground">****{bank.last_four}</p>
                      </div>
                    </div>
                    {bank.is_default && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                ))}
                <Button variant="outline" onClick={handleStartOnboarding} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add Another Bank Account
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Related Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link to="/wallet/payment-methods">
              <Button variant="outline" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Methods
              </Button>
            </Link>
            {isStaff && (
              <Link to="/staff/earnings">
                <Button variant="outline" className="gap-2">
                  <Building className="h-4 w-4" />
                  View Earnings
                </Button>
              </Link>
            )}
            {isAgency && (
              <Link to="/agency/billing/earnings">
                <Button variant="outline" className="gap-2">
                  <Building className="h-4 w-4" />
                  View Earnings
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
