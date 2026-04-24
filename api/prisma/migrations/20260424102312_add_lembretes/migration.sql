-- CreateEnum
CREATE TYPE "TipoLembrete" AS ENUM ('MEDICAO', 'NOTA_FISCAL');

-- CreateEnum
CREATE TYPE "LembreteStatus" AS ENUM ('PENDENTE', 'EMITIDO');

-- CreateTable
CREATE TABLE "lembretes" (
    "id" TEXT NOT NULL,
    "tipo" "TipoLembrete" NOT NULL,
    "solicitacaoId" TEXT NOT NULL,
    "periodoReferencia" TEXT NOT NULL,
    "status" "LembreteStatus" NOT NULL DEFAULT 'PENDENTE',
    "dataEmissao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lembretes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lembretes_status_idx" ON "lembretes"("status");

-- CreateIndex
CREATE INDEX "lembretes_tipo_idx" ON "lembretes"("tipo");

-- CreateIndex
CREATE INDEX "lembretes_periodoReferencia_idx" ON "lembretes"("periodoReferencia");

-- CreateIndex
CREATE UNIQUE INDEX "lembretes_tipo_solicitacaoId_periodoReferencia_key" ON "lembretes"("tipo", "solicitacaoId", "periodoReferencia");

-- AddForeignKey
ALTER TABLE "lembretes" ADD CONSTRAINT "lembretes_solicitacaoId_fkey" FOREIGN KEY ("solicitacaoId") REFERENCES "solicitacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
