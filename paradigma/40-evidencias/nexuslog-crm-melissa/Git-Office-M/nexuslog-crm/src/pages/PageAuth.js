// src/pages/PageAuth.js
import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function PageAuth() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode]     = useState('login'); // login | signup
  const [form, setForm]     = useState({ name: '', email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        await signIn({ email: form.email, password: form.password });
      } else {
        if (!form.name) { setError('Informe seu nome.'); setLoading(false); return; }
        await signUp({ email: form.email, password: form.password, name: form.name });
        setDone(true);
      }
    } catch (e) {
      const msgs = {
        'Invalid login credentials': 'E-mail ou senha incorretos.',
        'User already registered': 'Este e-mail já está cadastrado.',
        'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
      };
      setError(msgs[e.message] || e.message);
    }
    setLoading(false);
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #0f1117; }
    .auth-wrap {
      min-height: 100vh; display: flex;
      background: linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%);
    }
    .auth-left {
      flex: 1; display: flex; flex-direction: column;
      justify-content: center; padding: 60px;
      border-right: 1px solid rgba(255,255,255,.06);
    }
    .auth-right {
      width: 480px; display: flex; align-items: center;
      justify-content: center; padding: 40px;
    }
    .brand-badge {
      width: 52px; height: 52px; border-radius: 12px;
      background: #C10A25; display: flex; align-items: center;
      justify-content: center; font-family: 'Syne', sans-serif;
      font-size: 18px; font-weight: 800; color: #fff;
      margin-bottom: 32px;
    }
    .brand-title {
      font-family: 'Syne', sans-serif; font-size: 42px;
      font-weight: 800; color: #fff; line-height: 1.1;
      margin-bottom: 16px;
    }
    .brand-sub {
      font-size: 16px; color: rgba(255,255,255,.4);
      line-height: 1.6; max-width: 380px;
    }
    .brand-tag {
      display: inline-block; margin-top: 32px;
      background: rgba(193,10,37,.15); border: 1px solid rgba(193,10,37,.3);
      color: #C10A25; border-radius: 20px; padding: 6px 14px;
      font-size: 12px; font-weight: 600; letter-spacing: 1px;
      text-transform: uppercase;
    }
    .features { margin-top: 48px; display: flex; flex-direction: column; gap: 16px; }
    .feature { display: flex; align-items: center; gap: 12px; }
    .feature-dot { width: 8px; height: 8px; border-radius: 50%; background: #C10A25; flex-shrink: 0; }
    .feature-text { font-size: 14px; color: rgba(255,255,255,.5); }
    .card {
      background: #1a1f2e; border: 1px solid rgba(255,255,255,.08);
      border-radius: 16px; padding: 36px; width: 100%; max-width: 400px;
    }
    .card-title {
      font-family: 'Syne', sans-serif; font-size: 22px;
      font-weight: 800; color: #fff; margin-bottom: 6px;
    }
    .card-sub { font-size: 13px; color: rgba(255,255,255,.35); margin-bottom: 28px; }
    .fgroup { margin-bottom: 16px; }
    .flabel { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 1px; color: rgba(255,255,255,.35); margin-bottom: 6px; }
    .finput {
      width: 100%; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
      border-radius: 8px; padding: 11px 14px; font-size: 14px;
      color: #fff; outline: none; font-family: 'Inter', sans-serif;
      transition: border-color .15s;
    }
    .finput:focus { border-color: #C10A25; }
    .finput::placeholder { color: rgba(255,255,255,.2); }
    .btn {
      width: 100%; padding: 12px; border-radius: 8px; border: none;
      font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all .15s; margin-top: 4px;
    }
    .btn-primary { background: #C10A25; color: #fff; }
    .btn-primary:hover { background: #9b0820; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .error-box {
      background: rgba(220,38,38,.1); border: 1px solid rgba(220,38,38,.3);
      color: #fca5a5; border-radius: 8px; padding: 10px 14px;
      font-size: 13px; margin-bottom: 16px;
    }
    .success-box {
      background: rgba(22,163,74,.1); border: 1px solid rgba(22,163,74,.3);
      color: #86efac; border-radius: 8px; padding: 14px;
      font-size: 13px; text-align: center; line-height: 1.6;
    }
    .toggle {
      text-align: center; margin-top: 20px;
      font-size: 13px; color: rgba(255,255,255,.35);
    }
    .toggle button {
      background: none; border: none; color: #C10A25;
      font-weight: 600; cursor: pointer; font-size: 13px;
      font-family: 'Inter', sans-serif; padding: 0; margin-left: 4px;
    }
    .divider {
      height: 1px; background: rgba(255,255,255,.06); margin: 20px 0;
    }
    @media (max-width: 768px) {
      .auth-left { display: none; }
      .auth-right { width: 100%; }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="auth-wrap">
        {/* Left panel */}
        <div className="auth-left">
          <div className="brand-badge">NX</div>
          <div className="brand-title">Nexus Log<br />CRM de Vendas</div>
          <div className="brand-sub">
            Gerencie propostas, orçamentos e visitas comerciais das empilhadeiras HELI em um só lugar.
          </div>
          <span className="brand-tag">Representante Oficial HELI · ES</span>
          <div className="features">
            {["Propostas com catálogo HELI completo","Entrada de dados por voz","Orçamento com cálculo automático","Agenda de visitas a clientes","Dashboard de pipeline em tempo real"].map(f => (
              <div key={f} className="feature">
                <div className="feature-dot" />
                <span className="feature-text">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="auth-right">
          <div className="card">
            {done ? (
              <div className="success-box">
                ✅ Cadastro realizado!<br /><br />
                Verifique seu e-mail <strong>{form.email}</strong> e clique no link de confirmação para ativar sua conta.
              </div>
            ) : (
              <>
                <div className="card-title">
                  {mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
                </div>
                <div className="card-sub">
                  {mode === 'login' ? 'Acesse o CRM Nexus Log' : 'Comece a usar gratuitamente'}
                </div>

                {error && <div className="error-box">⚠ {error}</div>}

                {mode === 'signup' && (
                  <div className="fgroup">
                    <label className="flabel">Seu Nome</label>
                    <input className="finput" placeholder="João Fonseca" value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                )}

                <div className="fgroup">
                  <label className="flabel">E-mail</label>
                  <input className="finput" type="email" placeholder="joao@nexuslog.com.br" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>

                <div className="fgroup">
                  <label className="flabel">Senha</label>
                  <input className="finput" type="password" placeholder="Mínimo 6 caracteres" value={form.password}
                    onChange={e => set('password', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                </div>

                <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !form.email || !form.password}>
                  {loading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
                </button>

                <div className="divider" />

                <div className="toggle">
                  {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}
                  <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
                    {mode === 'login' ? 'Criar agora' : 'Fazer login'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
