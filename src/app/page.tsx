"use client";

import { useState, useEffect } from "react";
import { Plus, DollarSign, TrendingUp, TrendingDown, ArrowLeftRight, Tag as TagIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface Account {
  id: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE";
  balance: number;
  description?: string;
}

interface Tag {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Modal state for creating a transaction
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("INCOME");
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
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [accountsRes, tagsRes] = await Promise.all([fetch("/api/accounts"), fetch("/api/tags")]);

      if (!accountsRes.ok || !tagsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const accountsData = await accountsRes.json();
      const tagsData = await tagsRes.json();

      // Ensure we have arrays
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setTags(Array.isArray(tagsData) ? tagsData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data. Please check your database connection.");
      setAccounts([]);
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case "ASSET":
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case "LIABILITY":
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      case "INCOME":
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case "EXPENSE":
        return <TrendingDown className="h-5 w-5 text-orange-600" />;
      default:
        return <DollarSign className="h-5 w-5 text-gray-600" />;
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "ASSET":
        return "bg-green-50 border-green-200";
      case "LIABILITY":
        return "bg-red-50 border-red-200";
      case "INCOME":
        return "bg-blue-50 border-blue-200";
      case "EXPENSE":
        return "bg-orange-50 border-orange-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
    }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      type BasePayload = {
        description: string;
        amount: number;
        date: Date;
        tagId?: string;
      };
      type IncomePayload = BasePayload & {
        type: "INCOME";
        assetAccountId: string;
        incomeAccountId: string;
      };
      type ExpensePayload = BasePayload & {
        type: "EXPENSE";
        assetAccountId: string;
        expenseAccountId: string;
      };
      type TransferPayload = BasePayload & {
        type: "TRANSFER";
        fromAccountId: string;
        toAccountId: string;
      };

      let payload: IncomePayload | ExpensePayload | TransferPayload;

      if (transactionType === "INCOME") {
        payload = {
          type: "INCOME",
          description: formData.description,
          amount: parseFloat(formData.amount),
          date: new Date(formData.date),
          tagId: formData.tagId || undefined,
          assetAccountId: formData.assetAccountId,
          incomeAccountId: formData.incomeAccountId,
        };
      } else if (transactionType === "EXPENSE") {
        payload = {
          type: "EXPENSE",
          description: formData.description,
          amount: parseFloat(formData.amount),
          date: new Date(formData.date),
          tagId: formData.tagId || undefined,
          assetAccountId: formData.assetAccountId,
          expenseAccountId: formData.expenseAccountId,
        };
      } else {
        payload = {
          type: "TRANSFER",
          description: formData.description,
          amount: parseFloat(formData.amount),
          date: new Date(formData.date),
          tagId: formData.tagId || undefined,
          fromAccountId: formData.fromAccountId,
          toAccountId: formData.toAccountId,
        };
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create transaction");

      // Reset and refresh dashboard data
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
      setShowCreateForm(false);
      fetchData();
    } catch (err) {
      console.error("Create transaction failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Database Connection Error</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="text-sm text-red-600">
            <p className="mb-2">To fix this issue:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Set up a PostgreSQL database</li>
              <li>Update the DATABASE_URL in your .env file</li>
              <li>
                Run database migrations: <code className="bg-red-100 px-1 rounded">npx prisma migrate dev</code>
              </li>
              <li>
                Seed the database: <code className="bg-red-100 px-1 rounded">npm run db:seed</code>
              </li>
            </ol>
          </div>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Overview of your personal finance accounts and tags</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Transaction
          </button>
          <button
            className="flex items-center justify-center p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            onClick={() => router.push("/accounts")}
          >
            <DollarSign className="h-5 w-5 mr-2" />
            Create Account
          </button>
          <button
            className="flex items-center justify-center p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            onClick={() => router.push("/transactions#transfer")}
          >
            <ArrowLeftRight className="h-5 w-5 mr-2" />
            Transfer Money
          </button>
        </div>
      </div>

      {/* Create Transaction Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateForm(false)}></div>
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-lg border border-gray-200 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add New Transaction</h2>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-600 hover:text-gray-900">
                ✕
              </button>
            </div>
            <div className="p-6">
              {/* Transaction type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
                <div className="flex space-x-3">
                  {[
                    { type: "INCOME", label: "Income", icon: TrendingUp },
                    { type: "EXPENSE", label: "Expense", icon: TrendingDown },
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                      required
                    />
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

                {/* Accounts by type */}
                {transactionType === "INCOME" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Asset Account (Where money goes)
                      </label>
                      <select
                        value={formData.assetAccountId}
                        onChange={(e) => setFormData({ ...formData, assetAccountId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                        required
                      >
                        <option value="">Select asset account</option>
                        {accounts
                          .filter((a) => a.type === "ASSET")
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Income Account (Income source)
                      </label>
                      <select
                        value={formData.incomeAccountId}
                        onChange={(e) => setFormData({ ...formData, incomeAccountId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                        required
                      >
                        <option value="">Select income account</option>
                        {accounts
                          .filter((a) => a.type === "INCOME")
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                {transactionType === "EXPENSE" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Asset Account (Where money comes from)
                      </label>
                      <select
                        value={formData.assetAccountId}
                        onChange={(e) => setFormData({ ...formData, assetAccountId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                        required
                      >
                        <option value="">Select asset account</option>
                        {accounts
                          .filter((a) => a.type === "ASSET")
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expense Account (Expense category)
                      </label>
                      <select
                        value={formData.expenseAccountId}
                        onChange={(e) => setFormData({ ...formData, expenseAccountId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                        required
                      >
                        <option value="">Select expense account</option>
                        {accounts
                          .filter((a) => a.type === "EXPENSE")
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                {transactionType === "TRANSFER" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">From Account</label>
                      <select
                        value={formData.fromAccountId}
                        onChange={(e) => setFormData({ ...formData, fromAccountId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                        required
                      >
                        <option value="">Select source account</option>
                        {accounts
                          .filter((a) => a.type === "ASSET")
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">To Account</label>
                      <select
                        value={formData.toAccountId}
                        onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                        required
                      >
                        <option value="">Select destination account</option>
                        {accounts
                          .filter((a) => a.type === "ASSET")
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Create Transaction
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Overview */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Accounts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts && accounts.length > 0 ? (
            accounts.map((account) => (
              <div key={account.id} className={`p-4 rounded-lg border ${getAccountTypeColor(account.type)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {getAccountTypeIcon(account.type)}
                    <span className="ml-2 text-sm font-medium text-gray-900">{account.name}</span>
                  </div>
                </div>
                <div className="text-lg font-semibold text-gray-900">{formatCurrency(account.balance)}</div>
                <div className="text-xs text-gray-500 capitalize">{account.type.toLowerCase()}</div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts yet</h3>
              <p className="text-gray-500">Create your first account to start managing your finances</p>
            </div>
          )}
        </div>
      </div>

      {/* Tags Overview */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tags</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags && tags.length > 0 ? (
            tags.map((tag) => (
              <div key={tag.id} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: tag.color || "#6B7280" }}></div>
                  <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                </div>
                {tag.description && <div className="text-xs text-gray-500">{tag.description}</div>}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <TagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tags yet</h3>
              <p className="text-gray-500">Create tags to categorize your transactions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
