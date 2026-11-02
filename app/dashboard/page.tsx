"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import './dashboard.css';

type ModuleItem = {
  title: string;
  description: string;
  icon: string;
  status: 'Available' | 'In development' | 'Restricted';
  href?: string;
  group: 'Vehicle' | 'Insurance' | 'Verification' | 'Workspace';
};

const modules: ModuleItem[] = [
  { title: 'Vehicle details by RC', description: 'Registration-first lookup with verified provider fields.', icon: '🚘', status: 'Available', href: '/', group: 'Vehicle' },
  { title: 'RC search history', description: 'Search records, timestamps and permitted report history.', icon: '🕘', status: 'In development', group: 'Vehicle' },
  { title: 'Insurance details', description: 'Policy insurer and validity data when supplied by an authorized source.', icon: '🛡️', status: 'In development', group: 'Insurance' },
  { title: 'Challan status', description: 'Pending and paid e-challan information through an approved provider.', icon: '🧾', status: 'In development', group: 'Vehicle' },
  { title: 'PDF reports', description: 'Branded, permission-aware vehicle reports for download and sharing.', icon: '📄', status: 'In development', group: 'Workspace' },
  { title: 'Insurance renewal', description: 'Expiry reminders, quote preparation and partner follow-up.', icon: '📅', status: 'In development', group: 'Insurance' },
  { title: 'Driving licence verification', description: 'Consent-based DL validation through an approved data source.', icon: '🪪', status: 'In development', group: 'Verification' },
  { title: 'PAN verification', description: 'Identity verification only through an authorized provider and permitted purpose.', icon: '🔎', status: 'Restricted', group: 'Verification' },
  { title: 'Address verification', description: 'Customer-authorized address verification with an auditable consent record.', icon: '📍', status: 'Restricted', group: 'Verification' },
  { title: 'IRDAI agent verification', description: 'Check agent credentials using an approved verification source.', icon: '👨‍💼', status: 'In development', group: 'Verification' },
  { title: 'Wallet & transactions', description: 'Usage ledger, available credits, recharges and invoices.', icon: '💳', status: 'In development', group: 'Workspace' },
  { title: 'Partner support', description: 'Help requests, provider issues and service status.', icon: '🎧', status: 'In development', group: 'Workspace' },
];

const navGroups = [
  { label: 'WORKSPACE', items: [{ title: 'Overview', icon: '⌂', href: '/dashboard' }, { title: 'Public partner lookup', icon: '↗', href: '/partner' }] },
  { label: 'VEHICLE SERVICES', items: [{ title: 'Vehicle RC lookup', icon: '🚘', href: '/' }, { title: 'RC search history', icon: '◷' }, { title: 'Challan status', icon: '▤' }] },
  { label: 'INSURANCE', items: [{ title: 'Insurance details', icon: '▣' }, { title: 'Renewal workspace', icon: '◷' }, { title: 'PDF reports', icon: '▧' }] },
  { label: 'VERIFICATION', items: [{ title: 'Driving licence', icon: '▣' }, { title: 'PAN verification', icon: '⌕' }, { title: 'Address verification', icon: '⌖' }, { title: 'IRDAI agent check', icon: '✓' }] },
  { label: 'ACCOUNT', items: [{ title: 'Wallet & transactions', icon: '₹' }, { title: 'Support', icon: '?' }] },
];

