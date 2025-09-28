import { NextRequest, NextResponse } from 'next/server'
import { accountingService } from '@/lib/accounting'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params
    const transactions = await accountingService.getAccountTransactions(accountId)
    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching account transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account transactions' },
      { status: 500 }
    )
  }
}
