-- ==============================================================================
-- APP BARBEARIA PERFEITA - SCHEMA DE BANCO & INVARIANTES DE DOMÍNIO
-- Paradigma IDD: Cada tabela e constraint reflete uma Invariante de Negócio
-- ==============================================================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TENANT / UNIDADE (Isolamento Multitenant)
CREATE TABLE unidades_barbearia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    endereco VARCHAR(200) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROFISSIONAL (Barbeiro / Cabeleireiro)
-- INVARIANTE: Comissão padrão entre 0% e 100%
CREATE TABLE profissionais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID REFERENCES unidades_barbearia(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    especialidade VARCHAR(50) NOT NULL,
    comissao_percentual DECIMAL(5,2) NOT NULL CHECK (comissao_percentual >= 0 AND comissao_percentual <= 100),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SERVIÇOS DO CATÁLOGO
-- INVARIANTE: Duração mínima de 10 minutos e preço positivo
CREATE TABLE servicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID REFERENCES unidades_barbearia(id) ON DELETE CASCADE,
    nome VARCHAR(80) NOT NULL,
    duracao_minutos INT NOT NULL CHECK (duracao_minutos >= 10),
    preco DECIMAL(10,2) NOT NULL CHECK (preco > 0),
    ativo BOOLEAN DEFAULT TRUE
);

-- 4. CLIENTES
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    telefone_whatsapp VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AGENDAMENTOS (O Coração do Domínio)
-- INVARIANTE SAGRADA DA CADEIRA ÚNICA: Data de término deve ser após o início
CREATE TYPE status_agendamento AS ENUM ('RESERVADO', 'CONFIRMADO', 'NA_CADEIRA', 'CONCLUIDO', 'CANCELADO');

CREATE TABLE agendamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID REFERENCES unidades_barbearia(id),
    profissional_id UUID NOT NULL REFERENCES profissionais(id),
    cliente_id UUID NOT NULL REFERENCES clientes(id),
    data_hora_inicio TIMESTAMPTZ NOT NULL,
    data_hora_fim TIMESTAMPTZ NOT NULL,
    status status_agendamento DEFAULT 'RESERVADO',
    valor_total DECIMAL(10,2) NOT NULL CHECK (valor_total >= 0),
    valor_comissao_profissional DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- INVARIANTE TEMPORAL: O fim deve ser estritamente posterior ao início
    CONSTRAINT check_ordem_tempo CHECK (data_hora_fim > data_hora_inicio)
);

-- 6. ITENS DO AGENDAMENTO (Serviços combinados 1:N)
CREATE TABLE agendamento_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agendamento_id UUID NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
    servico_id UUID NOT NULL REFERENCES servicos(id),
    preco_aplicado DECIMAL(10,2) NOT NULL,
    duracao_aplicada INT NOT NULL
);

-- 7. TRIGGER DE BLOQUEIO DE COLISÃO DE CADEIRA (INVARIANTE DA CADEIRA ÚNICA)
-- Nenhum barbeiro pode ter dois agendamentos ativos sobrepostos no tempo
CREATE OR REPLACE FUNCTION check_colisao_cadeira()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM agendamentos
        WHERE profissional_id = NEW.profissional_id
          AND id <> NEW.id
          AND status <> 'CANCELADO'
          AND (
              (NEW.data_hora_inicio >= data_hora_inicio AND NEW.data_hora_inicio < data_hora_fim) OR
              (NEW.data_hora_fim > data_hora_inicio AND NEW.data_hora_fim <= data_hora_fim) OR
              (NEW.data_hora_inicio <= data_hora_inicio AND NEW.data_hora_fim >= data_hora_fim)
          )
    ) THEN
        RAISE EXCEPTION 'VIOLAÇÃO DE INVARIANTE: O profissional já possui um cliente agendado nesta cadeira neste horário!';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bloquear_colisao_cadeira
BEFORE INSERT OR UPDATE ON agendamentos
FOR EACH ROW EXECUTE FUNCTION check_colisao_cadeira();
