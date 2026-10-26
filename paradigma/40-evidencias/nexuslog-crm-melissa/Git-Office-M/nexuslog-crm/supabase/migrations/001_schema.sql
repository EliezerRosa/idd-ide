-- ============================================================
-- NEXUS LOG CRM — Schema do Banco de Dados
-- Execute isso no SQL Editor do Supabase (uma vez só)
-- ============================================================

-- ── EXTENSÕES ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── TABELAS ──────────────────────────────────────────────────

-- Perfis de usuário (vinculados ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT DEFAULT 'Consultor de Vendas',
  region      TEXT DEFAULT 'Espírito Santo',
  company     TEXT DEFAULT 'Nexus Log',
  avatar      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  contact     TEXT,
  phone       TEXT,
  email       TEXT,
  segment     TEXT,
  city        TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Propostas
CREATE TABLE IF NOT EXISTS proposals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  -- Dados do cliente (snapshot, caso cliente seja deletado)
  client_name TEXT NOT NULL,
  contact     TEXT,
  phone       TEXT,
  email       TEXT,
  -- Equipamento
  model       TEXT NOT NULL,
  cap         TEXT,
  tracao      TEXT,
  altura      TEXT,
  segmento    TEXT,
  obs         TEXT,
  -- Financeiro
  value_equip  NUMERIC(12,2) DEFAULT 0,
  value_frete  NUMERIC(12,2) DEFAULT 0,
  value_treino NUMERIC(12,2) DEFAULT 0,
  value_manut  NUMERIC(12,2) DEFAULT 0,
  value_acess  NUMERIC(12,2) DEFAULT 0,
  desconto     NUMERIC(5,2) DEFAULT 0,
  value_total  NUMERIC(12,2) DEFAULT 0,
  -- Status
  status      TEXT DEFAULT 'Aguardando' CHECK (status IN ('Aguardando','Negociando','Aprovada','Recusada')),
  visits_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Visitas
CREATE TABLE IF NOT EXISTS visits (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  proposal_id  UUID REFERENCES proposals(id) ON DELETE SET NULL,
  client_name  TEXT NOT NULL,
  contact      TEXT,
  visit_date   DATE NOT NULL,
  visit_time   TIME DEFAULT '09:00',
  status       TEXT DEFAULT 'Agendada' CHECK (status IN ('Agendada','Pendente','Realizada')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRIGGERS: atualizar updated_at ───────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proposals_updated BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_visits_updated    BEFORE UPDATE ON visits    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated   BEFORE UPDATE ON clients   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: criar profile automaticamente ao cadastrar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 2))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: atualizar visits_count ao inserir visita
CREATE OR REPLACE FUNCTION increment_visit_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.proposal_id IS NOT NULL THEN
    UPDATE proposals SET visits_count = visits_count + 1 WHERE id = NEW.proposal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_visit_count
  AFTER INSERT ON visits
  FOR EACH ROW EXECUTE FUNCTION increment_visit_count();

-- ── ROW LEVEL SECURITY (RLS) ─────────────────────────────────
-- Cada usuário só vê e edita seus próprios dados

ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits     ENABLE ROW LEVEL SECURITY;

-- Profiles: cada um vê só o próprio
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- Clients
CREATE POLICY "clients_own" ON clients FOR ALL USING (auth.uid() = user_id);

-- Proposals
CREATE POLICY "proposals_own" ON proposals FOR ALL USING (auth.uid() = user_id);

-- Visits
CREATE POLICY "visits_own" ON visits FOR ALL USING (auth.uid() = user_id);

-- ── DADOS INICIAIS DE EXEMPLO ─────────────────────────────────
-- (Opcional — remova em produção)
-- Serão visíveis apenas após o primeiro login e vinculados ao usuário

-- ── VIEWS ÚTEIS ──────────────────────────────────────────────

-- Resumo do pipeline por usuário
CREATE OR REPLACE VIEW pipeline_summary AS
SELECT
  user_id,
  COUNT(*) AS total_proposals,
  SUM(value_total) AS total_value,
  SUM(CASE WHEN status = 'Aprovada'   THEN value_total ELSE 0 END) AS value_approved,
  SUM(CASE WHEN status = 'Negociando' THEN value_total ELSE 0 END) AS value_negotiating,
  SUM(CASE WHEN status = 'Aguardando' THEN value_total ELSE 0 END) AS value_waiting,
  SUM(CASE WHEN status = 'Recusada'   THEN value_total ELSE 0 END) AS value_lost,
  COUNT(CASE WHEN status = 'Aprovada' THEN 1 END) AS count_approved
FROM proposals
GROUP BY user_id;
