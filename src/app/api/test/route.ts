import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('Testing database connection in API...')
    const accounts = await prisma.account.findMany()
    console.log('Found accounts:', accounts.length)
    return NextResponse.json({ 
      success: true, 
      count: accounts.length,
      accounts: accounts.map(a => ({ id: a.id, name: a.name, type: a.type }))
    })
  } catch (error) {
    console.error('Database error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
