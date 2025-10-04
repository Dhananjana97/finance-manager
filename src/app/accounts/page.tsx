"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, DollarSign, TrendingUp, TrendingDown, Eye } from "lucide-react";
import { AccountType } from "@/generated/prisma";

interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  description?: string;
}

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

const COMMON_CURRENCIES: Currency[] = [
  { code: 'LKR', symbol: 'Rs.', name: 'Sri Lankan Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
];
export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "ASSET" as AccountType,
    currency: "LKR",
    description: "",
    initialBalance: "",
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts");
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchAccounts();
        setFormData({ 
          name: "", 
          type: "ASSET", 
          currency: "LKR", 
          description: "", 
          initialBalance: "" 
        });
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error("Error creating account:", error);
    }
  };

  const getAccountTypeIcon = (type: AccountType) => {
    switch (type) {
      case "ASSET":
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case "LIABILITY":
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      case "INCOME":
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case "EXPENSE":
        return <TrendingDown className="h-5 w-5 text-orange-600" />;
    }
  };

  const getAccountTypeColor = (type: AccountType) => {
    switch (type) {
      case "ASSET":
        return "bg-green-50 border-green-200";
      case "LIABILITY":
        return "bg-red-50 border-red-200";
      case "INCOME":
        return "bg-blue-50 border-blue-200";
      case "EXPENSE":
        return "bg-orange-50 border-orange-200";
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = COMMON_CURRENCIES.find(c => c.code === currencyCode);
    return currency?.symbol || currencyCode;
  };

  const formatCurrency = (amount: number, currencyCode: string) => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
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
          <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
          <p className="mt-2 text-gray-600">Manage your financial accounts</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Account
        </button>
      </div>

      {/* Create Account Form */}
      {showCreateForm && (
        <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                >
                  <option value="ASSET">Asset</option>
                  <option value="LIABILITY">Liability</option>
                  <option value="INCOME">Income</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                >
                  {COMMON_CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name} ({currency.symbol})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.initialBalance}
                  onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-white"
                rows={3}
              />
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create Account
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

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <div key={account.id} className={`p-6 rounded-lg border ${getAccountTypeColor(account.type)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                {getAccountTypeIcon(account.type)}
                <span className="ml-2 text-lg font-semibold text-gray-900">{account.name}</span>
              </div>
              <Link href={`/accounts/${account.id}`} className="text-gray-500 hover:text-gray-700">
                <Eye className="h-5 w-5" />
              </Link>
            </div>

            <div className="text-2xl font-bold text-gray-900 mb-2">
              {formatCurrency(account.balance, account.currency)}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span className="capitalize">{account.type.toLowerCase()}</span>
              <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                {account.currency}
              </span>
            </div>

            {account.description && <div className="text-sm text-gray-500">{account.description}</div>}
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts yet</h3>
          <p className="text-gray-500 mb-4">Create your first account to start managing your finances</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Account
          </button>
        </div>
      )}
    </div>
  );
}
