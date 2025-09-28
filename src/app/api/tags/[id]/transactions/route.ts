import { NextRequest, NextResponse } from "next/server";
import { accountingService } from "@/lib/accounting";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tagId } = await params;
    const summary = await accountingService.getTagSummary(tagId);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching tag transactions:", error);
    return NextResponse.json({ error: "Failed to fetch tag transactions" }, { status: 500 });
  }
}
