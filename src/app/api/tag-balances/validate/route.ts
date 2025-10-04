import { NextRequest, NextResponse } from "next/server";
import { tagBalanceService } from "@/lib/accounting";

// GET /api/tag-balances/validate?tagId=xxx&accountId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("tagId");
    const accountId = searchParams.get("accountId");

    if (!tagId || !accountId) {
      return NextResponse.json({ error: "Missing required parameters: tagId, accountId" }, { status: 400 });
    }

    const validation = await tagBalanceService.validateTagBalanceConstraints(tagId, accountId);
    return NextResponse.json(validation);
  } catch (error) {
    console.error("Error validating tag balance constraints:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
