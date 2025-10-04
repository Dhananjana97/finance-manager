import { prisma } from "./prisma";

export interface ExchangeRateResponse {
  date: string;
  base: string;
  rates: Record<string, number>;
}

export interface ConversionResult {
  originalAmount: number;
  convertedAmount: number;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  date: string;
}

export class CurrencyService {
  private readonly PRIMARY_API = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies";
  private readonly FALLBACK_API = "https://latest.currency-api.pages.dev/v1/currencies";

  /**
   * Fetch exchange rates from the free API with fallback
   */
  async fetchExchangeRates(baseCurrency: string = "lkr"): Promise<ExchangeRateResponse | null> {
    const normalizedBase = baseCurrency.toLowerCase();

    try {
      // Try primary API first
      const primaryUrl = `${this.PRIMARY_API}/${normalizedBase}.json`;
      const response = await fetch(primaryUrl);

      if (response.ok) {
        const data = await response.json();
        return {
          date: new Date().toISOString().split("T")[0],
          base: normalizedBase.toUpperCase(),
          rates: data[normalizedBase] || {},
        };
      }
    } catch (error) {
      console.warn("Primary API failed, trying fallback:", error);
    }

    try {
      // Try fallback API
      const fallbackUrl = `${this.FALLBACK_API}/${normalizedBase}.json`;
      const response = await fetch(fallbackUrl);

      if (response.ok) {
        const data = await response.json();
        return {
          date: new Date().toISOString().split("T")[0],
          base: normalizedBase.toUpperCase(),
          rates: data[normalizedBase] || {},
        };
      }
    } catch (error) {
      console.error("Both APIs failed:", error);
    }

    return null;
  }

  /**
   * Get exchange rate for a specific date and currency pair
   * First checks local database, then fetches from API if needed
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string, date: Date = new Date()): Promise<number> {
    const normalizedFrom = fromCurrency.toUpperCase();
    const normalizedTo = toCurrency.toUpperCase();

    // If same currency, rate is 1
    if (normalizedFrom === normalizedTo) {
      return 1;
    }

    // Ensure date is a proper Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    const dateStr = dateObj.toISOString().split("T")[0];

    // Check if we have the rate in database
    const existingRate = await prisma.exchangeRate.findUnique({
      where: {
        fromCurrency_toCurrency_date: {
          fromCurrency: normalizedFrom,
          toCurrency: normalizedTo,
          date: new Date(dateStr),
        },
      },
    });

    if (existingRate) {
      return existingRate.rate.toNumber();
    }

    // Fetch from API and store in database
    const rateData = await this.fetchExchangeRates(normalizedFrom.toLowerCase());

    if (!rateData || !rateData.rates[normalizedTo.toLowerCase()]) {
      throw new Error(`Exchange rate not found for ${normalizedFrom} to ${normalizedTo}`);
    }

    const rate = rateData.rates[normalizedTo.toLowerCase()];

    // Store in database for future use
    await prisma.exchangeRate.create({
      data: {
        fromCurrency: normalizedFrom,
        toCurrency: normalizedTo,
        rate: rate,
        date: new Date(dateStr),
      },
    });

    return rate;
  }

  /**
   * Convert amount between currencies
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date: Date = new Date()
  ): Promise<ConversionResult> {
    // Ensure date is a proper Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    const rate = await this.getExchangeRate(fromCurrency, toCurrency, dateObj);
    const convertedAmount = amount * rate;

    return {
      originalAmount: amount,
      convertedAmount: convertedAmount,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      exchangeRate: rate,
      date: dateObj.toISOString().split("T")[0],
    };
  }

  /**
   * Get list of supported currencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    try {
      const response = await fetch(`${this.PRIMARY_API}.json`);
      if (response.ok) {
        const data = await response.json();
        return Object.keys(data).map((currency) => currency.toUpperCase());
      }
    } catch (error) {
      console.error("Failed to fetch supported currencies:", error);
    }

    // Fallback to common currencies (LKR first as default)
    return [
      "LKR",
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "AUD",
      "CAD",
      "CHF",
      "CNY",
      "SEK",
      "NZD",
      "MXN",
      "SGD",
      "HKD",
      "NOK",
      "TRY",
      "ZAR",
      "BRL",
      "INR",
      "KRW",
      "THB",
    ];
  }

  /**
   * Bulk update exchange rates for multiple currencies
   */
  async updateExchangeRates(baseCurrency: string = "LKR"): Promise<void> {
    const rateData = await this.fetchExchangeRates(baseCurrency.toLowerCase());

    if (!rateData) {
      throw new Error("Failed to fetch exchange rates");
    }

    const date = new Date();
    const operations = Object.entries(rateData.rates).map(([currency, rate]) => {
      return prisma.exchangeRate.upsert({
        where: {
          fromCurrency_toCurrency_date: {
            fromCurrency: baseCurrency.toUpperCase(),
            toCurrency: currency.toUpperCase(),
            date: date,
          },
        },
        update: {
          rate: rate,
        },
        create: {
          fromCurrency: baseCurrency.toUpperCase(),
          toCurrency: currency.toUpperCase(),
          rate: rate,
          date: date,
        },
      });
    });

    await Promise.all(operations);
  }
}

// Export singleton instance
export const currencyService = new CurrencyService();

// Common currency codes and their symbols (LKR first as default)
export const CURRENCY_INFO = {
  LKR: { symbol: "Rs.", name: "Sri Lankan Rupee" },
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
  CHF: { symbol: "CHF", name: "Swiss Franc" },
  CNY: { symbol: "¥", name: "Chinese Yuan" },
  INR: { symbol: "₹", name: "Indian Rupee" },
  BRL: { symbol: "R$", name: "Brazilian Real" },
  KRW: { symbol: "₩", name: "South Korean Won" },
  THB: { symbol: "฿", name: "Thai Baht" },
} as const;

export type SupportedCurrency = keyof typeof CURRENCY_INFO;
