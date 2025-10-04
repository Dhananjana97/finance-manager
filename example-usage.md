# Virtual Tag Balances - Usage Examples

## Overview

This system allows you to assign virtual balances to tags while money physically resides in accounts. This enables you to track money for specific purposes (like "Vehicle Deposit", "Emergency Fund") across multiple physical accounts.

## Key Concepts

1. **Physical Accounts**: Real bank accounts, cash, etc. where money actually resides
2. **Virtual Tag Balances**: Money assigned to tags for tracking purposes
3. **Currency Support**: Tag balances are currency-specific
4. **Validation**: Tag balances cannot exceed physical account balances

## Example Scenarios

### Scenario 1: Vehicle Deposit

```typescript
// You have 10,000 LKR in "Checking Account"
// You want to set aside 4,000 LKR for a vehicle deposit

// Step 1: Transfer money from Checking to Savings (physical transfer)
await accountingService.createTaggedTransferTransaction({
  description: "Vehicle deposit allocation",
  amount: 4000,
  tagId: "vehicle-deposit-tag-id",
  fromAccountId: "checking-account-id",
  toAccountId: "savings-account-id",
});

// Result:
// - Physical: Checking (-4000), Savings (+4000)
// - Virtual: "Vehicle Deposit" tag gets +4000 virtual balance in Savings account
```

### Scenario 2: Spending from Tag

```typescript
// You spend 1,000 LKR from the vehicle deposit for car insurance
await accountingService.createTaggedExpenseTransaction({
  description: "Car insurance payment",
  amount: 1000,
  tagId: "vehicle-deposit-tag-id",
  assetAccountId: "savings-account-id", // Where money comes from
  expenseAccountId: "insurance-expense-account-id",
});

// Result:
// - Physical: Savings (-1000), Insurance Expense (+1000)
// - Virtual: "Vehicle Deposit" tag balance reduced by 1000
```

### Scenario 3: Multiple Tags in Same Account

```typescript
// You have 20,000 LKR in "Savings Account"
// You want to allocate:
// - 5,000 LKR for "Emergency Fund"
// - 3,000 LKR for "Vacation Fund"

// Assign to Emergency Fund
await tagBalanceService.assignMoneyToTag("emergency-fund-tag-id", "savings-account-id", 5000);

// Assign to Vacation Fund
await tagBalanceService.assignMoneyToTag("vacation-fund-tag-id", "savings-account-id", 3000);

// Result:
// - Physical: Savings Account still has 20,000 LKR
// - Virtual: Emergency Fund (5,000), Vacation Fund (3,000)
// - Available: 12,000 LKR unassigned in Savings
```

## API Endpoints

### Get Tag Balance

```bash
# Get balance for a specific tag across all accounts
GET /api/tag-balances?tagId=vehicle-deposit-tag-id

# Get balance for a tag in a specific account
GET /api/tag-balances?tagId=vehicle-deposit-tag-id&accountId=savings-account-id

# Get all tag balances for an account
GET /api/tag-balances?accountId=savings-account-id
```

### Assign Money to Tag

```bash
POST /api/tag-balances
{
  "tagId": "vehicle-deposit-tag-id",
  "accountId": "savings-account-id",
  "amount": 4000
}
```

### Create Tagged Transactions

```bash
# Tagged Transfer
POST /api/tagged-transactions
{
  "type": "transfer",
  "description": "Vehicle deposit allocation",
  "amount": 4000,
  "tagId": "vehicle-deposit-tag-id",
  "fromAccountId": "checking-account-id",
  "toAccountId": "savings-account-id"
}

# Tagged Expense
POST /api/tagged-transactions
{
  "type": "expense",
  "description": "Car insurance",
  "amount": 1000,
  "tagId": "vehicle-deposit-tag-id",
  "assetAccountId": "savings-account-id",
  "expenseAccountId": "insurance-expense-account-id"
}
```

### Validate Constraints

```bash
# Check if tag balance constraints are valid
GET /api/tag-balances/validate?tagId=vehicle-deposit-tag-id&accountId=savings-account-id
```

## Key Features

1. **Currency Support**: Tag balances are tracked per currency
2. **Validation**: Cannot assign more money to tags than exists in physical accounts
3. **Multiple Accounts**: One tag can have money in multiple physical accounts
4. **Automatic Updates**: Tag balances are automatically updated when you create tagged transactions
5. **Account-wise Tracking**: See how much of each tag's money is in which physical account

## Benefits

- **Purpose-based Budgeting**: Track money for specific goals
- **Multi-account Support**: Allocate money across different accounts while maintaining virtual organization
- **Spending Control**: Ensure you don't overspend from specific purposes
- **Financial Planning**: Better visibility into how your money is allocated
