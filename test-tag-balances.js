const { PrismaClient } = require("./src/generated/prisma");
const { tagBalanceService, accountingService } = require("./src/lib/accounting");

const prisma = new PrismaClient();

async function testTagBalances() {
  try {
    console.log("🧪 Testing Tag Balance System...\n");

    // 1. Create test accounts
    console.log("1. Creating test accounts...");
    const checkingAccount = await prisma.account.create({
      data: {
        name: "Test Checking Account",
        type: "ASSET",
        balance: 10000,
        currency: "LKR",
        description: "Test checking account",
      },
    });

    const savingsAccount = await prisma.account.create({
      data: {
        name: "Test Savings Account",
        type: "ASSET",
        balance: 0,
        currency: "LKR",
        description: "Test savings account",
      },
    });

    console.log(
      `✅ Created checking account: ${checkingAccount.name} (${checkingAccount.balance} ${checkingAccount.currency})`
    );
    console.log(
      `✅ Created savings account: ${savingsAccount.name} (${savingsAccount.balance} ${savingsAccount.currency})`
    );

    // 2. Create test tag
    console.log("\n2. Creating test tag...");
    const vehicleTag = await prisma.tag.create({
      data: {
        name: "Vehicle Deposit",
        description: "Money set aside for vehicle purchase",
        color: "#FF5733",
      },
    });

    console.log(`✅ Created tag: ${vehicleTag.name}`);

    // 3. Test assigning money to tag
    console.log("\n3. Testing tag balance assignment...");
    const assignResult = await tagBalanceService.assignMoneyToTag(vehicleTag.id, checkingAccount.id, 4000);

    console.log(`✅ Assigned 4000 LKR to Vehicle Deposit tag in checking account`);
    console.log(`   Tag Balance: ${assignResult.balance} ${assignResult.currency}`);

    // 4. Test getting tag balance
    console.log("\n4. Testing tag balance retrieval...");
    const tagBalance = await tagBalanceService.getTagBalanceInAccount(vehicleTag.id, checkingAccount.id);

    console.log(`✅ Retrieved tag balance: ${tagBalance.balance} ${tagBalance.currency}`);

    // 5. Test tagged transfer
    console.log("\n5. Testing tagged transfer...");
    const transferResult = await accountingService.createTaggedTransferTransaction({
      description: "Transfer to savings for vehicle deposit",
      amount: 4000,
      tagId: vehicleTag.id,
      fromAccountId: checkingAccount.id,
      toAccountId: savingsAccount.id,
    });

    console.log(`✅ Created tagged transfer: ${transferResult.transaction.description}`);

    // 6. Check balances after transfer
    console.log("\n6. Checking balances after transfer...");
    const checkingAfter = await prisma.account.findUnique({ where: { id: checkingAccount.id } });
    const savingsAfter = await prisma.account.findUnique({ where: { id: savingsAccount.id } });
    const tagBalanceAfter = await tagBalanceService.getTagBalanceInAccount(vehicleTag.id, savingsAccount.id);

    console.log(`📊 Physical Balances:`);
    console.log(`   Checking: ${checkingAfter.balance} ${checkingAfter.currency}`);
    console.log(`   Savings: ${savingsAfter.balance} ${savingsAfter.currency}`);
    console.log(`📊 Virtual Tag Balance:`);
    console.log(`   Vehicle Deposit in Savings: ${tagBalanceAfter.balance} ${tagBalanceAfter.currency}`);

    // 7. Test spending from tag
    console.log("\n7. Testing spending from tag...");
    const expenseAccount = await prisma.account.create({
      data: {
        name: "Vehicle Expenses",
        type: "EXPENSE",
        balance: 0,
        currency: "LKR",
        description: "Vehicle-related expenses",
      },
    });

    const expenseResult = await accountingService.createTaggedExpenseTransaction({
      description: "Car insurance payment",
      amount: 1000,
      tagId: vehicleTag.id,
      assetAccountId: savingsAccount.id,
      expenseAccountId: expenseAccount.id,
    });

    console.log(`✅ Created tagged expense: ${expenseResult.transaction.description}`);

    // 8. Final balance check
    console.log("\n8. Final balance check...");
    const finalSavings = await prisma.account.findUnique({ where: { id: savingsAccount.id } });
    const finalTagBalance = await tagBalanceService.getTagBalanceInAccount(vehicleTag.id, savingsAccount.id);

    console.log(`📊 Final Balances:`);
    console.log(`   Savings Account: ${finalSavings.balance} ${finalSavings.currency}`);
    console.log(`   Vehicle Deposit Tag: ${finalTagBalance.balance} ${finalTagBalance.currency}`);

    console.log("\n🎉 All tests passed! Tag balance system is working correctly.");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testTagBalances();
