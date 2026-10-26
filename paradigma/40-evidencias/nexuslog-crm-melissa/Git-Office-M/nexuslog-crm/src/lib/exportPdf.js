// src/lib/exportPdf.js
// ============================================================
// Geração de PDF da proposta via impressão do navegador
// Funciona sem dependências externas.
// Para PDF mais avançado, integrar com Puppeteer no backend.
// ============================================================

export function exportProposalPdf(proposal) {
  const fmtBRL = v =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
  const fmtDate = d =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const subtotal =
    Number(proposal.value_equip  || 0) +
    Number(proposal.value_frete  || 0) +
    Number(proposal.value_treino || 0) +
    Number(proposal.value_manut  || 0) +
    Number(proposal.value_acess  || 0);

  const desconto = subtotal * (Number(proposal.desconto || 0) / 100);
  const total    = proposal.value_total || subtotal - desconto;

  const rows = [
    ['Equipamento HELI', proposal.model, Number(proposal.value_equip || 0)],
    ['Frete / Entrega',  'Espírito Santo', Number(proposal.value_frete  || 0)],
    ['Treinamento Operacional', 'NR12 incluso', Number(proposal.value_treino || 0)],
    ['Contrato de Manutenção', '12 meses',  Number(proposal.value_manut  || 0)],
    ['Acessórios / Implementos', '',        Number(proposal.value_acess  || 0)],
  ].filter(([, , v]) => v > 0);

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Proposta Nexus Log — ${proposal.client_name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; color: #111; background: #fff; padding: 40px 48px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 3px solid #C10A25; margin-bottom: 28px; }
    .brand-name { font-size: 22px; font-weight: 700; color: #111; }
    .brand-sub  { font-size: 11px; color: #C10A25; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 3px; }
    .brand-contact { text-align: right; font-size: 11px; color: #6b7280; line-height: 1.8; }
    .proposal-title { font-size: 20px; font-weight: 700; color: #111; margin-bottom: 4px; }
    .proposal-num   { font-size: 12px; color: #6b7280; margin-bottom: 24px; }
    .section-title  { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f3f4f6; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .info-item .label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 3px; }
    .info-item .val   { font-size: 13px; font-weight: 600; color: #111; }
    .info-item .val.red { color: #C10A25; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    th { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    td { padding: 10px 12px; font-size: 13px; color: #374151; border-bottom: 1px solid #f9fafb; }
    .td-right { text-align: right; font-weight: 600; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #f9fafb; border-radius: 8px; margin-bottom: 28px; }
    .total-label { font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .total-value { font-size: 28px; font-weight: 700; color: #C10A25; }
    .conditions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 28px; }
    .cond-box { background: #f9fafb; border-radius: 8px; padding: 12px 14px; }
    .cond-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 4px; }
    .cond-val   { font-size: 13px; font-weight: 600; color: #111; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; color: #9ca3af; font-size: 11px; }
    .signature { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sig-line  { border-top: 1px solid #d1d5db; padding-top: 8px; font-size: 11px; color: #6b7280; text-align: center; }
    @media print {
      body { padding: 0; }
      @page { margin: 24mm 20mm; size: A4; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="brand-name">Nexus Log</div>
      <div class="brand-sub">Representante Oficial HELI · ES</div>
    </div>
    <div class="brand-contact">
      nexuslogin.com.br<br/>
      Espírito Santo, Brasil<br/>
      ${fmtDate(proposal.created_at || new Date())}
    </div>
  </div>

  <div class="proposal-title">Proposta Comercial</div>
  <div class="proposal-num">Ref. #${String(proposal.id).slice(-8).toUpperCase()} · Validade: 15 dias</div>

  <div class="section-title">Dados do Cliente</div>
  <div class="info-grid">
    <div class="info-item"><div class="label">Empresa</div><div class="val">${proposal.client_name}</div></div>
    <div class="info-item"><div class="label">Contato</div><div class="val">${proposal.contact || '—'}</div></div>
    <div class="info-item"><div class="label">Telefone</div><div class="val">${proposal.phone || '—'}</div></div>
    <div class="info-item"><div class="label">Segmento</div><div class="val">${proposal.segmento || '—'}</div></div>
    <div class="info-item"><div class="label">E-mail</div><div class="val">${proposal.email || '—'}</div></div>
  </div>

  <div class="section-title">Equipamento HELI</div>
  <div class="info-grid">
    <div class="info-item"><div class="label">Modelo</div><div class="val red">${proposal.model}</div></div>
    <div class="info-item"><div class="label">Capacidade</div><div class="val">${proposal.cap || '—'}</div></div>
    <div class="info-item"><div class="label">Tração</div><div class="val">${proposal.tracao || '—'}</div></div>
    <div class="info-item"><div class="label">Altura de Elevação</div><div class="val">${proposal.altura || '—'}</div></div>
    ${proposal.obs ? `<div class="info-item" style="grid-column:1/-1"><div class="label">Observações</div><div class="val">${proposal.obs}</div></div>` : ''}
  </div>

  <div class="section-title">Composição do Orçamento</div>
  <table>
    <thead>
      <tr><th>Item</th><th>Descrição</th><th style="text-align:right">Valor</th></tr>
    </thead>
    <tbody>
      ${rows.map(([item, desc, val]) => `
        <tr>
          <td>${item}</td>
          <td style="color:#9ca3af">${desc}</td>
          <td class="td-right">${fmtBRL(val)}</td>
        </tr>
      `).join('')}
      ${desconto > 0 ? `
        <tr>
          <td style="color:#16a34a">Desconto</td>
          <td style="color:#16a34a">${proposal.desconto}%</td>
          <td class="td-right" style="color:#16a34a">−${fmtBRL(desconto)}</td>
        </tr>
      ` : ''}
    </tbody>
  </table>

  <div class="total-row">
    <div>
      <div class="total-label">Valor Total da Proposta</div>
      <div class="total-value">${fmtBRL(total)}</div>
    </div>
    <div style="text-align:right;font-size:12px;color:#6b7280">
      <div>Validade: 15 dias corridos</div>
      <div style="margin-top:4px">Condições de pagamento: 30/60/90</div>
    </div>
  </div>

  <div class="conditions">
    <div class="cond-box">
      <div class="cond-label">Garantia do Equipamento</div>
      <div class="cond-val">12 meses — fábrica HELI</div>
    </div>
    <div class="cond-box">
      <div class="cond-label">Prazo de Entrega</div>
      <div class="cond-val">A confirmar após pedido</div>
    </div>
    <div class="cond-box">
      <div class="cond-label">Suporte Técnico</div>
      <div class="cond-val">Nexus Log — Espírito Santo</div>
    </div>
    <div class="cond-box">
      <div class="cond-label">Validade da Proposta</div>
      <div class="cond-val">15 dias corridos</div>
    </div>
  </div>

  <div class="signature">
    <div class="sig-line">Nexus Log — Representante Comercial</div>
    <div class="sig-line">${proposal.client_name} — Responsável pela Aprovação</div>
  </div>

  <div class="footer">
    <span>Nexus Log · Representante Oficial HELI · Espírito Santo · nexuslogin.com.br</span>
    <span>Gerado em ${fmtDate(new Date())}</span>
  </div>

</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}
