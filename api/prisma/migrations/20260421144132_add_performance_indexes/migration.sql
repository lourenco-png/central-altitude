-- CreateIndex
CREATE INDEX "epis_funcionarioId_idx" ON "epis"("funcionarioId");

-- CreateIndex
CREATE INDEX "epis_validade_idx" ON "epis"("validade");

-- CreateIndex
CREATE INDEX "notificacoes_userId_lida_idx" ON "notificacoes"("userId", "lida");

-- CreateIndex
CREATE INDEX "notificacoes_userId_createdAt_idx" ON "notificacoes"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "obras_status_idx" ON "obras"("status");

-- CreateIndex
CREATE INDEX "obras_clienteId_idx" ON "obras"("clienteId");

-- CreateIndex
CREATE INDEX "rdos_obraId_idx" ON "rdos"("obraId");

-- CreateIndex
CREATE INDEX "rdos_rdoStatus_idx" ON "rdos"("rdoStatus");

-- CreateIndex
CREATE INDEX "solicitacoes_status_idx" ON "solicitacoes"("status");

-- CreateIndex
CREATE INDEX "solicitacoes_data_idx" ON "solicitacoes"("data");

-- CreateIndex
CREATE INDEX "solicitacoes_obraId_idx" ON "solicitacoes"("obraId");

-- CreateIndex
CREATE INDEX "solicitacoes_engenheiroId_idx" ON "solicitacoes"("engenheiroId");
