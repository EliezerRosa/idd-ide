-- ==============================================================================
-- APP RACHA DE CONTA & PIX - SCHEMA DE BANCO & INVARIANTES DE DOMÍNIO
-- Paradigma IDD: Invariante da Soma Zero e rateio justo no centavo
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MESAS / EVENTOS DE RATEIO
CREATE TYPE status_mesa AS ENUM ('ABERTA', 'EM_RATEIO', 'AGUARDANDO_PAGAMENTO', 'LIQUIDADA');

CREATE TABLE mesas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(100) NOT NULL, -- Ex: "Churrasco de Domingo" ou "Outback Amigos"
    taxa_servico_percentual DECIMAL(5,2) DEFAULT 10.0 CHECK (taxa_servico_percentual >= 0),
    status status_mesa DEFAULT 'ABERTA',
    valor_total_nota DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (valor_total_nota >= 0),
    chave_pix_destinatario VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PARTICIPANTES DA MESA
CREATE TABLE participantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mesa_id UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
    nome VARCHAR(80) NOT NULL,
    telefone_whatsapp VARCHAR(20),
    valor_a_pagar DECIMAL(10,2) DEFAULT 0 CHECK (valor_a_pagar >= 0),
    pago BOOLEAN DEFAULT FALSE,
    comprovante_pix_url TEXT
);

-- 3. ITENS DA CONTA
CREATE TABLE itens_conta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mesa_id UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
    descricao VARCHAR(100) NOT NULL,
    preco_total DECIMAL(10,2) NOT NULL CHECK (preco_total > 0)
);

-- 4. CONSUMO PARTICIPANTE X ITEM (N:N)
-- Quem consumiu qual item para divisão exata
CREATE TABLE item_consumidores (
    item_id UUID REFERENCES itens_conta(id) ON DELETE CASCADE,
    participante_id UUID REFERENCES participantes(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, participante_id)
);

-- 5. FUNCTION DE VALIDAÇÃO DA INVARIANTE DA SOMA ZERO
-- A soma do valor_a_pagar de todos os participantes DEVE bater exatamente com o valor_total_nota
CREATE OR REPLACE FUNCTION validar_invariante_soma_zero(p_mesa_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_total_nota DECIMAL(10,2);
    v_soma_participantes DECIMAL(10,2);
BEGIN
    SELECT valor_total_nota INTO v_total_nota FROM mesas WHERE id = p_mesa_id;
    SELECT COALESCE(SUM(valor_a_pagar), 0) INTO v_soma_participantes FROM participantes WHERE mesa_id = p_mesa_id;

    IF v_total_nota <> v_soma_participantes THEN
        RAISE EXCEPTION 'VIOLAÇÃO DA INVARIANTE DA SOMA ZERO: O total da nota (%) difere da soma dos participantes (%)!',
            v_total_nota, v_soma_participantes;
    END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
