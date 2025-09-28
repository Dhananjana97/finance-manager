import { NextRequest, NextResponse } from "next/server";
import { accountingService } from "@/lib/accounting";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...transactionData } = body;

    let result;

    switch (type) {
      case "INCOME":
        result = await accountingService.createIncomeTransaction(transactionData);
        break;
      case "EXPENSE":
        result = await accountingService.createExpenseTransaction(transactionData);
        break;
      case "TRANSFER":
        result = await accountingService.createTransferTransaction(transactionData);
        break;
      default:
        return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create transaction" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const accountId = searchParams.get("accountId") || undefined;
    const tagId = searchParams.get("tagId") || undefined;

    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    if (Number.isNaN(page) || Number.isNaN(pageSize) || page < 1 || pageSize < 1) {
      return NextResponse.json({ error: "Invalid pagination parameters" }, { status: 400 });
    }

    const result = await accountingService.getTransactions({
      page,
      pageSize,
      accountId,
      tagId,
      startDate,
      endDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
