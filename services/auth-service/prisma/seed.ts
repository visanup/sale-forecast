import bcrypt from 'bcrypt';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_USERS = [
  {
    username: 'qiadmin',
    email: 'qiadmin@betagro.com',
    password: 'P@55W0rd123'
  },
  {
    username: 'aiadmin',
    email: 'aiadmin@betagro.com',
    password: 'P@ssWord456'
  },
  {
    username: 'biadmin',
    email: 'biadmin@betagro.com',
    password: 'p@55w0RD789'
  },
  {
    username: 'diadmin',
    email: 'diadmin@betagro.com',
    password: 'P@5sW0rd012'
  }
] as const;

const BCRYPT_ROUNDS = 12;

async function seed(): Promise<void> {
  console.info('Seeding admin users...');

  for (const admin of ADMIN_USERS) {
    const passwordHash = await bcrypt.hash(admin.password, BCRYPT_ROUNDS);

    await prisma.user.upsert({
      where: { email: admin.email },
      update: {
        username: admin.username,
        firstName: admin.username,
        password: passwordHash,
        role: Role.ADMIN,
        isActive: true,
        emailVerified: true
      },
      create: {
        email: admin.email,
        username: admin.username,
        firstName: admin.username,
        password: passwordHash,
        role: Role.ADMIN,
        isActive: true,
        emailVerified: true
      }
    });

    console.info(`Upserted admin: ${admin.email}`);
  }
}

seed()
  .then(async () => {
    console.info('Admin seeding completed.');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });

