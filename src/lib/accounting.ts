import { prisma } from "./prisma";
import { AccountType } from "@/generated/prisma";
import { currencyService, ConversionResult } from "./currency";

export interface TransactionEntryInput {
  accountId: string;
  entryType: "DEBIT" | "CREDIT";
  amount: number;
  // Currency conversion fields
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
}

export interface TransactionInput {
  description: string;
  amount: number;
  date?: Date;
  tagId?: string;
  transactionType: "INCOME" | "EXPENSE" | "TRANSFER";
  entries: TransactionEntryInput[];
}

export interface IncomeTransaction {
  description: string;
  amount: number;
  date?: Date;
  tagId?: string;
  assetAccountId: string; // Where money goes (debit)
  incomeAccountId: string; // Income source (credit)
}

export interface ExpenseTransaction {
  description: string;
  amount: number;
  date?: Date;
  tagId?: string;
  assetAccountId: string; // Where money comes from (credit)
  expenseAccountId: string; // Expense category (debit)
}

export interface TransferTransaction {
  description: string;
  amount: number;
  date?: Date;
  tagId?: string;
  fromAccountId: string; // Source account (credit)
  toAccountId: string; // Destination account (debit)
}

export interface CurrencyTransferTransaction extends TransferTransaction {
  fromCurrency?: string; // Override source currency
  toCurrency?: string; // Override destination currency
  customExchangeRate?: number; // User-specified exchange rate
}

export class TagBalanceService {
  // Get tag balance across all accounts for a specific currency
  async getTagBalance(tagId: string, currency?: string) {
    const where: { tagId: string; currency?: string } = { tagId };
    if (currency) {
      where.currency = currency;
    }

    const balances = await prisma.tagBalance.findMany({
      where,
      include: {
        account: true,
        tag: true,
      },
    });

    const totalBalance = balances.reduce((sum, balance) => sum + balance.balance.toNumber(), 0);

    return {
      tagId,
      currency: currency || "mixed",
      totalBalance,
      accountBalances: balances.map((balance) => ({
        accountId: balance.accountId,
        accountName: balance.account.name,
        accountCurrency: balance.account.currency,
        balance: balance.balance.toNumber(),
        currency: balance.currency,
      })),
    };
  }

  // Get tag balance for a specific account
  async getTagBalanceInAccount(tagId: string, accountId: string) {
    // Get account first to get the currency
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      return null;
    }

    const balance = await prisma.tagBalance.findFirst({
      where: {
        tagId,
        accountId,
        currency: account.currency,
      },
      include: {
        account: true,
        tag: true,
      },
    });

    return balance
      ? {
          tagId: balance.tagId,
          accountId: balance.accountId,
          balance: balance.balance.toNumber(),
          currency: balance.currency,
          accountName: balance.account.name,
          tagName: balance.tag.name,
        }
      : null;
  }

  // Assign money to a tag (virtual assignment)
  async assignMoneyToTag(tagId: string, accountId: string, amount: number) {
    // Get account to ensure it exists and get its currency
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    // Validate that the tag exists
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!tag) {
      throw new Error("Tag not found");
    }

    // Validate that tag balance won't exceed account balance
    const currentTagBalance = await this.getTagBalanceInAccount(tagId, accountId);
    const currentAccountBalance = account.balance.toNumber();
    const newTagBalance = (currentTagBalance?.balance || 0) + amount;

    if (newTagBalance > currentAccountBalance) {
      throw new Error(`Tag balance (${newTagBalance}) cannot exceed account balance (${currentAccountBalance})`);
    }

    // Check if tag balance already exists
    const existingBalance = await prisma.tagBalance.findFirst({
      where: {
        tagId,
        accountId,
        currency: account.currency,
      },
    });

    if (existingBalance) {
      // Update existing balance
      return await prisma.tagBalance.update({
        where: { id: existingBalance.id },
        data: {
          balance: {
            increment: amount,
          },
        },
        include: {
          account: true,
          tag: true,
        },
      });
    } else {
      // Create new balance
      return await prisma.tagBalance.create({
        data: {
          tagId,
          accountId,
          balance: amount,
          currency: account.currency,
        },
        include: {
          account: true,
          tag: true,
        },
      });
    }
  }

  // Remove money from a tag (virtual removal)
  async removeMoneyFromTag(tagId: string, accountId: string, amount: number) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    const currentBalance = await prisma.tagBalance.findFirst({
      where: {
        tagId,
        accountId,
        currency: account.currency,
      },
    });

    if (!currentBalance) {
      throw new Error("No tag balance found for this tag and account");
    }

    const currentBalanceAmount = currentBalance.balance.toNumber();
    if (amount > currentBalanceAmount) {
      throw new Error(`Cannot remove ${amount} from tag balance of ${currentBalanceAmount}`);
    }

    if (amount === currentBalanceAmount) {
      // Remove the entire balance record
      return await prisma.tagBalance.delete({
        where: { id: currentBalance.id },
      });
    } else {
      // Reduce the balance
      return await prisma.tagBalance.update({
        where: { id: currentBalance.id },
        data: {
          balance: {
            decrement: amount,
          },
        },
        include: {
          account: true,
          tag: true,
        },
      });
    }
  }

  // Get all tag balances for a specific account
  async getAccountTagBalances(accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    return await prisma.tagBalance.findMany({
      where: {
        accountId,
        currency: account.currency,
      },
      include: {
        tag: true,
        account: true,
      },
      orderBy: {
        balance: "desc",
      },
    });
  }

  // Get all tag balances for a specific tag
  async getTagBalances(tagId: string) {
    return await prisma.tagBalance.findMany({
      where: { tagId },
      include: {
        account: true,
        tag: true,
      },
      orderBy: {
        balance: "desc",
      },
    });
  }

  // Validate tag balance constraints
  async validateTagBalanceConstraints(tagId: string, accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    const tagBalances = await prisma.tagBalance.findMany({
      where: { accountId, currency: account.currency },
    });

    const totalTagBalances = tagBalances.reduce((sum, balance) => sum + balance.balance.toNumber(), 0);
    const accountBalance = account.balance.toNumber();

    return {
      isValid: totalTagBalances <= accountBalance,
      totalTagBalances,
      accountBalance,
      availableBalance: accountBalance - totalTagBalances,
    };
  }
}

