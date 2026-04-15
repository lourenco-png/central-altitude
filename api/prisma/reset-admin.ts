import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@centralaltitude.com' },
    update: { password: hashed, ativo: true },
    create: {
      email: 'admin@centralaltitude.com',
      password: hashed,
      nome: 'Administrador',
      role: 'ADMIN' as any,
      ativo: true,
    },
  });
  console.log('Admin OK:', user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
