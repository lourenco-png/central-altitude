/**
 * Reset de senha de emergência para o usuário admin.
 *
 * Uso:
 *   DATABASE_URL="postgresql://..." NEW_ADMIN_PASSWORD="SenhaNova@2026!" \
 *     npx ts-node scripts/reset-admin-password.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const newPassword = process.env.NEW_ADMIN_PASSWORD;
  if (!newPassword) {
    console.error('[ERRO] Defina NEW_ADMIN_PASSWORD antes de rodar este script.');
    process.exit(1);
  }

  if (newPassword.length < 12) {
    console.error('[ERRO] A senha deve ter pelo menos 12 caracteres.');
    process.exit(1);
  }

  const hashed = await bcrypt.hash(newPassword, 12);

  const result = await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: { password: hashed },
  });

  if (result.count === 0) {
    console.error('[AVISO] Nenhum usuário ADMIN encontrado no banco.');
    process.exit(1);
  }

  console.log(`[OK] Senha redefinida para ${result.count} usuário(s) ADMIN.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
