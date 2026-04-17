-- CreateEnum
CREATE TYPE "TipoFalta" AS ENUM ('FALTA', 'ATRASO', 'SAIDA_ANTECIPADA');

-- AlterTable
ALTER TABLE "medicoes" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "faltas" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoFalta" NOT NULL DEFAULT 'FALTA',
    "justificada" BOOLEAN NOT NULL DEFAULT false,
    "motivo" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faltas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "faltas" ADD CONSTRAINT "faltas_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
