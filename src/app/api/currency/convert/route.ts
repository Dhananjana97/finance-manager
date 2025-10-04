import { NextRequest, NextResponse } from "next/server";
import { currencyService } from "@/lib/currency";

// POST /api/currency/convert - Convert amount between currencies
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, fromCurrency, toCurrency, date } = body;
    
    if (!amount || !fromCurrency || !toCurrency) {
      return NextResponse.json(
        { error: "Missing required fields: amount, fromCurrency, toCurrency" },
        { status: 400 }
      );
    }

    const conversionDate = date ? new Date(date) : new Date();
    const result = await currencyService.convertCurrency(
      parseFloat(amount),
      fromCurrency,
      toCurrency,
      conversionDate
    );
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error converting currency:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to convert currency" },
      { status: 500 }
    );
  }
}
