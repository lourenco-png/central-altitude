-- Fotos em obras
ALTER TABLE "obras" ADD COLUMN IF NOT EXISTS "fotos" TEXT[] DEFAULT '{}';

-- Aprovação de orçamento
ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "aprovacaoToken" TEXT;
ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "aprovacaoResposta" TEXT;
ALTER TABLE "orcamentos" ADD COLUMN IF NOT EXISTS "aprovacaoMensagem" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "orcamentos_aprovacaoToken_key" ON "orcamentos"("aprovacaoToken");

-- Medições por obra
CREATE TABLE IF NOT EXISTS "medicoes" (
  "id"        TEXT NOT NULL,
  "obraId"    TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "valor"     DOUBLE PRECISION NOT NULL,
  "data"      TIMESTAMP(3) NOT NULL,
  "status"    TEXT NOT NULL DEFAULT 'pendente',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "medicoes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "medicoes_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
