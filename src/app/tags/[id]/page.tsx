"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, DollarSign } from "lucide-react";

// Currency information
const CURRENCY_INFO = {
  LKR: { symbol: "Rs.", name: "Sri Lankan Rupee" },
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
  CHF: { symbol: "CHF", name: "Swiss Franc" },
  CNY: { symbol: "¥", name: "Chinese Yuan" },
  INR: { symbol: "₹", name: "Indian Rupee" },
  BRL: { symbol: "R$", name: "Brazilian Real" },
  KRW: { symbol: "₩", name: "South Korean Won" },
  THB: { symbol: "฿", name: "Thai Baht" },
} as const;

interface TagData {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  transactionType: string;
  tag?: TagData;
  entries: {
    id: string;
    account: {
      id: string;
      name: string;
      type: string;
      currency: string;
    };
    debitAmount: number;
    creditAmount: number;
    entryType: string;
    originalAmount?: number;
    originalCurrency?: string;
    exchangeRate?: number;
  }[];
}

interface TagSummaryResponse {
  transactions: Transaction[];
  assetTotals: { accountId: string; accountName: string; total: number; currency: string }[];
  totalAmount: number;
}

export default function TagDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tag, setTag] = useState<TagData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [assetTotals, setAssetTotals] = useState<
    { accountId: string; accountName: string; total: number; currency: string }[]
  >([]);

  useEffect(() => {
    if (params.id) {
      fetchTagData(params.id as string);
    }
  }, [params.id]);

  const fetchTagData = async (tagId: string) => {
    try {
      const [tagsRes, transactionsRes] = await Promise.all([
        fetch("/api/tags"),
        fetch(`/api/tags/${tagId}/transactions`),
      ]);

      const tags = await tagsRes.json();
      const tagData = tags.find((t: TagData) => t.id === tagId);
      const summary: TagSummaryResponse = await transactionsRes.json();

      setTag(tagData);
      setTransactions(summary.transactions);
      setTotalAmount(summary.totalAmount);
      setAssetTotals(summary.assetTotals);
    } catch (error) {
      console.error("Error fetching tag data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = CURRENCY_INFO[currencyCode as keyof typeof CURRENCY_INFO];
    return currency?.symbol || currencyCode;
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-LK");
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "INCOME":
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case "EXPENSE":
        return <DollarSign className="h-4 w-4 text-red-600" />;
      case "TRANSFER":
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionAmount = (transaction: Transaction) => {
    // For display purposes, show the transaction amount in the primary currency
    const debitEntry = transaction.entries.find((e) => e.entryType === "DEBIT");

    if (debitEntry) {
      return {
        amount: debitEntry.debitAmount,
        currency: debitEntry.account.currency,
        isConverted: !!(debitEntry.originalAmount && debitEntry.originalCurrency && debitEntry.exchangeRate),
        originalAmount: debitEntry.originalAmount,
        originalCurrency: debitEntry.originalCurrency,
        exchangeRate: debitEntry.exchangeRate,
      };
    }

    return {
      amount: transaction.amount,
      currency: "USD",
      isConverted: false,
      originalAmount: transaction.amount,
      originalCurrency: "USD",
      exchangeRate: 1,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tag not found</h1>
          <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-800">
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <button onClick={() => router.back()} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tags
        </button>

        <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full mr-3" style={{ backgroundColor: tag.color || "#6B7280" }}></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{tag.name}</h1>
                {tag.description && <p className="text-gray-600">{tag.description}</p>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(totalAmount, "LKR")}</div>
              <div className="text-sm text-gray-600">Total Amount (Mixed Currencies)</div>
            </div>
          </div>

          {assetTotals && assetTotals.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Asset-wise totals</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {assetTotals.map((a) => (
                  <div key={a.accountId} className="p-3 rounded border border-gray-200 bg-white">
                    <div className="text-sm text-gray-700">{a.accountName}</div>
                    <div className="text-base font-semibold text-gray-900">{formatCurrency(a.total, a.currency)}</div>
                    <div className="text-xs text-gray-500">{a.currency}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
          <p className="text-sm text-gray-600">{transactions?.length} transactions</p>
        </div>

        {!transactions || transactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-500">Transactions with this tag will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => {
              const amountData = getTransactionAmount(transaction);

              return (
                <div key={transaction.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        {getTransactionIcon(transaction.transactionType)}
                        <div className="ml-2 text-sm font-medium text-gray-900">{transaction.description}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(transaction.date)} • {transaction.transactionType.toLowerCase()}
                        {amountData.isConverted && (
                          <span className="ml-2 text-xs text-blue-600">
                            (converted from {amountData.originalCurrency})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Accounts:{" "}
                        {transaction.entries.map((e) => `${e.account.name} (${e.account.currency})`).join(", ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(amountData.amount, amountData.currency)}
                      </div>
                      {amountData.isConverted && amountData.originalAmount && amountData.originalCurrency && (
                        <div className="text-xs text-gray-500">
                          Original: {formatCurrency(amountData.originalAmount, amountData.originalCurrency)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
