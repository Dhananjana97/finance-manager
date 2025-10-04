import { NextRequest, NextResponse } from "next/server";
import { currencyService } from "@/lib/currency";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromCurrency = searchParams.get("from");
    const toCurrency = searchParams.get("to");
    const date = searchParams.get("date");

    if (!fromCurrency || !toCurrency) {
      return NextResponse.json({ error: "from and to currencies are required" }, { status: 400 });
    }

    const transactionDate = date ? new Date(date) : new Date();
    const rate = await currencyService.getExchangeRate(fromCurrency, toCurrency, transactionDate);

    return NextResponse.json({
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      rate,
      date: transactionDate.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    return NextResponse.json({ error: "Failed to fetch exchange rate" }, { status: 500 });
  }
}
