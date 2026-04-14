-- CreateEnum
CREATE TYPE "TipoOrcamento" AS ENUM ('GENERICO', 'TOPOGRAFIA', 'INFRA_PREDIAL');

-- AlterTable
ALTER TABLE "orcamentos" ADD COLUMN     "dadosEspecificos" JSONB,
ADD COLUMN     "tipo" "TipoOrcamento" NOT NULL DEFAULT 'GENERICO';
