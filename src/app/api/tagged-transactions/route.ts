import { NextRequest, NextResponse } from "next/server";
import { accountingService } from "@/lib/accounting";

// POST /api/tagged-transactions/transfer - Create tagged transfer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...transactionData } = body;

    if (!type) {
      return NextResponse.json({ error: "Missing transaction type" }, { status: 400 });
    }

    let result;

    switch (type) {
      case "transfer":
        result = await accountingService.createTaggedTransferTransaction(transactionData);
        break;
      case "expense":
        result = await accountingService.createTaggedExpenseTransaction(transactionData);
        break;
      case "income":
        result = await accountingService.createTaggedIncomeTransaction(transactionData);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid transaction type. Must be 'transfer', 'expense', or 'income'" },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating tagged transaction:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
