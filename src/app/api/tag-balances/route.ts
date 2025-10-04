import { NextRequest, NextResponse } from "next/server";
import { tagBalanceService } from "@/lib/accounting";

// GET /api/tag-balances?tagId=xxx&accountId=xxx&currency=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("tagId");
    const accountId = searchParams.get("accountId");
    const currency = searchParams.get("currency");

    if (tagId && accountId) {
      // Get specific tag balance in specific account
      const balance = await tagBalanceService.getTagBalanceInAccount(tagId, accountId);
      return NextResponse.json(balance);
    } else if (tagId) {
      // Get tag balance across all accounts
      const balance = await tagBalanceService.getTagBalance(tagId, currency || undefined);
      return NextResponse.json(balance);
    } else if (accountId) {
      // Get all tag balances for specific account
      const balances = await tagBalanceService.getAccountTagBalances(accountId);
      return NextResponse.json(balances);
    } else {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error fetching tag balances:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/tag-balances - Assign money to tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tagId, accountId, amount } = body;

    if (!tagId || !accountId || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields: tagId, accountId, amount" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    const result = await tagBalanceService.assignMoneyToTag(tagId, accountId, amount);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error assigning money to tag:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tag-balances - Remove money from tag
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("tagId");
    const accountId = searchParams.get("accountId");
    const amount = parseFloat(searchParams.get("amount") || "0");

    if (!tagId || !accountId || amount <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid required parameters: tagId, accountId, amount" },
        { status: 400 }
      );
    }

    const result = await tagBalanceService.removeMoneyFromTag(tagId, accountId, amount);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error removing money from tag:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