export class AccountingService {
  // Validate that debits equal credits, considering currency conversion
  private async validateDoubleEntry(entries: TransactionInput["entries"]): Promise<boolean> {
    // Get account information to check currencies
    const accountIds = [...new Set(entries.map((e) => e.accountId))];
    const accounts = await Promise.all(accountIds.map((id) => prisma.account.findUnique({ where: { id } })));

    const accountMap = new Map();
    accounts.forEach((account) => {
      if (account) accountMap.set(account.id, account);
    });

    // Check if all accounts have the same currency
    const currencies = new Set(accounts.map((acc) => acc?.currency).filter(Boolean));

    if (currencies.size <= 1) {
      // Same currency or single currency - use simple validation
      const totalDebits = entries.filter((e) => e.entryType === "DEBIT").reduce((sum, e) => sum + e.amount, 0);
      const totalCredits = entries.filter((e) => e.entryType === "CREDIT").reduce((sum, e) => sum + e.amount, 0);
      return Math.abs(totalDebits - totalCredits) < 0.01; // Allow for small rounding differences
    }

    // Different currencies - convert to common currency for validation
    const baseCurrency = accounts[0]?.currency || "LKR";
    let totalDebitsInBase = 0;
    let totalCreditsInBase = 0;

    for (const entry of entries) {
      const account = accountMap.get(entry.accountId);
      if (!account) continue;

      let amountInBase = entry.amount;

      // Convert to base currency if different
      if (account.currency !== baseCurrency) {
        // Check if user provided an exchange rate for this entry
        if (entry.exchangeRate && entry.originalCurrency) {
          // Use user-provided exchange rate
          if (entry.originalCurrency === baseCurrency) {
            // Original currency is the base currency, so convert using the provided rate
            amountInBase = entry.originalAmount || entry.amount;
          } else if (account.currency === baseCurrency) {
            // Account currency is base currency, convert from original using provided rate
            amountInBase = (entry.originalAmount || entry.amount) * entry.exchangeRate;
          } else {
            // Neither is base currency, need to convert through the provided rate
            // This is a more complex case - for now, use the provided rate as-is
            amountInBase = entry.amount;
          }
        } else {
          // No user-provided rate, use real-time conversion
          try {
            const conversion = await currencyService.convertCurrency(entry.amount, account.currency, baseCurrency);
            amountInBase = conversion.convertedAmount;
          } catch (error) {
            console.warn(`Failed to convert ${entry.amount} ${account.currency} to ${baseCurrency}:`, error);
            // If conversion fails, use original amount (this might cause validation to fail)
            amountInBase = entry.amount;
          }
        }
      }

      if (entry.entryType === "DEBIT") {
        totalDebitsInBase += amountInBase;
      } else {
        totalCreditsInBase += amountInBase;
      }
    }

    return Math.abs(totalDebitsInBase - totalCreditsInBase) < 0.01; // Allow for small rounding differences
  }

