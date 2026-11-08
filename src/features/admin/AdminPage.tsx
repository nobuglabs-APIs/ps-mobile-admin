import { useEffect, useState, type FormEvent } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import {
  getAdminOverview,
  listAdminCharges,
  listAdminPayments,
  listAdminPlans,
  listAdminUsers,
  listAdminWorkspaces,
  updateAdminPlan,
  updateAdminUser,
  updateAdminWorkspace,
  type AdminOverview,
  type AdminPayment,
  type AdminPlan,
  type AdminUser,
  type AdminWorkspace,
  type Charge,
} from '../../api/psMobile';
import { Feedback, formatDate, formatMoney } from '../../components/feedback/Feedback';

type AdminTab = 'overview' | 'users' | 'workspaces' | 'plans' | 'payments' | 'charges';
const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: 'overview', label: 'Resumo' },
  { id: 'users', label: 'Utilizadores' },
  { id: 'workspaces', label: 'Negócios' },
  { id: 'plans', label: 'Planos' },
  { id: 'payments', label: 'Pagamentos' },
  { id: 'charges', label: 'Cobranças' },
];

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async (activeTab = tab, query = search) => {
    setBusy(true);
    setError('');
    try {
      if (activeTab === 'overview') setOverview(await getAdminOverview());
      if (activeTab === 'users') setUsers((await listAdminUsers(query)).items);
      if (activeTab === 'workspaces') {
        const [workspacePage, availablePlans] = await Promise.all([listAdminWorkspaces(query), listAdminPlans()]);
        setWorkspaces(workspacePage.items);
        setPlans(availablePlans);
      }
      if (activeTab === 'plans') setPlans(await listAdminPlans());
      if (activeTab === 'payments') setPayments((await listAdminPayments()).items);
      if (activeTab === 'charges') setCharges((await listAdminCharges()).items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os dados de administração.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void load('overview'); }, []);

  const changeTab = (next: AdminTab) => {
    setTab(next);
    setSearch('');
    setNotice('');
    void load(next, '');
  };

  const updateUser = async (user: AdminUser, input: Partial<Pick<AdminUser, 'is_active' | 'is_admin'>>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await updateAdminUser(user.id, input);
      setUsers((items) => items.map((item) => item.id === updated.id ? updated : item));
      setNotice('Utilizador atualizado.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o utilizador.');
    } finally {
      setBusy(false);
    }
  };

  const updateWorkspace = async (workspace: AdminWorkspace, input: { is_active?: boolean; trial_days?: number; plan_code?: string; period_days?: number }) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await updateAdminWorkspace(workspace.id, input);
      setWorkspaces((items) => items.map((item) => item.id === updated.id ? updated : item));
      setNotice(`Negócio “${updated.name}” atualizado.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o negócio.');
    } finally {
      setBusy(false);
    }
  };

  const searchItems = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void load(tab, search);
  };

  return (
    <div className="page-stack admin-page">
      <div className="page-heading">
        <div><p className="eyebrow">CONTROLO DA PLATAFORMA</p><h1>Administração</h1><p>Utilizadores, negócios, planos e pagamentos.</p></div>
        <div className="page-heading__action">
          <button aria-label="Atualizar dados" className="icon-button" disabled={busy} onClick={() => void load()} type="button"><RefreshCw size={16} /></button>
        </div>
      </div>
      {error && <Feedback message={error} />}
      {notice && <Feedback kind="success" message={notice} />}
      <nav className="admin-tabs" aria-label="Secções de administração">
        {tabs.map((item) => <button aria-current={tab === item.id ? 'page' : undefined} className={tab === item.id ? 'admin-tab admin-tab--active' : 'admin-tab'} key={item.id} onClick={() => changeTab(item.id)} type="button">{item.label}</button>)}
      </nav>
      {(tab === 'users' || tab === 'workspaces') && (
        <form className="admin-search" onSubmit={searchItems}>
          <input aria-label="Pesquisar" onChange={(event) => setSearch(event.target.value)} placeholder={tab === 'users' ? 'Nome, e-mail ou telefone' : 'Nome do negócio ou proprietário'} value={search} />
          <button className="button button--primary" disabled={busy} type="submit">Pesquisar</button>
        </form>
      )}
      {busy && <div className="loading-panel">A carregar…</div>}
      {tab === 'overview' && overview && <OverviewCards overview={overview} />}
      {tab === 'users' && <UsersTable users={users} busy={busy} onUpdate={updateUser} />}
      {tab === 'workspaces' && <WorkspacesTable workspaces={workspaces} plans={plans} busy={busy} onUpdate={updateWorkspace} />}
      {tab === 'plans' && <PlansList plans={plans} onUpdate={async (plan, input) => {
        setBusy(true);
        setError('');
        setNotice('');
        try {
          const updated = await updateAdminPlan(plan.code, input);
          setPlans((items) => items.map((item) => item.code === updated.code ? updated : item));
          setNotice(`Plano “${updated.name}” atualizado.`);
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o plano.');
        } finally {
          setBusy(false);
        }
      }} />}
      {tab === 'payments' && <PaymentsTable payments={payments} />}
      {tab === 'charges' && <ChargesTable charges={charges} />}
    </div>
  );
}

function OverviewCards({ overview }: { overview: AdminOverview }) {
  const metrics = [
    ['Utilizadores ativos', `${overview.active_users} / ${overview.users}`],
    ['Negócios ativos', `${overview.active_workspaces} / ${overview.workspaces}`],
    ['Subscrições ativas', String(overview.active_subscriptions)],
    ['Vendas · 30 dias', String(overview.sales_30d)],
    ['Receita recebida', formatMoney(overview.revenue_cents)],
    ['Cobranças pendentes', formatMoney(overview.outstanding_cents)],
  ];
  return <div className="admin-metric-grid">{metrics.map(([label, value]) => <article className="surface-card admin-metric" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>;
}

function UsersTable({ users, busy, onUpdate }: { users: AdminUser[]; busy: boolean; onUpdate: (user: AdminUser, input: Partial<Pick<AdminUser, 'is_active' | 'is_admin'>>) => void }) {
  return <section className="surface-card admin-data-card"><h2><ShieldCheck size={18} /> Contas de utilizador</h2><div className="table-scroll"><table className="data-table"><thead><tr><th>Nome / contacto</th><th>Negócios</th><th>Estado</th><th>Permissões</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong className="table-primary">{user.full_name}</strong><small className="table-secondary">{user.email || user.phone || user.id}</small></td><td>{user.workspace_count}</td><td><button className={`status-pill${user.is_active ? ' status-pill--success' : ' status-pill--warning'}`} disabled={busy} onClick={() => onUpdate(user, { is_active: !user.is_active })} type="button">{user.is_active ? 'Ativa' : 'Suspensa'}</button></td><td><button className="button button--subtle button--small" disabled={busy} onClick={() => onUpdate(user, { is_admin: !user.is_admin })} type="button">{user.is_admin ? 'Remover admin' : 'Promover admin'}</button></td></tr>)}</tbody></table>{!users.length && <p className="form-hint">Nenhum utilizador encontrado.</p>}</div></section>;
}

function WorkspacesTable({ workspaces, plans, busy, onUpdate }: { workspaces: AdminWorkspace[]; plans: AdminPlan[]; busy: boolean; onUpdate: (workspace: AdminWorkspace, input: { is_active?: boolean; trial_days?: number; plan_code?: string; period_days?: number }) => void }) {
  return <section className="surface-card admin-data-card"><h2>Negócios e subscrições</h2><div className="admin-entity-list">{workspaces.map((workspace) => <article className="admin-entity" key={workspace.id}><div className="admin-entity__heading"><span><strong>{workspace.name}</strong><small>{workspace.owner_email || workspace.owner_id} · {workspace.member_count} membros</small></span><span className={`status-pill${workspace.is_active ? ' status-pill--success' : ' status-pill--warning'}`}>{workspace.is_active ? 'Ativo' : 'Suspenso'}</span></div><div className="admin-entity__details"><span>Plano: <strong>{workspace.plan_code || 'Sem plano'}</strong></span><span>Subscrição: <strong>{workspace.subscription_status || 'Sem subscrição ativa'}</strong></span><span>Fim do período experimental: <strong>{formatDate(workspace.trial_ends_at)}</strong></span></div><div className="admin-entity__actions"><button className="button button--subtle button--small" disabled={busy} onClick={() => onUpdate(workspace, { is_active: !workspace.is_active })} type="button">{workspace.is_active ? 'Suspender negócio' : 'Reativar negócio'}</button><select aria-label={`Plano para ${workspace.name}`} defaultValue="" disabled={busy} onChange={(event) => { if (event.target.value) onUpdate(workspace, { plan_code: event.target.value, period_days: 30 }); }}><option value="">Atribuir plano…</option>{plans.filter((plan) => plan.is_active).map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}</select></div></article>)}{!workspaces.length && <p className="form-hint">Nenhum negócio encontrado.</p>}</div></section>;
}

function PlansList({ plans, onUpdate }: { plans: AdminPlan[]; onUpdate: (plan: AdminPlan, input: Partial<Pick<AdminPlan, 'name' | 'description' | 'price_cents' | 'usage_percent_bps' | 'is_active' | 'sort_order'>>) => Promise<void> }) {
  return <div className="admin-plan-list">{plans.map((plan) => <PlanEditor key={plan.code} plan={plan} onUpdate={onUpdate} />)}</div>;
}

function PlanEditor({ plan, onUpdate }: { plan: AdminPlan; onUpdate: (plan: AdminPlan, input: Partial<Pick<AdminPlan, 'name' | 'description' | 'price_cents' | 'usage_percent_bps' | 'is_active' | 'sort_order'>>) => Promise<void> }) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description || '');
  const [price, setPrice] = useState((plan.price_cents / 100).toFixed(2));
  const [active, setActive] = useState(plan.is_active);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setName(plan.name);
    setDescription(plan.description || '');
    setPrice((plan.price_cents / 100).toFixed(2));
    setActive(plan.is_active);
  }, [plan]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    void onUpdate(plan, { name: name.trim(), description: description.trim(), price_cents: Math.round(Number(price) * 100), is_active: active })
      .finally(() => setBusy(false));
  };
  return <form className="surface-card admin-plan-card" onSubmit={submit}><div className="admin-plan-card__heading"><span><strong>{plan.name}</strong><small>{plan.code} · {plan.kind}</small></span><label className="check-field"><input checked={active} onChange={(event) => setActive(event.target.checked)} type="checkbox" /> Disponível</label></div><div className="form-grid form-grid--compact"><label className="form-field"><span>Nome apresentado</span><input maxLength={100} minLength={1} required value={name} onChange={(event) => setName(event.target.value)} /></label><label className="form-field"><span>Preço ({plan.currency})</span><input min={0} required step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label className="form-field form-field--wide"><span>Descrição</span><input maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} /></label></div><button className="button button--primary button--small" disabled={busy} type="submit">{busy ? 'A guardar…' : 'Guardar plano'}</button></form>;
}

function PaymentsTable({ payments }: { payments: AdminPayment[] }) {
  return <section className="surface-card admin-data-card"><h2>Pagamentos da plataforma</h2><div className="table-scroll"><table className="data-table"><thead><tr><th>Data</th><th>Negócio</th><th>Provedor</th><th>Valor</th><th>Estado</th><th>Referência</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{formatDate(payment.created_at)}</td><td><small>{payment.workspace_id}</small></td><td>{payment.provider.replaceAll('_', ' ')}</td><td>{formatMoney(payment.amount_cents, payment.currency)}</td><td>{payment.status}</td><td>{payment.provider_ref || '—'}</td></tr>)}</tbody></table>{!payments.length && <p className="form-hint">Ainda não há pagamentos.</p>}</div></section>;
}

function ChargesTable({ charges }: { charges: Charge[] }) {
  return <section className="surface-card admin-data-card"><h2>Cobranças e faturas de subscrição</h2><div className="table-scroll"><table className="data-table"><thead><tr><th>Data</th><th>Negócio</th><th>Descrição</th><th>Valor</th><th>Estado</th><th>Vencimento</th></tr></thead><tbody>{charges.map((charge) => <tr key={charge.id}><td>{formatDate(charge.created_at)}</td><td><small>{charge.workspace_id}</small></td><td>{charge.description}</td><td>{formatMoney(charge.amount_cents, charge.currency)}</td><td>{charge.status}</td><td>{charge.due_at ? formatDate(charge.due_at) : '—'}</td></tr>)}</tbody></table>{!charges.length && <p className="form-hint">Ainda não há cobranças.</p>}</div></section>;
}
