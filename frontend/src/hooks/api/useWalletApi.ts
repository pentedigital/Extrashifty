import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Transaction,
  TransactionType,
  TransactionStatus,
  Wallet,
  PaymentMethod,
  PaymentMethodType,
} from '@/types/payment'

// Re-export types for backwards compatibility
export type { Transaction, TransactionType, TransactionStatus, Wallet, PaymentMethod, PaymentMethodType }

export const walletKeys = {
  all: ['wallet'] as const,
  balance: () => [...walletKeys.all, 'balance'] as const,
  transactions: () => [...walletKeys.all, 'transactions'] as const,
  transactionList: (params?: {
    skip?: number
    limit?: number
    type?: TransactionType
    status?: TransactionStatus
  }) => [...walletKeys.transactions(), params] as const,
  paymentMethods: () => [...walletKeys.all, 'payment-methods'] as const,
}

export function useWalletBalance() {
  return useQuery({
    queryKey: walletKeys.balance(),
    queryFn: () => api.wallet.getBalance(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useWalletTransactions(params?: {
  skip?: number
  limit?: number
  type?: TransactionType
  status?: TransactionStatus
}) {
  return useQuery({
    queryKey: walletKeys.transactionList(params),
    queryFn: () => api.wallet.getTransactions(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: walletKeys.paymentMethods(),
    queryFn: () => api.wallet.getPaymentMethods(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useWithdraw() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { amount: number; payment_method_id: number }) =>
      api.wallet.withdraw(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletKeys.balance() })
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions() })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to withdraw funds:', error)
    },
  })
}

export function useTopUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { amount: number; payment_method_id: number }) =>
      api.wallet.topUp(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletKeys.balance() })
      queryClient.invalidateQueries({ queryKey: walletKeys.transactions() })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to top up wallet:', error)
    },
  })
}

export function useAddPaymentMethod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      type: PaymentMethodType
      last_four: string
      brand?: string
      is_default?: boolean
      external_id?: string
    }) => api.wallet.addPaymentMethod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletKeys.paymentMethods() })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to add payment method:', error)
    },
  })
}

export function useRemovePaymentMethod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (paymentMethodId: number) =>
      api.wallet.removePaymentMethod(paymentMethodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletKeys.paymentMethods() })
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Failed to remove payment method:', error)
    },
  })
}
