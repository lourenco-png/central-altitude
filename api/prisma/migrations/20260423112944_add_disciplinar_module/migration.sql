-- CreateEnum
CREATE TYPE "TipoAcaoDisciplinar" AS ENUM ('ADVERTENCIA_VERBAL', 'ADVERTENCIA_ESCRITA', 'SUSPENSAO', 'JUSTA_CAUSA', 'CARTA_ABANDONO');

-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('PENDENTE', 'ASSINADO', 'RECUSADO');

-- AlterTable
ALTER TABLE "faltas" ADD COLUMN     "punida" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "acoes_disciplinares" (
    "id" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "tipo" "TipoAcaoDisciplinar" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "diasSuspensao" INTEGER,
    "faltasVinculadas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentoPdf" TEXT,
    "statusAssinatura" "StatusAssinatura" NOT NULL DEFAULT 'PENDENTE',
    "documentoAssinado" TEXT,
    "overrideJustificativa" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acoes_disciplinares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acoes_disciplinares_funcionarioId_idx" ON "acoes_disciplinares"("funcionarioId");

-- CreateIndex
CREATE INDEX "acoes_disciplinares_tipo_idx" ON "acoes_disciplinares"("tipo");

-- AddForeignKey
ALTER TABLE "acoes_disciplinares" ADD CONSTRAINT "acoes_disciplinares_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "funcionarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
