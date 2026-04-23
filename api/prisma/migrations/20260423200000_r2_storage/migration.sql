-- AlterTable: adiciona suporte a R2/S3 como storage externo
-- "data" vira nullable (null = arquivo está no R2)
-- "storage" indica onde o arquivo está: 'DB' (legado) ou 'R2' (novo)
-- "key" é o caminho do objeto no bucket R2

ALTER TABLE "files" ADD COLUMN "key" TEXT;
ALTER TABLE "files" ADD COLUMN "storage" TEXT NOT NULL DEFAULT 'DB';
ALTER TABLE "files" ALTER COLUMN "data" DROP NOT NULL;
