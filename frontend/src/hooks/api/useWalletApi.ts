import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export const walletKeys = {
  all: ['wallet'] as const,
  balance: () => [...walletKeys.all, 'balance'] as const,
  transactions: () => [...walletKeys.all, 'transactions'] as const,
  transactionList: (params?: {
    skip?: number
    limit?: number
    type?: 'earning' | 'withdrawal' | 'top_up' | 'payment'
    status?: 'pending' | 'completed' | 'failed'
  }) => [...walletKeys.transactions(), params] as const,
  paymentMethods: () => [...walletKeys.all, 'payment-methods'] as const,
}

export type TransactionType = 'earning' | 'withdrawal' | 'top_up' | 'payment'
export type TransactionStatus = 'pending' | 'completed' | 'failed'
export type PaymentMethodType = 'card' | 'bank_account'

export interface Wallet {
  id: number
  user_id: number
  balance: number
  currency: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: number
  wallet_id: number
  type: TransactionType
  amount: number
  description: string
  status: TransactionStatus
  reference_id: string | null
  created_at: string
}

export interface PaymentMethod {
  id: number
  user_id: number
  type: PaymentMethodType
  last_four: string
  brand: string | null
  is_default: boolean
  created_at: string
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
  })
}
