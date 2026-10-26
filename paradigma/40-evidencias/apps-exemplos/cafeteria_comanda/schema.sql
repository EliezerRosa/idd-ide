-- ==============================================================================
-- APP CAFETERIA & PADARIA - SCHEMA DE BANCO & INVARIANTES DE DOMÍNIO
-- Paradigma IDD: Estoque Crítico e Comanda com Integridade Inviolável
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CATEGORIAS DE PRODUTOS
CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(50) NOT NULL,
    icone VARCHAR(20) DEFAULT '☕'
);

-- 2. INGREDIENTES & ESTOQUE CRÍTICO
CREATE TABLE ingredientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(80) NOT NULL,
    quantidade_atual DECIMAL(10,3) NOT NULL CHECK (quantidade_atual >= 0),
    unidade_medida VARCHAR(10) NOT NULL -- 'kg', 'litros', 'unidades'
);

-- 3. PRODUTOS DO CARDÁPIO
CREATE TABLE produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID REFERENCES categorias(id),
    nome VARCHAR(100) NOT NULL,
    preco DECIMAL(10,2) NOT NULL CHECK (preco > 0),
    disponivel BOOLEAN DEFAULT TRUE,
    tempo_estimado_preparo_minutos INT NOT NULL CHECK (tempo_estimado_preparo_minutos >= 1)
);

-- Tabela de Receita (Vínculo de Ingrediente para Invariante de Estoque)
CREATE TABLE produto_receita (
    produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
    ingrediente_id UUID REFERENCES ingredientes(id),
    quantidade_necessaria DECIMAL(10,3) NOT NULL CHECK (quantidade_necessaria > 0),
    PRIMARY KEY (produto_id, ingrediente_id)
);

-- 4. COMANDAS / PEDIDOS
CREATE TYPE status_comanda AS ENUM ('RECEBIDO', 'EM_PREPARO', 'PRONTO', 'ENTREGUE', 'CANCELADO');

CREATE TABLE comandas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_mesa_ou_comanda INT NOT NULL,
    status status_comanda DEFAULT 'RECEBIDO',
    valor_subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_desconto DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    pago BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- INVARIANTE MATEMÁTICA: Total = Subtotal - Desconto
    CONSTRAINT check_valor_total CHECK (valor_total = valor_subtotal - valor_desconto)
);

-- 5. ITENS DA COMANDA
CREATE TABLE comanda_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comanda_id UUID NOT NULL REFERENCES comandas(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id),
    quantidade INT NOT NULL CHECK (quantidade > 0),
    preco_unitario DECIMAL(10,2) NOT NULL CHECK (preco_unitario > 0),
    observacoes_preparo VARCHAR(200)
);

-- 6. TRIGGER DE BLINDAGEM DO ESTOQUE (INVARIANTE DE ESTOQUE CRÍTICO)
-- Se não houver ingrediente suficiente na despensa, a comanda é abortada
CREATE OR REPLACE FUNCTION check_estoque_ingrediente()
RETURNS TRIGGER AS $$
DECLARE
    ing RECORD;
BEGIN
    FOR ing IN (
        SELECT pr.ingrediente_id, (pr.quantidade_necessaria * NEW.quantidade) AS total_preciso, i.nome, i.quantidade_atual
        FROM produto_receita pr
        JOIN ingredientes i ON i.id = pr.ingrediente_id
        WHERE pr.produto_id = NEW.produto_id
    ) LOOP
        IF ing.quantidade_atual < ing.total_preciso THEN
            RAISE EXCEPTION 'VIOLAÇÃO DE INVARIANTE: Estoque insuficiente do ingrediente "%"! Disponível: %, Necessário: %',
                ing.nome, ing.quantidade_atual, ing.total_preciso;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_verificar_estoque_comanda
BEFORE INSERT ON comanda_itens
FOR EACH ROW EXECUTE FUNCTION check_estoque_ingrediente();
