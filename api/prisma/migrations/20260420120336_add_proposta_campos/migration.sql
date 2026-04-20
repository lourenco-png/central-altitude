-- AlterTable
ALTER TABLE "itens_orcamento" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "unidade" TEXT DEFAULT 'un';

-- AlterTable
ALTER TABLE "propostas" ADD COLUMN     "versao" INTEGER NOT NULL DEFAULT 1;
