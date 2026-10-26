// src/hooks/useData.js
// ============================================================
// Todos os acessos ao banco passam por aqui.
// Substitui os arrays mock do protótipo por dados reais.
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

// ── PROPOSTAS ────────────────────────────────────────────────
export function useProposals() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    else setProposals(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form) => {
    const total = calcTotal(form);
    const { data, error } = await supabase
      .from('proposals')
      .insert([{
        user_id:      user.id,
        client_name:  form.client,
        contact:      form.contact,
        phone:        form.phone,
        email:        form.email,
        model:        form.model,
        cap:          form.cap,
        tracao:       form.tracao,
        altura:       form.altura,
        segmento:     form.segmento,
        obs:          form.obs,
        value_equip:  form.value || 0,
        value_frete:  form.frete || 0,
        value_treino: form.treinamento || 0,
        value_manut:  form.manutencao || 0,
        value_acess:  form.acessorios || 0,
        desconto:     form.desconto || 0,
        value_total:  total,
        status:       'Aguardando',
      }])
      .select()
      .single();
    if (error) throw error;
    setProposals(ps => [data, ...ps]);
    return data;
  };

  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('proposals')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    setProposals(ps => ps.map(p => p.id === id ? { ...p, status } : p));
  };

  const remove = async (id) => {
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id);
    if (error) throw error;
    setProposals(ps => ps.filter(p => p.id !== id));
  };

  return { proposals, loading, error, create, updateStatus, remove, refetch: fetch };
}

// ── VISITAS ──────────────────────────────────────────────────
export function useVisits() {
  const { user } = useAuth();
  const [visits, setVisits]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('visits')
      .select('*')
      .eq('user_id', user.id)
      .order('visit_date', { ascending: true });
    setVisits(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (form) => {
    const { data, error } = await supabase
      .from('visits')
      .insert([{
        user_id:     user.id,
        proposal_id: form.proposal_id || null,
        client_name: form.client,
        contact:     form.contact,
        visit_date:  form.date,
        visit_time:  form.time,
        status:      'Agendada',
        notes:       form.notes,
      }])
      .select()
      .single();
    if (error) throw error;
    setVisits(vs => [...vs, data].sort((a, b) => a.visit_date.localeCompare(b.visit_date)));
    return data;
  };

  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('visits')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    setVisits(vs => vs.map(v => v.id === id ? { ...v, status } : v));
  };

  return { visits, loading, create, updateStatus, refetch: fetch };
}

// ── PIPELINE SUMMARY ─────────────────────────────────────────
export function usePipeline(proposals) {
  const total    = proposals.reduce((s, p) => s + Number(p.value_total || 0), 0);
  const approved = proposals.filter(p => p.status === 'Aprovada');
  const negotiating = proposals.filter(p => p.status === 'Negociando');

  const byStatus = {};
  ['Aprovada','Negociando','Aguardando','Recusada'].forEach(s => {
    byStatus[s] = proposals
      .filter(p => p.status === s)
      .reduce((a, p) => a + Number(p.value_total || 0), 0);
  });

  return { total, approved, negotiating, byStatus };
}

// ── HELPERS ──────────────────────────────────────────────────
function calcTotal(form) {
  const subtotal = (form.value||0) + (form.frete||0) + (form.treinamento||0) + (form.manutencao||0) + (form.acessorios||0);
  return subtotal - subtotal * ((form.desconto||0) / 100);
}
