import { pathToFileURL } from 'node:url';
import { env } from './config/env.js';
import { User } from './models/User.js';
import { Business } from './models/Business.js';
import { Service } from './models/Service.js';

export async function seedAdmin() {
  if (await User.exists({ role: 'ADMIN' })) return;
  await User.create({
    name: 'Platform Admin', email: env.adminEmail, role: 'ADMIN',
  });
  console.log(`[seed] Admin created: ${env.adminEmail} (sign in with Google using this email)`);
}

const DEMO = [
  {
    owner: { name: 'Rajesh Sharma', email: 'owner1@demo.com', phone: '9876500001' },
    business: { name: 'Royal Style Studio', type: 'SALON', genderCategory: 'UNISEX', address: 'Janakpuri', city: 'Delhi', description: 'Premium unisex salon with experienced stylists.' },
    services: [['Haircut', 250, 30], ['Hair Spa', 600, 60], ['Beard Trim', 150, 20]],
  },
  {
    owner: { name: 'Amit Verma', email: 'owner2@demo.com', phone: '9876500002' },
    business: { name: "Gentlemen's Hub", type: 'SALON', genderCategory: 'MALE_ONLY', address: 'Lajpat Nagar', city: 'Delhi', description: 'Grooming for men.' },
    services: [['Classic Haircut', 200, 30], ['Shave', 100, 20]],
  },
  {
    owner: { name: 'Priya Singh', email: 'owner3@demo.com', phone: '9876500003' },
    business: { name: 'Glow Beauty Parlour', type: 'PARLOUR', genderCategory: 'FEMALE_ONLY', address: 'Dwarka Sector 12', city: 'Delhi', description: 'Facials, waxing and bridal makeup.' },
    services: [['Facial', 800, 45], ['Waxing', 500, 30], ['Bridal Makeup', 5000, 120]],
  },
];

export async function seedDemo() {
  if (await Business.exists()) return;
  await User.create([
    { name: 'Demo Customer', email: 'customer@demo.com', phone: '9876500010', gender: 'MALE' },
    { name: 'Demo Customer (F)', email: 'customer.f@demo.com', phone: '9876500011', gender: 'FEMALE' },
  ]);
  for (const d of DEMO) {
    const owner = await User.create({ ...d.owner, role: 'OWNER' });
    const business = await Business.create({
      ...d.business, ownerId: owner._id, ownerName: owner.name, phone: owner.phone, email: owner.email,
      status: 'ACTIVE', isVerified: true, breakHours: [{ start: '14:00', end: '15:00' }],
    });
    await Service.create(d.services.map(([name, price, duration]) => ({ businessId: business._id, name, price, duration })));
    await Business.updateOne({ _id: business._id }, { minPrice: Math.min(...d.services.map((s) => s[1])) });
  }
  console.log('[seed] Demo salons/parlours loaded (browse-only: sign in with Google to create real accounts).');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const { connectDB, disconnectDB } = await import('./config/db.js');
  await connectDB();
  await seedAdmin();
  await seedDemo();
  await disconnectDB();
}
