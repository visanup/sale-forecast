import { PrismaClient, Role } from '@prisma/client';
import { PasswordUtil } from '../src/utils/password.util';

const prisma = new PrismaClient();

const ADMIN_USERS = [
  { username: 'qiadmin', email: 'qiadmin@betagro.com', password: 'P@55W0rd123', mustChangePassword: true },
  { username: 'aiadmin', email: 'aiadmin@betagro.com', password: 'P@ssWord456', mustChangePassword: true },
  { username: 'biadmin', email: 'biadmin@betagro.com', password: 'p@55w0RD789', mustChangePassword: true },
  { username: 'diadmin', email: 'diadmin@betagro.com', password: 'P@5sW0rd012', mustChangePassword: true },
  { username: 'ahbadmin', email: 'ahbadmin@betagro.com', password: 'AhbP@ssw0rd1150', mustChangePassword: true },
  { username: 'feedadmin', email: 'feedadmin@betagro.com', password: 'FeedP@ssw0rd1112', mustChangePassword: true },
  { username: 'agroscmadmin', email: 'agroscmadmin@betagro.com', password: 'AGROSCMP@ssw0rd1169', mustChangePassword: true }
] as const;

async function seed(): Promise<void> {
  console.info('Seeding admin users...');

  for (const admin of ADMIN_USERS) {
    const email = admin.email.toLowerCase();
    const username = admin.username.toLowerCase();
    const passwordHash = await PasswordUtil.hash(admin.password);

    await prisma.user.upsert({
      where: { email },
      update: {
        username,
        firstName: username,
        password: passwordHash,
        role: Role.ADMIN,
        isActive: true,
        emailVerified: true,
        mustChangePassword: Boolean(admin.mustChangePassword)
      },
      create: {
        email,
        username,
        firstName: username,
        password: passwordHash,
        role: Role.ADMIN,
        isActive: true,
        emailVerified: true,
        mustChangePassword: Boolean(admin.mustChangePassword)
      }
    });

    console.info('Upserted admin: ' + email);
  }
}

seed()
  .then(async () => {
    console.info('Admin seeding completed.');
    await prisma.$disconnect();   // ✅ FIX
  })
  .catch(async (error) => {
    console.error('Seeding failed:', error);
    await prisma.$disconnect();   // ✅ FIX
    process.exit(1);
  });
