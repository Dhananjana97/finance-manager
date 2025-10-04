"use client";

import { useState, useEffect } from "react";
import { Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from "lucide-react";
import { AccountType } from "@/generated/prisma";

interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
}

interface Tag {
  id: string;
  name: string;
  color?: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  transactionType: string;
  tag?: Tag;
  entries: {
    id: string;
    account: Account;
    debitAmount: number;
    creditAmount: number;
    entryType: string;
    originalAmount?: number;
    originalCurrency?: string;
    exchangeRate?: number;
  }[];
}

export default function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("INCOME");
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Pagination & filters
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [filters, setFilters] = useState<{ accountId?: string; tagId?: string; startDate?: string; endDate?: string }>(
    {}
  );

  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    tagId: "",
    assetAccountId: "",
    incomeAccountId: "",
    expenseAccountId: "",
    fromAccountId: "",
    toAccountId: "",
  });

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Refetch transactions whenever pagination or filters change
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filters]);

  const fetchData = async () => {
    try {
      const [accountsRes, tagsRes] = await Promise.all([fetch("/api/accounts"), fetch("/api/tags")]);

      const accountsData = await accountsRes.json();
      const tagsData = await tagsRes.json();

      setAccounts(accountsData);
      setTags(tagsData);

      await fetchTransactions();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (filters.accountId) params.set("accountId", filters.accountId);
    if (filters.tagId) params.set("tagId", filters.tagId);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);

    const res = await fetch(`/api/transactions?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    setTransactions(data.items || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
  };

  const handleApplyFilters = () => {
    setPage(1);
    fetchTransactions();
  };

  const handleResetFilters = () => {
    setFilters({});
    setPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const transactionData = {
        type: transactionType,
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date),
        tagId: formData.tagId || undefined,
        ...(transactionType === "INCOME" && {
          assetAccountId: formData.assetAccountId,
          incomeAccountId: formData.incomeAccountId,
        }),
        ...(transactionType === "EXPENSE" && {
          assetAccountId: formData.assetAccountId,
          expenseAccountId: formData.expenseAccountId,
        }),
        ...(transactionType === "TRANSFER" && {
          fromAccountId: formData.fromAccountId,
          toAccountId: formData.toAccountId,
        }),
      };

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transactionData),
      });

      if (response.ok) {
        // Reset form
        setFormData({
          description: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          tagId: "",
          assetAccountId: "",
          incomeAccountId: "",
          expenseAccountId: "",
          fromAccountId: "",
          toAccountId: "",
        });
        setSelectedAccount(null);
        setShowCreateForm(false);
        // Refresh accounts & transactions
        fetchData();
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "INCOME":
        return <ArrowUpRight className="h-5 w-5 text-green-600" />;
      case "EXPENSE":
        return <ArrowDownLeft className="h-5 w-5 text-red-600" />;
      case "TRANSFER":
        return <ArrowLeftRight className="h-5 w-5 text-blue-600" />;
      default:
        return <ArrowUpRight className="h-5 w-5 text-gray-600" />;
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      LKR: "Rs.",
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      AUD: "A$",
      CAD: "C$",
      CHF: "CHF",
      CNY: "¥",
      INR: "₹",
      BRL: "R$",
      KRW: "₩",
    };
    return symbols[currency] || currency;
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-LK");
  };

  const getTransactionPrimaryCurrency = (transaction: Transaction) => {
    // For transfers, show the currency of the debit account (destination)
    // For income/expense, show the currency of the asset account
    const debitEntry = transaction.entries.find(e => e.entryType === 'DEBIT');
    if (debitEntry) {
      return debitEntry.account.currency;
    }
    
    // Fallback to first entry's currency
    return transaction.entries[0]?.account.currency || 'USD';
  };

  const getTransactionAmount = (transaction: Transaction) => {
    // For display purposes, show the transaction amount in the primary currency
    const primaryCurrency = getTransactionPrimaryCurrency(transaction);
    const debitEntry = transaction.entries.find(e => e.entryType === 'DEBIT');
    
    if (debitEntry) {
      return {
        amount: debitEntry.debitAmount,
        currency: debitEntry.account.currency,
        isConverted: !!(debitEntry.originalAmount && debitEntry.originalCurrency && debitEntry.exchangeRate),
        originalAmount: debitEntry.originalAmount,
        originalCurrency: debitEntry.originalCurrency,
        exchangeRate: debitEntry.exchangeRate
      };
    }
    
    return {
      amount: transaction.amount,
      currency: primaryCurrency,
      isConverted: false,
      originalAmount: transaction.amount,
      originalCurrency: primaryCurrency,
      exchangeRate: 1
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-2 text-gray-600">Record and manage your financial transactions</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <select
              value={filters.accountId || ""}
              onChange={(e) => setFilters({ ...filters, accountId: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
            <select
              value={filters.tagId || ""}
              onChange={(e) => setFilters({ ...filters, tagId: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            >
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
            <input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
            <input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Apply
          </button>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Reset
          </button>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-gray-700">Page size</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
              className="px-2 py-1 border border-gray-300 rounded-md text-black bg-white"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Create Transaction Form */}
      {showCreateForm && (
        <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Transaction</h2>

          {/* Transaction Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
            <div className="flex space-x-4">
              {[
                { type: "INCOME", label: "Income", icon: ArrowUpRight },
                { type: "EXPENSE", label: "Expense", icon: ArrowDownLeft },
                { type: "TRANSFER", label: "Transfer", icon: ArrowLeftRight },
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTransactionType(type as "INCOME" | "EXPENSE" | "TRANSFER")}
                  className={`flex items-center px-4 py-2 rounded-lg border ${
                    transactionType === type
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Selection First */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {transactionType === "INCOME" && "Select Asset Account (Where money goes)"}
                {transactionType === "EXPENSE" && "Select Asset Account (Where money comes from)"}
                {transactionType === "TRANSFER" && "Select From Account"}
              </label>
              <select
                value={selectedAccount?.id || ""}
                onChange={(e) => {
                  const account = accounts.find((a) => a.id === e.target.value);
                  setSelectedAccount(account || null);
                  if (transactionType === "INCOME") {
                    setFormData({ ...formData, assetAccountId: e.target.value });
                  } else if (transactionType === "EXPENSE") {
                    setFormData({ ...formData, assetAccountId: e.target.value });
                  } else if (transactionType === "TRANSFER") {
                    setFormData({ ...formData, fromAccountId: e.target.value });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                required
              >
                <option value="">Select account</option>
                {accounts
                  .filter((a) => a.type === "ASSET")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </option>
                  ))}
              </select>
              {selectedAccount && (
                <div className="mt-2 text-sm text-gray-600">
                  Selected: {selectedAccount.name} - Currency: {selectedAccount.currency} (
                  {getCurrencySymbol(selectedAccount.currency)})
                </div>
              )}
            </div>

            {/* Second Account for Transfer */}
            {transactionType === "TRANSFER" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select To Account</label>
                <select
                  value={formData.toAccountId}
                  onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                  required
                >
                  <option value="">Select destination account</option>
                  {accounts
                    .filter((a) => a.type === "ASSET" && a.id !== selectedAccount?.id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount {selectedAccount ? `(${selectedAccount.currency})` : ""}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                  required
                />
                {selectedAccount && (
                  <div className="mt-1 text-xs text-gray-500">
                    Currency: {selectedAccount.currency} ({getCurrencySymbol(selectedAccount.currency)})
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag (Optional)</label>
                <select
                  value={formData.tagId}
                  onChange={(e) => setFormData({ ...formData, tagId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                >
                  <option value="">Select a tag</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Income/Expense Account Selection */}
            {(transactionType === "INCOME" || transactionType === "EXPENSE") && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {transactionType === "INCOME" && "Select Income Account (Income source)"}
                  {transactionType === "EXPENSE" && "Select Expense Account (Expense category)"}
                </label>
                <select
                  value={transactionType === "INCOME" ? formData.incomeAccountId : formData.expenseAccountId}
                  onChange={(e) => {
                    if (transactionType === "INCOME") {
                      setFormData({ ...formData, incomeAccountId: e.target.value });
                    } else {
                      setFormData({ ...formData, expenseAccountId: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                  required
                >
                  <option value="">Select {transactionType.toLowerCase()} account</option>
                  {accounts
                    .filter((a) => a.type === transactionType.toUpperCase())
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Transaction
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {transactions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ArrowUpRight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-500 mb-4">Create your first transaction to start tracking your finances</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Transaction
              </button>
            </div>
          ) : (
            transactions.map((transaction) => {
              const amountData = getTransactionAmount(transaction);
              
              return (
                <div key={transaction.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getTransactionIcon(transaction.transactionType)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(transaction.date)}
                          {transaction.tag && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {transaction.tag.name}
                            </span>
                          )}
                          {amountData.isConverted && (
                            <span className="ml-2 text-xs text-blue-600">
                              (converted from {amountData.originalCurrency})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(amountData.amount, amountData.currency)}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {transaction.transactionType.toLowerCase()}
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
            })
          )}
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">Total: {total}</div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded border border-gray-300 bg-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