  // Create a transaction with dual-entry bookkeeping
  async createTransaction(input: TransactionInput) {
    if (!(await this.validateDoubleEntry(input.entries))) {
      throw new Error("Total debits must equal total credits");
    }

    return await prisma.$transaction(async (tx) => {
      // Create the main transaction record
      const transaction = await tx.transaction.create({
        data: {
          description: input.description,
          amount: input.amount,
          date: input.date || new Date(),
          tagId: input.tagId,
          transactionType: input.transactionType,
        },
      });

      // Create transaction entries
      const entries = await Promise.all(
        input.entries.map((entry) =>
          tx.transactionEntry.create({
            data: {
              transactionId: transaction.id,
              accountId: entry.accountId,
              debitAmount: entry.entryType === "DEBIT" ? entry.amount : 0,
              creditAmount: entry.entryType === "CREDIT" ? entry.amount : 0,
              entryType: entry.entryType,
              originalAmount: entry.originalAmount,
              originalCurrency: entry.originalCurrency,
              exchangeRate: entry.exchangeRate,
            },
          })
        )
      );

      // Update account balances
      for (const entry of input.entries) {
        const balanceChange = entry.entryType === "DEBIT" ? entry.amount : -entry.amount;

        await tx.account.update({
          where: { id: entry.accountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });
      }

      return {
        transaction,
        entries,
      };
    });
  }

  // Create income transaction (Asset +, Income +)
  async createIncomeTransaction(input: IncomeTransaction) {
    return this.createTransaction({
      description: input.description,
      amount: input.amount,
      date: input.date,
      tagId: input.tagId,
      transactionType: "INCOME",
      entries: [
        {
          accountId: input.assetAccountId,
          entryType: "DEBIT",
          amount: input.amount,
        },
        {
          accountId: input.incomeAccountId,
          entryType: "CREDIT",
          amount: input.amount,
        },
      ],
    });
  }

  // Create expense transaction (Expense +, Asset -)
  async createExpenseTransaction(input: ExpenseTransaction) {
    return this.createTransaction({
      description: input.description,
      amount: input.amount,
      date: input.date,
      tagId: input.tagId,
      transactionType: "EXPENSE",
      entries: [
        {
          accountId: input.expenseAccountId,
          entryType: "DEBIT",
          amount: input.amount,
        },
        {
          accountId: input.assetAccountId,
          entryType: "CREDIT",
          amount: input.amount,
        },
      ],
    });
  }

  // Create transfer transaction with currency conversion support
  async createTransferTransaction(input: TransferTransaction | CurrencyTransferTransaction) {
    // Get account information to determine currencies
    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findUnique({ where: { id: input.fromAccountId } }),
      prisma.account.findUnique({ where: { id: input.toAccountId } }),
    ]);

    if (!fromAccount || !toAccount) {
      throw new Error("Source or destination account not found");
    }

    const fromCurrency = (input as CurrencyTransferTransaction).fromCurrency || fromAccount.currency;
    const toCurrency = (input as CurrencyTransferTransaction).toCurrency || toAccount.currency;
    const customRate = (input as CurrencyTransferTransaction).customExchangeRate;

    let conversionResult: ConversionResult | null = null;
    let debitAmount = input.amount;
    let creditAmount = input.amount;

    // If currencies are different, perform conversion
    if (fromCurrency !== toCurrency) {
      // Ensure date is properly handled (could be string from JSON)
      const transactionDate = input.date ? new Date(input.date) : new Date();

      if (customRate) {
        // Use custom exchange rate provided by user
        const convertedAmount = input.amount * customRate;
        conversionResult = {
          originalAmount: input.amount,
          convertedAmount: convertedAmount,
          fromCurrency: fromCurrency,
          toCurrency: toCurrency,
          exchangeRate: customRate,
          date: transactionDate.toISOString().split("T")[0],
        };
      } else {
        // Use automatic currency conversion
        conversionResult = await currencyService.convertCurrency(
          input.amount,
          fromCurrency,
          toCurrency,
          transactionDate
        );
      }

      // The debit amount (to account) should be in the destination currency
      debitAmount = conversionResult.convertedAmount;
      // The credit amount (from account) should be in the source currency
      creditAmount = input.amount;
    }

