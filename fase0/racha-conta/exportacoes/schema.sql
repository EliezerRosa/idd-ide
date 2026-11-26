-- Gerado por idd domain compile
-- Domínio: racha-conta  |  Versão: 0.0.1
-- Data: 2026-10-30T21:52:24.799Z
-- Formas normais alvo: até 3NF/BCNF

BEGIN;

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Participante ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS participantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mesa_id UUID NOT NULL,
  nome VARCHAR(255) NOT NULL,
  CONSTRAINT fk_participantes_mesa_id
    FOREIGN KEY (mesa_id) REFERENCES mesas(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_participantes_mesa_id ON participantes (mesa_id);

-- ── Mesa ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mesas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  responsavel_id UUID NOT NULL,
  chave_pix VARCHAR(255) NOT NULL,
  taxa_servico_percentual NUMERIC(15,4) NOT NULL,
  fechada_em TIMESTAMPTZ,
  CONSTRAINT fk_mesas_responsavel_id
    FOREIGN KEY (responsavel_id) REFERENCES participantes(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mesas_responsavel_id ON mesas (responsavel_id);

-- ── ItemConsumido ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS item_consumidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mesa_id UUID NOT NULL,
  ordem INTEGER NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  preco_centavos INTEGER NOT NULL,
  CONSTRAINT fk_item_consumidos_mesa_id
    FOREIGN KEY (mesa_id) REFERENCES mesas(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_consumidos_mesa_id ON item_consumidos (mesa_id);

-- ── Consumo ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consumos (
  item_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participante_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  CONSTRAINT fk_consumos_item_id
    FOREIGN KEY (item_id) REFERENCES item_consumidos(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_consumos_participante_id
    FOREIGN KEY (participante_id) REFERENCES participantes(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);


-- ── Pagamento ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participante_id UUID NOT NULL,
  comprovante_url VARCHAR(255) NOT NULL,
  valor_centavos INTEGER NOT NULL,
  enviado_em TIMESTAMPTZ NOT NULL,
  confirmado_em TIMESTAMPTZ,
  CONSTRAINT fk_pagamentos_participante_id
    FOREIGN KEY (participante_id) REFERENCES participantes(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_participante_id ON pagamentos (participante_id);

COMMIT;

-- Rollback:
-- DROP TABLE IF EXISTS pagamentos, consumos, item_consumidos, mesas, participantes CASCADE;