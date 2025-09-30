import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function queryUnsafe<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  // Uses $queryRawUnsafe for dynamic SQL pieces built safely with parameter placeholders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await (prisma.$queryRawUnsafe as any)(sql, ...params)) as T[];
}

