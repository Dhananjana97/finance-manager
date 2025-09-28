# Personal Finance Manager

A comprehensive personal finance and accounting application built with Next.js, featuring dual-entry bookkeeping principles and a modern, user-friendly interface.

## 🎯 Features

### Core Functionality
- **Dual-Entry Bookkeeping**: Every transaction automatically maintains proper accounting principles with debits and credits
- **Account Management**: Create and manage Assets, Liabilities, Income, and Expense accounts
- **Transaction Types**: Support for Income, Expense, and Transfer transactions
- **Tagging System**: Custom tags for transaction categorization and goal tracking
- **Real-time Balance Updates**: Automatic balance calculations across all accounts

### Transaction Scenarios
- **Income**: Asset +, Income + (e.g., salary received)
- **Expense**: Asset -, Expense + (e.g., rent payment)  
- **Transfer**: Asset -, Asset + (e.g., savings to checking)

### User Interface
- **Dashboard**: Overview of all accounts and tags with quick actions
- **Account Views**: Individual account details with transaction history
- **Tag Views**: Tag-based transaction filtering and summaries
- **Responsive Design**: Modern UI with Tailwind CSS
- **Real-time Updates**: Live data synchronization

## 🏗️ Technical Architecture

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: Next.js API routes with Prisma ORM
- **Database**: SQLite (development) / PostgreSQL (production)
- **Deployment**: Vercel-ready configuration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd personal-finance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations
   npx prisma migrate dev --name init
   
   # Seed with sample data
   npm run db:seed
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

### Account Types
- **Assets**: What you own (bank accounts, cash)
- **Liabilities**: What you owe (loans, credit card debt)
- **Income**: Money received (salary, gifts)
- **Expenses**: Money spent (rent, groceries)

### Transaction Flow
Every transaction creates two entries:
- **Debit Entry**: Increases Assets/Expenses, Decreases Liabilities/Income
- **Credit Entry**: Decreases Assets/Expenses, Increases Liabilities/Income

## 🎨 Usage Examples

### Creating Your First Account
1. Go to **Accounts** page
2. Click **Create Account**
3. Enter account name, select type, add description
4. Account is created with zero balance

### Recording a Salary
1. Go to **Transactions** page
2. Select **Income** transaction type
3. Choose Asset account (where money goes)
4. Choose Income account (salary source)
5. Enter amount and description
6. Transaction automatically creates proper debit/credit entries

### Tracking Expenses
1. Go to **Transactions** page
2. Select **Expense** transaction type
3. Choose Asset account (where money comes from)
4. Choose Expense account (expense category)
5. Add tag for categorization
6. Enter amount and description

### Transferring Money
1. Go to **Transactions** page
2. Select **Transfer** transaction type
3. Choose source and destination Asset accounts
4. Enter amount and description
5. Transfer maintains balance across accounts

## 🏷️ Tagging System

Create custom tags to categorize transactions:
- **Emergency Fund**: Money set aside for emergencies
- **House Fund**: Saving for house purchase
- **Car Maintenance**: Car-related expenses
- **Vacation**: Travel and leisure expenses

Tags help track progress toward financial goals and provide detailed reporting.

## 📈 Reporting & Views

### Account-Wise View
- View all transactions for a specific account
- See running balance changes
- Filter by date range and transaction type

### Tag-Wise View
- View all transactions with a specific tag
- See total amount accumulated under each tag
- Track progress toward financial goals

## 🚀 Deployment

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables

3. **Set up Database**
   - Add PostgreSQL database (Vercel Postgres or external)
   - Set `DATABASE_URL` environment variable

4. **Deploy**
   - Vercel will automatically build and deploy
   - Run migrations: `npx prisma migrate deploy`
   - Seed database: `npm run db:seed`

### Environment Variables

```env
DATABASE_URL="postgresql://username:password@host:port/database"
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:seed` - Seed database with sample data

### Database Commands

- `npx prisma generate` - Generate Prisma client
- `npx prisma migrate dev` - Create and apply migrations
- `npx prisma studio` - Open database browser
- `npx prisma db seed` - Run seed script

## 📁 Project Structure

```
personal-finance/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── accounts/     # Account management
│   │   │   ├── transactions/ # Transaction handling
│   │   │   └── tags/         # Tag management
│   │   ├── accounts/         # Account pages
│   │   ├── transactions/     # Transaction pages
│   │   ├── tags/            # Tag pages
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Dashboard
│   └── lib/
│       ├── prisma.ts        # Prisma client
│       └── accounting.ts    # Business logic
├── prisma/
│   ├── schema.prisma        # Database schema
│   ├── seed.ts             # Sample data
│   └── migrations/         # Database migrations
└── public/                 # Static assets
```

## 🔧 Customization

### Adding New Account Types
1. Update `AccountType` enum in `prisma/schema.prisma`
2. Run migration: `npx prisma migrate dev`
3. Update UI components to handle new type

### Adding New Transaction Types
1. Update transaction type handling in `src/lib/accounting.ts`
2. Add UI components for new transaction type
3. Update validation logic

### Styling Customization
- Modify Tailwind classes in components
- Update color schemes in `tailwind.config.js`
- Add custom CSS in `src/app/globals.css`

## �� Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code examples

---

**Built with ❤️ using Next.js, Prisma, and Tailwind CSS**