export default function DashboardPage() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        if (active) setEmail(data.user?.email || '');
      } catch {
        if (active) setEmail('');
      }
    })();
    return () => { active = false; };
  }, []);

  async function signOut() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  function renderModule(item: ModuleItem) {
    const content = (
      <>
        <span className="va-module-icon" aria-hidden="true">{item.icon}</span>
        <span className="va-module-copy">
          <span className="va-module-title">{item.title}</span>
          <span className="va-module-description">{item.description}</span>
        </span>
        <span className={`va-module-status va-status-${item.status.toLowerCase().replaceAll(' ', '-')}`}>{item.status}</span>
      </>
    );
    return item.href ? (
      <Link href={item.href} className="va-module-card" key={item.title}>{content}<span className="va-module-arrow" aria-hidden="true">→</span></Link>
    ) : (
      <article className="va-module-card va-module-disabled" key={item.title}>{content}<span className="va-module-lock" aria-hidden="true">⌑</span></article>
    );
  }

  const groups: Array<ModuleItem['group']> = ['Vehicle', 'Insurance', 'Verification', 'Workspace'];

  return (
    <main className="va-dashboard">
      <button className={`va-sidebar-backdrop ${menuOpen ? 'is-open' : ''}`} aria-label="Close navigation" onClick={() => setMenuOpen(false)} tabIndex={menuOpen ? 0 : -1} />
      <aside className={`va-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <Link href="/dashboard" className="va-brand" onClick={() => setMenuOpen(false)}>
          <span className="va-brand-mark">V</span>
          <span>Vahan <strong>AI</strong><small>PARTNER WORKSPACE</small></span>
        </Link>
        <div className="va-sidebar-scroll">
          {navGroups.map((group) => (
            <section className="va-nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => item.href ? (
                <Link key={item.title} href={item.href} onClick={() => setMenuOpen(false)} className={item.title === 'Overview' ? 'va-nav-link is-active' : 'va-nav-link'}>
                  <span aria-hidden="true">{item.icon}</span>{item.title}
                </Link>
              ) : (
                <span key={item.title} className="va-nav-link va-nav-disabled"><span aria-hidden="true">{item.icon}</span>{item.title}<small>Soon</small></span>
              ))}
            </section>
          ))}
        </div>
        <div className="va-sidebar-bottom">
          <div className="va-user">
            <span className="va-avatar">{(email.trim()[0] || 'P').toUpperCase()}</span>
            <span className="va-user-copy"><strong>Partner account</strong><small title={email}>{email || 'Signed-in partner'}</small></span>
          </div>
          <button className="va-signout" type="button" onClick={signOut}>↪ <span>Sign out</span></button>
        </div>
      </aside>

      <section className="va-main">
        <header className="va-header">
          <button className="va-menu-button" type="button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}>☰</button>
          <div className="va-header-title"><span>Vahan AI</span><small>Partner workspace</small></div>
          <div className="va-header-actions">
            <Link href="/partner" className="va-header-link">Public lookup <span>↗</span></Link>
            <button className="va-profile-button" type="button" onClick={signOut} aria-label="Sign out">{(email.trim()[0] || 'P').toUpperCase()}</button>
          </div>
        </header>

        <div className="va-content">
          <section className="va-welcome">
            <div>
              <p className="va-eyebrow">VEHICLE INTELLIGENCE · INSURANCE WORKSPACE</p>
              <h1>Your partner dashboard</h1>
              <p>Start with an RC lookup, then move into insurance, verification and partner services as each provider integration becomes available.</p>
              <div className="va-welcome-actions">
                <Link href="/" className="va-primary-action">Start RC lookup <span>→</span></Link>
                <Link href="/partner" className="va-secondary-action">Open public beta</Link>
              </div>
            </div>
            <div className="va-welcome-art" aria-hidden="true"><span>V</span><i>AI</i></div>
          </section>

          <section className="va-quick-stats" aria-label="Workspace status">
            <article><span className="va-stat-icon">🚘</span><div><small>Core service</small><strong>RC verification</strong><em className="va-stat-ready">Preview available</em></div></article>
            <article><span className="va-stat-icon">🔐</span><div><small>Access model</small><strong>Partner sign-in</strong><em>Approved accounts only</em></div></article>
            <article><span className="va-stat-icon">🧩</span><div><small>Expansion</small><strong>Provider modules</strong><em>Being integrated in phases</em></div></article>
          </section>

          <div className="va-section-heading">
            <div><p className="va-eyebrow">SERVICES</p><h2>All vehicle services</h2><p>Only connected services are selectable. Planned modules are shown for the roadmap and are not yet active.</p></div>
            <span className="va-section-count">{modules.filter((m) => m.href).length} available</span>
          </div>

          {groups.map((group) => (
            <section className="va-service-group" key={group}>
              <h3>{group === 'Vehicle' ? 'Vehicle & RC' : group === 'Insurance' ? 'Insurance services' : group === 'Verification' ? 'Identity & licence verification' : 'Partner account'}</h3>
              <div className="va-module-grid">{modules.filter((item) => item.group === group).map(renderModule)}</div>
            </section>
          ))}

          <section className="va-data-note">
            <span aria-hidden="true">ⓘ</span>
            <div><strong>Responsible data access</strong><p>Owner name, address, mobile, PAN and other personal information will only be shown where the connected provider, contract, purpose and recorded authorization permit it. Missing fields will never be guessed.</p></div>
          </section>
          <footer className="va-footer">Vahan AI · Secure partner access <span>RC-first workflow</span></footer>
        </div>
      </section>

      <nav className="va-mobile-nav" aria-label="Mobile navigation">
        <Link href="/dashboard" className="is-active"><span>⌂</span>Home</Link>
        <Link href="/"><span>🚘</span>RC lookup</Link>
        <Link href="/partner"><span>↗</span>Public</Link>
        <button type="button" onClick={signOut}><span>⇥</span>Account</button>
      </nav>
    </main>
  );
}
