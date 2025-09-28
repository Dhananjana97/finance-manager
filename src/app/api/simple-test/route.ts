import { NextResponse } from 'next/server'
import { Client } from 'pg'

export async function GET() {
  try {
    console.log('Testing direct PostgreSQL connection...')
    
    const client = new Client({
      host: '127.0.0.1',
      port: 5432,
      database: 'personal_finance',
      user: 'sachinthadhananjana',
    })
    
    await client.connect()
    console.log('✅ Connected to PostgreSQL directly!')
    
    const result = await client.query('SELECT COUNT(*) as count FROM accounts')
    const count = result.rows[0].count
    
    await client.end()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Direct PostgreSQL connection successful!',
      accountCount: parseInt(count)
    })
    
  } catch (error) {
    console.error('Direct PostgreSQL error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
