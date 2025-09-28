import { prisma } from "./prisma";
import { AccountType } from "@/generated/prisma";
import type { Prisma } from "@/generated/prisma";

export interface TransactionInput {
  description: string;
  amount: number;
  date?: Date;
  tagId?: string;
  transactionType: "INCOME" | "EXPENSE" | "TRANSFER";
  entries: {
    accountId: string;
    entryType: "DEBIT" | "CREDIT";
    amount: number;
  }[];
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

export class AccountingService {
  // Validate that debits equal credits
  private validateDoubleEntry(entries: TransactionInput["entries"]): boolean {
    const totalDebits = entries.filter((e) => e.entryType === "DEBIT").reduce((sum, e) => sum + e.amount, 0);

    const totalCredits = entries.filter((e) => e.entryType === "CREDIT").reduce((sum, e) => sum + e.amount, 0);

    return totalDebits === totalCredits;
  }

  // Create a transaction with dual-entry bookkeeping
  async createTransaction(input: TransactionInput) {
    if (!this.validateDoubleEntry(input.entries)) {
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
            },
          })
        )
      );

      // Update account balances
      for (const entry of input.entries) {
        const account = await tx.account.findUnique({
          where: { id: entry.accountId },
        });

        if (!account) {
          throw new Error(`Account ${entry.accountId} not found`);
        }

        let newBalance = Number(account.balance);

        if (entry.entryType === "DEBIT") {
          // For assets and expenses, debit increases balance
          // For liabilities and income, debit decreases balance
          if (account.type === "ASSET" || account.type === "EXPENSE") {
            newBalance += entry.amount;
          } else {
            newBalance -= entry.amount;
          }
        } else {
          // For assets and expenses, credit decreases balance
          // For liabilities and income, credit increases balance
          if (account.type === "ASSET" || account.type === "EXPENSE") {
            newBalance -= entry.amount;
          } else {
            newBalance += entry.amount;
          }
        }

        await tx.account.update({
          where: { id: entry.accountId },
          data: { balance: newBalance },
        });
      }

      return { transaction, entries };
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

  // Create expense transaction (Asset -, Expense +)
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

  // Create transfer transaction (Asset -, Asset +)
  async createTransferTransaction(input: TransferTransaction) {
    return this.createTransaction({
      description: input.description,
      amount: input.amount,
      date: input.date,
      tagId: input.tagId,
      transactionType: "TRANSFER",
      entries: [
        {
          accountId: input.toAccountId,
          entryType: "DEBIT",
          amount: input.amount,
        },
        {
          accountId: input.fromAccountId,
          entryType: "CREDIT",
          amount: input.amount,
        },
      ],
    });
  }

  // Get account balance
  async getAccountBalance(accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });
    return account?.balance || 0;
  }

  // Get all accounts with balances
  async getAllAccounts() {
    return await prisma.account.findMany({
      orderBy: { name: "asc" },
    });
  }

  // Get transactions for an account
  async getAccountTransactions(accountId: string) {
    return await prisma.transaction.findMany({
      where: {
        entries: {
          some: {
            accountId: accountId,
          },
        },
      },
      include: {
        entries: {
          include: {
            account: true,
          },
        },
        tag: true,
      },
      orderBy: { date: "desc" },
    });
  }

  // Get transactions with pagination and filters
  async getTransactions(options: {
    page?: number;
    pageSize?: number;
    accountId?: string;
    tagId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page = 1, pageSize = 10, accountId, tagId, startDate, endDate } = options;

    const where: Prisma.TransactionWhereInput = {};

    if (tagId) {
      where.tagId = tagId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    if (accountId) {
      where.entries = { some: { accountId } };
    }

    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          entries: { include: { account: true } },
          tag: true,
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items,
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  // Get transactions by tag
  async getTransactionsByTag(tagId: string) {
    return await prisma.transaction.findMany({
      where: { tagId },
      include: {
        entries: {
          include: {
            account: true,
          },
        },
        tag: true,
      },
      orderBy: { date: "desc" },
    });
  }

  // Compute asset-account-wise totals for a tag (debits - credits on ASSET accounts)
  async getTagAssetTotals(tagId: string) {
    const grouped = await prisma.transactionEntry.groupBy({
      by: ["accountId"],
      where: {
        transaction: { tagId },
        account: { type: "ASSET" },
      },
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    // Load accounts to attach names
    const accountIds = grouped.map((g) => g.accountId);
    const accounts = await prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true },
    });
    const idToName = new Map(accounts.map((a) => [a.id, a.name] as const));

    return grouped.map((g) => ({
      accountId: g.accountId,
      accountName: idToName.get(g.accountId) || g.accountId,
      total: Number(g._sum.debitAmount || 0) - Number(g._sum.creditAmount || 0),
    }));
  }

  async getTagSummary(tagId: string) {
    const [transactions, assetTotals] = await Promise.all([
      this.getTransactionsByTag(tagId),
      this.getTagAssetTotals(tagId),
    ]);
    const totalAmount = assetTotals.reduce((sum, t) => sum + Number(t.total), 0);
    return { transactions, assetTotals, totalAmount };
  }

  // Get all tags
  async getAllTags() {
    return await prisma.tag.findMany({
      orderBy: { name: "asc" },
    });
  }

  // Create a tag
  async createTag(name: string, description?: string, color?: string) {
    return await prisma.tag.create({
      data: {
        name,
        description,
        color,
      },
    });
  }

  // Create an account
  async createAccount(name: string, type: AccountType, description?: string) {
    return await prisma.account.create({
      data: {
        name,
        type,
        description,
        balance: 0,
      },
    });
  }
}

export const accountingService = new AccountingService();