    return this.createTransaction({
      description: input.description,
      amount: input.amount, // Store original amount in transaction
      date: input.date,
      tagId: input.tagId,
      transactionType: "TRANSFER",
      entries: [
        {
          accountId: input.toAccountId,
          entryType: "DEBIT",
          amount: debitAmount,
          // Store conversion details
          originalAmount: conversionResult ? input.amount : undefined,
          originalCurrency: conversionResult ? fromCurrency : undefined,
          exchangeRate: conversionResult ? conversionResult.exchangeRate : undefined,
        },
        {
          accountId: input.fromAccountId,
          entryType: "CREDIT",
          amount: creditAmount,
          // Store conversion details
          originalAmount: conversionResult ? conversionResult.convertedAmount : undefined,
          originalCurrency: conversionResult ? toCurrency : undefined,
          exchangeRate: conversionResult ? 1 / conversionResult.exchangeRate : undefined,
        },
      ],
    });
  }

  // Get account balance
  async getAccountBalance(accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });
    return account?.balance;
  }

  // Get account balance in a specific currency
  async getAccountBalanceInCurrency(accountId: string, targetCurrency?: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    const balance = account.balance.toNumber();

    if (!targetCurrency || account.currency === targetCurrency) {
      return {
        balance,
        currency: account.currency,
        convertedBalance: balance,
        targetCurrency: account.currency,
        exchangeRate: 1,
      };
    }

    // Convert balance to target currency
    const conversion = await currencyService.convertCurrency(balance, account.currency, targetCurrency);

    return {
      balance,
      currency: account.currency,
      convertedBalance: conversion.convertedAmount,
      targetCurrency: targetCurrency.toUpperCase(),
      exchangeRate: conversion.exchangeRate,
    };
  }

  // Get account summary
  async getAccountSummary(accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        entries: {
          include: {
            transaction: {
              include: {
                tag: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    return {
      ...account,
      recentEntries: account.entries,
    };
  }

  // Get all accounts with balances
  async getAllAccounts() {
    return await prisma.account.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }

  // Get accounts by type
  async getAccountsByType(type: AccountType) {
    return await prisma.account.findMany({
      where: { type },
      orderBy: {
        name: "asc",
      },
    });
  }

  // Get transaction history
  async getTransactionHistory(limit: number = 50, offset: number = 0) {
    return await prisma.transaction.findMany({
      include: {
        tag: true,
        entries: {
          include: {
            account: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: limit,
      skip: offset,
    });
  }

  // Get transactions for a specific account
  async getAccountTransactions(accountId: string, limit: number = 50, offset: number = 0) {
    const transactions = await prisma.transactionEntry.findMany({
      where: {
        accountId: accountId,
      },
      include: {
        transaction: {
          include: {
            tag: true,
            entries: {
              include: {
                account: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    return transactions.map((entry) => ({
      ...entry.transaction,
      entryType: entry.entryType,
      amount: entry.entryType === "DEBIT" ? entry.debitAmount : entry.creditAmount,
      originalAmount: entry.originalAmount,
      originalCurrency: entry.originalCurrency,
      exchangeRate: entry.exchangeRate,
    }));
  }

  // Calculate account balance from transaction entries (for verification)
  async calculateAccountBalance(accountId: string): Promise<number> {
    const entries = await prisma.transactionEntry.findMany({
      where: { accountId },
    });

    return entries.reduce((balance, entry) => {
      const amount = entry.debitAmount.toNumber() - entry.creditAmount.toNumber();
      return balance + amount;
    }, 0);
  }

  // Get financial summary
  async getFinancialSummary() {
    const accounts = await this.getAllAccounts();

    const summary = {
      assets: 0,
      liabilities: 0,
      income: 0,
      expenses: 0,
      netWorth: 0,
    };

    for (const account of accounts) {
      const balance = account.balance.toNumber();

      switch (account.type) {
        case AccountType.ASSET:
          summary.assets += balance;
          break;
        case AccountType.LIABILITY:
          summary.liabilities += balance;
          break;
        case AccountType.INCOME:
          summary.income += balance;
          break;
        case AccountType.EXPENSE:
          summary.expenses += balance;
          break;
      }
    }

    summary.netWorth = summary.assets - summary.liabilities;

    return summary;
  }

  // Create new account
  async createAccount(data: {
    name: string;
    type: AccountType;
    currency?: string;
    description?: string;
    initialBalance?: number;
  }) {
    return await prisma.account.create({
      data: {
        name: data.name,
        type: data.type,
        currency: data.currency || "USD",
        description: data.description,
        balance: data.initialBalance || 0,
      },
    });
  }

  // Update account
  async updateAccount(
    id: string,
    data: {
      name?: string;
      currency?: string;
      description?: string;
    }
  ) {
    return await prisma.account.update({
      where: { id },
      data,
    });
  }

  // Delete account (only if no transactions)
  async deleteAccount(id: string) {
    const hasTransactions = await prisma.transactionEntry.findFirst({
      where: { accountId: id },
    });

    if (hasTransactions) {
      throw new Error("Cannot delete account with existing transactions");
    }

    return await prisma.account.delete({
      where: { id },
    });
  }

  // Get all tags
  async getAllTags() {
    return await prisma.tag.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }

  // Create a new tag
  async createTag(name: string, description?: string, color?: string) {
    return await prisma.tag.create({
      data: {
        name,
        description,
        color,
      },
    });
  }

  // Update a tag
  async updateTag(
    id: string,
    data: {
      name?: string;
      description?: string;
      color?: string;
    }
  ) {
    return await prisma.tag.update({
      where: { id },
      data,
    });
  }

  // Delete a tag (only if no transactions use it)
  async deleteTag(id: string) {
    const hasTransactions = await prisma.transaction.findFirst({
      where: { tagId: id },
    });

    if (hasTransactions) {
      throw new Error("Cannot delete tag that is being used by transactions");
    }

    return await prisma.tag.delete({
      where: { id },
    });
  }

  // Get transactions with pagination and filtering
  async getTransactions(params: {
    page: number;
    pageSize: number;
    accountId?: string;
    tagId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page, pageSize, accountId, tagId, startDate, endDate } = params;
    const offset = (page - 1) * pageSize;

    // Build where clause for filtering
    const where: {
      entries?: { some: { accountId: string } };
      tagId?: string;
      date?: { gte?: Date; lte?: Date };
    } = {};

    if (accountId) {
      where.entries = {
        some: {
          accountId: accountId,
        },
      };
    }

    if (tagId) {
      where.tagId = tagId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startDate;
      }
      if (endDate) {
        where.date.lte = endDate;
      }
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          tag: true,
          entries: {
            include: {
              account: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
        take: pageSize,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNextPage: page * pageSize < totalCount,
        hasPreviousPage: page > 1,
      },
    };
  }

  // Create tagged transfer transaction (assigns virtual balance to tag)
  async createTaggedTransferTransaction(input: {
    description: string;
    amount: number;
    date?: Date;
    tagId: string;
    fromAccountId: string;
    toAccountId: string;
  }) {
    // First create the physical transfer
    const transferResult = await this.createTransferTransaction({
      description: input.description,
      amount: input.amount,
      date: input.date,
      tagId: input.tagId,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
    });

    // Then assign the transferred amount to the tag in the destination account
    await tagBalanceService.assignMoneyToTag(input.tagId, input.toAccountId, input.amount);

    return transferResult;
  }

  // Create tagged expense transaction (reduces tag balance)
  async createTaggedExpenseTransaction(input: {
    description: string;
    amount: number;
    date?: Date;
    tagId: string;
    assetAccountId: string;
    expenseAccountId: string;
  }) {
    // First create the physical expense
    const expenseResult = await this.createExpenseTransaction({
      description: input.description,
      amount: input.amount,
      date: input.date,
      tagId: input.tagId,
      assetAccountId: input.assetAccountId,
      expenseAccountId: input.expenseAccountId,
    });

    // Then reduce the tag balance in the asset account
    await tagBalanceService.removeMoneyFromTag(input.tagId, input.assetAccountId, input.amount);

    return expenseResult;
  }

  // Create tagged income transaction (assigns to tag)
  async createTaggedIncomeTransaction(input: {
    description: string;
    amount: number;
    date?: Date;
    tagId: string;
    assetAccountId: string;
    incomeAccountId: string;
  }) {
    // First create the physical income
    const incomeResult = await this.createIncomeTransaction({
      description: input.description,
      amount: input.amount,
      date: input.date,
      tagId: input.tagId,
      assetAccountId: input.assetAccountId,
      incomeAccountId: input.incomeAccountId,
    });

    // Then assign the income to the tag in the asset account
    await tagBalanceService.assignMoneyToTag(input.tagId, input.assetAccountId, input.amount);

    return incomeResult;
  }

  // Get tag summary with transactions and financial metrics
  async getTagSummary(tagId: string) {
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        transactions: {
          include: {
            entries: {
              include: {
                account: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        },
      },
    });

    if (!tag) {
      throw new Error("Tag not found");
    }

    // Calculate financial metrics
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalTransferIn = 0;
    let totalTransferOut = 0;
    const accountBalanceChanges: Record<string, { name: string; change: number; currency: string }> = {};

    for (const transaction of tag.transactions) {
      const amount = transaction.amount.toNumber();

      switch (transaction.transactionType) {
        case "INCOME":
          totalIncome += amount;
          break;
        case "EXPENSE":
          totalExpenses += amount;
          break;
        case "TRANSFER":
          // For transfers, we need to check if this is money coming in or going out
          // by looking at the account types involved
          const debitEntry = transaction.entries.find((e) => e.entryType === "DEBIT");
          const creditEntry = transaction.entries.find((e) => e.entryType === "CREDIT");

          if (debitEntry?.account.type === "ASSET" && creditEntry?.account.type === "ASSET") {
            // Asset to asset transfer - money moving between accounts
            totalTransferIn += debitEntry.debitAmount.toNumber();
            totalTransferOut += creditEntry.creditAmount.toNumber();
          }
          break;
      }

      // Track balance changes per account
      for (const entry of transaction.entries) {
        const accountId = entry.accountId;
        const accountName = entry.account.name;
        const accountCurrency = entry.account.currency;

        if (!accountBalanceChanges[accountId]) {
          accountBalanceChanges[accountId] = {
            name: accountName,
            change: 0,
            currency: accountCurrency,
          };
        }

        const changeAmount =
          entry.entryType === "DEBIT" ? entry.debitAmount.toNumber() : -entry.creditAmount.toNumber();

        accountBalanceChanges[accountId].change += changeAmount;
      }
    }

    const netAmount = totalIncome - totalExpenses;

    // Get tag balance information
    const tagBalanceInfo = await tagBalanceService.getTagBalance(tagId);

    return {
      tag: {
        id: tag.id,
        name: tag.name,
        description: tag.description,
        color: tag.color,
      },
      summary: {
        totalTransactions: tag.transactions.length,
        totalIncome,
        totalExpenses,
        totalTransferIn,
        totalTransferOut,
        netAmount,
      },
      tagBalance: {
        totalBalance: tagBalanceInfo.totalBalance,
        currency: tagBalanceInfo.currency,
        accountBalances: tagBalanceInfo.accountBalances,
      },
      accountChanges: Object.entries(accountBalanceChanges).map(([accountId, data]) => ({
        accountId,
        accountName: data.name,
        balanceChange: data.change,
        currency: data.currency,
      })),
      // Add assetTotals for frontend compatibility
      assetTotals: Object.entries(accountBalanceChanges).map(([accountId, data]) => ({
        accountId,
        accountName: data.name,
        total: data.change,
        currency: data.currency,
      })),
      // Add totalAmount for frontend compatibility
      totalAmount: netAmount,
      // Add transactions for frontend compatibility
      transactions: tag.transactions.map((transaction) => ({
        id: transaction.id,
        description: transaction.description,
        amount: transaction.amount.toNumber(),
        date: transaction.date,
        transactionType: transaction.transactionType,
        tag: {
          id: tag.id,
          name: tag.name,
          description: tag.description,
          color: tag.color,
        },
        entries: transaction.entries.map((entry) => ({
          id: entry.id,
          account: {
            id: entry.account.id,
            name: entry.account.name,
            type: entry.account.type,
            currency: entry.account.currency,
          },
          debitAmount: entry.debitAmount.toNumber(),
          creditAmount: entry.creditAmount.toNumber(),
          entryType: entry.entryType,
          originalAmount: entry.originalAmount?.toNumber(),
          originalCurrency: entry.originalCurrency,
          exchangeRate: entry.exchangeRate?.toNumber(),
        })),
      })),
      recentTransactions: tag.transactions.slice(0, 10).map((transaction) => ({
        id: transaction.id,
        description: transaction.description,
        amount: transaction.amount.toNumber(),
        date: transaction.date,
        transactionType: transaction.transactionType,
        entries: transaction.entries.map((entry) => ({
          accountName: entry.account.name,
          accountType: entry.account.type,
          entryType: entry.entryType,
          amount: entry.entryType === "DEBIT" ? entry.debitAmount.toNumber() : entry.creditAmount.toNumber(),
          currency: entry.account.currency,
        })),
      })),
    };
  }
}

// Export singleton instances
export const accountingService = new AccountingService();
export const tagBalanceService = new TagBalanceService();
