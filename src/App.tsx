import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, KeyRound, LoaderCircle, LogOut, ShieldCheck } from 'lucide-react';
import {
  clearTokens,
  isLoginChallenge,
  readAccessToken,
  readRefreshTokenForLogout,
  saveTokens,
  SessionChallengeRequiredError,
  type LoginChallenge,
  type TokenResponse,
} from './api/client';
import { getMe, login, logout, verifyLogin, type UserProfile } from './api/psMobile';
import { Feedback } from './components/feedback/Feedback';
import { AdminPage } from './features/admin/AdminPage';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const [loading, setLoading] = useState(Boolean(readAccessToken()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProfile = useCallback(async () => {
    const user = await getMe();
    if (!user.is_admin) {
      clearTokens();
      setProfile(null);
      throw new Error('Esta conta não tem permissões de administração da plataforma.');
    }
    setProfile(user);
  }, []);

  useEffect(() => {
    const onChallenge = (event: Event) => {
      const challengeEvent = event as CustomEvent<LoginChallenge>;
      setChallenge(challengeEvent.detail);
      setProfile(null);
      setLoading(false);
    };
    window.addEventListener('ps-mobile:auth-challenge', onChallenge);
    return () => window.removeEventListener('ps-mobile:auth-challenge', onChallenge);
  }, []);

  useEffect(() => {
    if (!readAccessToken()) {
      setLoading(false);
      return;
    }
    loadProfile()
      .catch((reason: unknown) => {
        clearTokens();
        setError(reason instanceof Error ? reason.message : 'A sessão expirou. Inicie sessão novamente.');
      })
      .finally(() => setLoading(false));
  }, [loadProfile]);

  const authenticated = async (tokens: TokenResponse) => {
    saveTokens(tokens);
    setChallenge(null);
    setError('');
    setNotice('');
    setLoading(true);
    try {
      await loadProfile();
    } catch (reason) {
      clearTokens();
      setError(reason instanceof Error ? reason.message : 'Não foi possível validar as permissões desta conta.');
    } finally {
      setLoading(false);
    }
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await login(
        String(form.get('email') || '').trim(),
        String(form.get('password') || ''),
      );
      if (isLoginChallenge(result)) {
        setChallenge(result);
        setNotice(`Código enviado por ${result.channel === 'email' ? 'e-mail' : 'SMS'}.`);
        return;
      }
      await authenticated(result);
    } catch (reason) {
      if (reason instanceof SessionChallengeRequiredError) {
        setChallenge(reason.challenge);
        setNotice(`Código enviado por ${reason.challenge.channel === 'email' ? 'e-mail' : 'SMS'}.`);
      } else {
        setError(reason instanceof Error ? reason.message : 'Não foi possível iniciar sessão.');
      }
    } finally {
      setBusy(false);
    }
  };

  const submitChallenge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!challenge) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const tokens = await verifyLogin(challenge.challenge_id, String(form.get('code') || '').trim());
      await authenticated(tokens);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível validar o código.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    setError('');
    const refreshToken = readRefreshTokenForLogout();
    try {
      if (refreshToken) await logout(refreshToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível terminar a sessão no servidor.');
    } finally {
      clearTokens();
      setProfile(null);
      setChallenge(null);
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="app-loading" role="status">
        <LoaderCircle className="spin" size={22} /> A validar sessão…
      </main>
    );
  }

  if (!profile || !readAccessToken()) {
    return (
      <main className="auth-page admin-auth-page">
        <section className="auth-visual" aria-label="Administração PS-Mobile">
          <a className="brand brand--light" href="/">
            <img alt="" className="brand__mark brand__mark--image" src="/brand/ps-mobile.webp" />
            <span className="brand__text"><strong>PS-Mobile</strong><small>Administração</small></span>
          </a>
          <div className="auth-visual__content">
            <span className="auth-kicker"><ShieldCheck size={15} /> ACESSO RESTRITO</span>
            <h1>Controlo da<br />plataforma.</h1>
            <p>Gestão administrativa, utilizadores, negócios e faturação da plataforma PS-Mobile.</p>
            <div className="auth-proof">
              <span className="auth-proof__icon"><ShieldCheck size={20} /></span>
              <span><strong>Acesso de administrador</strong><small>Permissões validadas pelo servidor em cada pedido</small></span>
            </div>
          </div>
          <p className="auth-visual__footer">PS-Mobile · Administração da plataforma</p>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-wrap">
            <div className="auth-mobile-brand">
              <img alt="" className="brand__mark brand__mark--image" src="/brand/ps-mobile.webp" />
              <strong>PS-Mobile Admin</strong>
            </div>
            {challenge ? (
              <>
                <button className="back-link" onClick={() => setChallenge(null)} type="button">Voltar ao acesso</button>
                <span className="auth-icon"><KeyRound size={23} /></span>
                <p className="eyebrow">VERIFICAÇÃO DE SEGURANÇA</p>
                <h2>Confirme a sua identidade</h2>
                <p className="auth-description">Introduza o código enviado por {challenge.channel === 'email' ? 'e-mail' : 'SMS'}.</p>
                {challenge.debug_code && <p className="debug-code">Código de teste: {challenge.debug_code}</p>}
                <form className="auth-form" onSubmit={(event) => void submitChallenge(event)}>
                  <label htmlFor="admin-code">Código de segurança</label>
                  <input autoComplete="one-time-code" autoFocus id="admin-code" inputMode="numeric" maxLength={6} name="code" pattern="[0-9]{6}" required />
                  {error && <Feedback message={error} />}
                  <button className="button button--primary" disabled={busy} type="submit">
                    {busy ? 'A verificar…' : 'Confirmar código'} <ArrowRight size={17} />
                  </button>
                </form>
              </>
            ) : (
              <>
                <span className="auth-icon"><ShieldCheck size={23} /></span>
                <p className="eyebrow">ÁREA DE ADMINISTRAÇÃO</p>
                <h2>Inicie sessão</h2>
                <p className="auth-description">Acesso reservado a administradores da plataforma.</p>
                {error && <Feedback message={error} />}
                {notice && <Feedback kind="success" message={notice} />}
                <form className="auth-form" onSubmit={(event) => void submitLogin(event)}>
                  <label htmlFor="admin-email">E-mail</label>
                  <input autoComplete="username" id="admin-email" name="email" required type="email" />
                  <label htmlFor="admin-password">Palavra-passe</label>
                  <input autoComplete="current-password" id="admin-password" name="password" required type="password" />
                  <button className="button button--primary" disabled={busy} type="submit">
                    {busy ? 'A entrar…' : 'Entrar'} <ArrowRight size={17} />
                  </button>
                </form>
              </>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell admin-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="PS-Mobile Administração">
          <img alt="" className="brand__mark brand__mark--image" src="/brand/ps-mobile.webp" />
          <span className="brand__text"><strong>PS-Mobile</strong><small>Administração</small></span>
        </a>
        <div className="workspace-picker">
          <label>Área protegida</label>
          <span className="admin-scope"><ShieldCheck size={16} /> Plataforma</span>
        </div>
        <div className="sidebar-bottom">
          <div className="account-card">
            <span className="account-avatar">{profile.full_name.slice(0, 1).toLocaleUpperCase()}</span>
            <span className="account-details">
              <strong>{profile.full_name}</strong>
              <small>{profile.email || 'Administrador'}</small>
            </span>
            <ShieldCheck size={17} aria-label="Administrador verificado" />
          </div>
          <button className="nav-link nav-link--logout" disabled={busy} onClick={() => void signOut()} type="button">
            <LogOut size={18} /><span>Terminar sessão</span>
          </button>
        </div>
      </aside>
      <main className="main-panel admin-main-panel">
        <div className="admin-mobile-header">
          <span><ShieldCheck size={17} /> PS-Mobile Admin</span>
          <button className="icon-button" disabled={busy} onClick={() => void signOut()} type="button" aria-label="Terminar sessão">
            <LogOut size={17} />
          </button>
        </div>
        {error && <div className="global-feedback"><Feedback message={error} /></div>}
        <AdminPage />
        <footer className="app-attribution">
          <img className="brand-attribution__logo" src="/brand/nobuglabs-logo.webp" alt="Nobug Labs" />
        </footer>
      </main>
    </div>
  );
}
