import { PrismaClient, AccountType } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  // Create sample accounts
  const savingsAccount = await prisma.account.upsert({
    where: { id: 'savings-account' },
    update: {},
    create: {
      id: 'savings-account',
      name: 'Savings Account',
      type: AccountType.ASSET,
      description: 'Main savings account',
      balance: 0,
    },
  })

  const checkingAccount = await prisma.account.upsert({
    where: { id: 'checking-account' },
    update: {},
    create: {
      id: 'checking-account',
      name: 'Checking Account',
      type: AccountType.ASSET,
      description: 'Daily expenses account',
      balance: 0,
    },
  })

  const salaryAccount = await prisma.account.upsert({
    where: { id: 'salary-account' },
    update: {},
    create: {
      id: 'salary-account',
      name: 'Salary',
      type: AccountType.INCOME,
      description: 'Monthly salary income',
      balance: 0,
    },
  })

  const rentAccount = await prisma.account.upsert({
    where: { id: 'rent-account' },
    update: {},
    create: {
      id: 'rent-account',
      name: 'Rent',
      type: AccountType.EXPENSE,
      description: 'Monthly rent expense',
      balance: 0,
    },
  })

  const groceriesAccount = await prisma.account.upsert({
    where: { id: 'groceries-account' },
    update: {},
    create: {
      id: 'groceries-account',
      name: 'Groceries',
      type: AccountType.EXPENSE,
      description: 'Food and household items',
      balance: 0,
    },
  })

  // Create sample tags
  const emergencyTag = await prisma.tag.upsert({
    where: { id: 'emergency-tag' },
    update: {},
    create: {
      id: 'emergency-tag',
      name: 'Emergency Fund',
      description: 'Money set aside for emergencies',
      color: '#EF4444',
    },
  })

  const houseTag = await prisma.tag.upsert({
    where: { id: 'house-tag' },
    update: {},
    create: {
      id: 'house-tag',
      name: 'House Fund',
      description: 'Saving for house purchase',
      color: '#3B82F6',
    },
  })

  const carTag = await prisma.tag.upsert({
    where: { id: 'car-tag' },
    update: {},
    create: {
      id: 'car-tag',
      name: 'Car Maintenance',
      description: 'Car related expenses',
      color: '#F97316',
    },
  })

  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
