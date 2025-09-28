import { NextRequest, NextResponse } from "next/server";
import { accountingService } from "@/lib/accounting";
import { AccountType } from "@/generated/prisma";

export async function GET() {
  try {
    const accounts = await accountingService.getAllAccounts();
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, description } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 });
    }

    if (!Object.values(AccountType).includes(type)) {
      return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
    }

    const account = await accountingService.createAccount(
      name,
      type,
      description
      
    );
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
