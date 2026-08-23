import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Food', description: 'Restaurants, groceries, food delivery' },
  { name: 'Shopping', description: 'E-commerce, apparel, electronics' },
  { name: 'Bills', description: 'Electricity, water, gas, internet' },
  { name: 'Travel', description: 'Flights, trains, cabs, hotels' },
  { name: 'Fuel', description: 'Petrol, diesel, CNG' },
  { name: 'Medicine', description: 'Pharmacies, hospital bills, doctor consultation' },
  { name: 'Entertainment', description: 'Movies, streaming services, events' },
  { name: 'Salary', description: 'Monthly paycheck, freelancing income' },
  { name: 'Investments', description: 'Mutual funds, stocks, gold, FD' },
  { name: 'Insurance', description: 'Health, life, motor insurance' },
  { name: 'Rent', description: 'House rent, office rent' },
  { name: 'Education', description: 'School/college fees, online courses, books' },
  { name: 'Taxes', description: 'Income tax, GST, property tax' },
  { name: 'EMIs', description: 'Home loan, car loan, personal loan EMIs' },
  { name: 'Recharge', description: 'Mobile, DTH, Fastag recharges' },
  { name: 'Transfer', description: 'Peer-to-peer transfers, self transfers' },
  { name: 'ATM', description: 'Cash withdrawals' },
  { name: 'Others', description: 'Miscellaneous expenses' }
];

async function main() {
  console.log('Seeding categories...');
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log('Categories seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
