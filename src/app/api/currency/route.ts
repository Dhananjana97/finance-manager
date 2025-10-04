import { NextRequest, NextResponse } from "next/server";
import { currencyService } from "@/lib/currency";

// GET /api/currency - Get supported currencies
export async function GET(request: NextRequest) {
  try {
    const currencies = await currencyService.getSupportedCurrencies();
    return NextResponse.json({ currencies }, { status: 200 });
  } catch (error) {
    console.error("Error fetching currencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch currencies" },
      { status: 500 }
    );
  }
}

// POST /api/currency - Update exchange rates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseCurrency = 'USD' } = body;
    
    await currencyService.updateExchangeRates(baseCurrency);
    return NextResponse.json({ message: "Exchange rates updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating exchange rates:", error);
    return NextResponse.json(
      { error: "Failed to update exchange rates" },
      { status: 500 }
    );
  }
}
