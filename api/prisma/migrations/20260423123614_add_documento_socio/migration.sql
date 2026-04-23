-- CreateTable
CREATE TABLE "documentos_socios" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "arquivo" TEXT,
    "emissao" TIMESTAMP(3),
    "validade" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_socios_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "documentos_socios" ADD CONSTRAINT "documentos_socios_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "socios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
