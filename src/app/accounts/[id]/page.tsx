'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Calendar, Tag } from 'lucide-react'
import { AccountType } from '@/generated/prisma'

// Currency information
const CURRENCY_INFO = {
  LKR: { symbol: 'Rs.', name: 'Sri Lankan Rupee' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  CHF: { symbol: 'CHF', name: 'Swiss Franc' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
  BRL: { symbol: 'R$', name: 'Brazilian Real' },
  KRW: { symbol: '₩', name: 'South Korean Won' },
  THB: { symbol: '฿', name: 'Thai Baht' },
} as const

interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  description?: string
}

interface Transaction {
  id: string
  description: string
  amount: number
  date: string
  transactionType: string
  tag?: {
    id: string
    name: string
    color?: string
  }
  entries: {
    id: string
    account: Account
    debitAmount: number
    creditAmount: number
    entryType: string
    originalAmount?: number
    originalCurrency?: string
    exchangeRate?: number
  }[]
}

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [account, setAccount] = useState<Account | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchAccountData(params.id as string)
    }
  }, [params.id])

  const fetchAccountData = async (accountId: string) => {
    try {
      const [accountRes, transactionsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch(`/api/accounts/${accountId}/transactions`)
      ])
      
      const accounts = await accountRes.json()
      const accountData = accounts.find((acc: Account) => acc.id === accountId)
      const transactionsData = await transactionsRes.json()
      
      setAccount(accountData)
      setTransactions(transactionsData)
    } catch (error) {
      console.error('Error fetching account data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAccountTypeIcon = (type: AccountType) => {
    switch (type) {
      case 'ASSET':
        return <DollarSign className="h-6 w-6 text-green-600" />
      case 'LIABILITY':
        return <TrendingDown className="h-6 w-6 text-red-600" />
      case 'INCOME':
        return <TrendingUp className="h-6 w-6 text-blue-600" />
      case 'EXPENSE':
        return <TrendingDown className="h-6 w-6 text-orange-600" />
    }
  }

  const getAccountTypeColor = (type: AccountType) => {
    switch (type) {
      case 'ASSET':
        return 'bg-green-50 border-green-200'
      case 'LIABILITY':
        return 'bg-red-50 border-red-200'
      case 'INCOME':
        return 'bg-blue-50 border-blue-200'
      case 'EXPENSE':
        return 'bg-orange-50 border-orange-200'
    }
  }

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = CURRENCY_INFO[currencyCode as keyof typeof CURRENCY_INFO]
    return currency?.symbol || currencyCode
  }

  const formatCurrency = (amount: number, currencyCode: string) => {
    const symbol = getCurrencySymbol(currencyCode)
    return `${symbol}${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-LK')
  }

  const getTransactionAmount = (transaction: Transaction, accountId: string) => {
    const entry = transaction.entries.find(e => e.account.id === accountId)
    if (!entry) return { amount: 0, currency: 'USD', isConverted: false, originalAmount: 0, originalCurrency: 'USD', exchangeRate: 1 }
    
    const amount = entry.entryType === 'DEBIT' ? entry.debitAmount : -entry.creditAmount
    const currency = entry.account.currency
    const isConverted = !!(entry.originalAmount && entry.originalCurrency && entry.exchangeRate)
    
    return {
      amount,
      currency,
      isConverted,
      originalAmount: entry.originalAmount || amount,
      originalCurrency: entry.originalCurrency || currency,
      exchangeRate: entry.exchangeRate || 1
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Account not found</h1>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Accounts
        </button>
        
        <div className={`p-6 rounded-lg border ${getAccountTypeColor(account.type)}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              {getAccountTypeIcon(account.type)}
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
                <p className="text-sm text-gray-600 capitalize">{account.type.toLowerCase()}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(account.balance, account.currency)}
              </div>
              <div className="text-sm text-gray-600">Current Balance</div>
              <div className="text-xs text-gray-500 mt-1">
                {account.currency} - {CURRENCY_INFO[account.currency as keyof typeof CURRENCY_INFO]?.name || account.currency}
              </div>
            </div>
          </div>
          
          {account.description && (
            <p className="text-gray-700">{account.description}</p>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
        </div>
        
        {transactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-500">
              Transactions for this account will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => {
              const amountData = getTransactionAmount(transaction, account.id)
              const isPositive = amountData.amount > 0
              
              return (
                <div key={transaction.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </div>
                        {transaction.tag && (
                          <div className="ml-2 flex items-center">
                            <Tag className="h-3 w-3 mr-1" />
                            <span
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: transaction.tag.color || '#6B7280' }}
                            >
                              {transaction.tag.name}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(transaction.date)} • {transaction.transactionType.toLowerCase()}
                        {amountData.isConverted && (
                          <span className="ml-2 text-xs text-blue-600">
                            (converted from {amountData.originalCurrency})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(Math.abs(amountData.amount), amountData.currency)}
                      </div>
                      {amountData.isConverted && (
                        <div className="text-xs text-gray-500">
                          Original: {formatCurrency(Math.abs(amountData.originalAmount), amountData.originalCurrency)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
