"use client";

import { FormEvent, useEffect, useState } from 'react';

const defaultForm = {
  registrationNumber: '',
  chassisNumber: '',
  engineNumber: '',
};

type VehicleResult = {
  registrationNumber: string;
  status: string;
  ownerName: string;
  make: string;
  model: string;
  fuelType: string;
  registrationDate: string;
  insuranceStatus: string;
  fitnessStatus: string;
  verificationScore: number;
  source: string;
  warnings?: string[];
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function HomePage() {
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState<VehicleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installMessage, setInstallMessage] = useState('');

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          // PWA installation remains available even if service-worker registration is blocked.
        });
      });
    }
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setInstallPrompt(null);
      setInstallMessage('Vahan AI has been added to your home screen.');
    });
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  async function installApp() {
    if (!installPrompt) {
      setInstallMessage('On Android Chrome, tap ⋮ and choose “Install app” or “Add to Home screen”.');
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallMessage(choice.outcome === 'accepted' ? 'Installation accepted.' : 'Installation was cancelled.');
    setInstallPrompt(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    const registrationNumber = form.registrationNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/.test(registrationNumber)) {
      setError('Enter a valid Indian vehicle registration number, for example MH12AB1234.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/rc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationNumber,
          chassisNumber: form.chassisNumber.trim(),
          engineNumber: form.engineNumber.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to verify RC details. Please try again.');
      if (!data.result) throw new Error('Provider returned no vehicle record. Check the number or Sandbox access.');
      setResult(data.result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Vehicle verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const shareText = encodeURIComponent('Please test Vahan AI vehicle RC verification on your mobile: ' + (typeof window !== 'undefined' ? window.location.origin : ''));
  const shareUrl = 'https://wa.me/?text=' + shareText;

  return (
    <main className="page-shell">
      <header className="app-toolbar">
        <div className="brand-mark" aria-hidden="true">V</div>
        <div className="toolbar-copy"><strong>Vahan AI</strong><span>Vehicle verification for partners</span></div>
        <button className="secondary-button install-button" type="button" onClick={installApp}>＋ Install app</button>
      </header>
      {installMessage ? <div className="install-note" role="status">{installMessage}</div> : null}
      <div className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">RC-first vehicle verification</span>
          <h1>Vahan AI</h1>
          <p>Look up a vehicle using its registration number first. Verified provider data can then support your insurance workflow.</p>
          <div className="trust-points"><span>● Server-side provider access</span><span>● No sample RC pre-filled</span></div>
          <a className="whatsapp-share" href={shareUrl} target="_blank" rel="noreferrer">Share with partners on WhatsApp ↗</a>
        </div>
        <form onSubmit={handleSubmit} className="verification-form">
          <label>
            Registration Number <span className="required">*</span>
            <input
              value={form.registrationNumber}
              onChange={(e) => setForm((current) => ({ ...current, registrationNumber: e.target.value.toUpperCase() }))}
              placeholder="e.g. MH12AB1234"
              autoCapitalize="characters"
              autoComplete="off"
              required
              maxLength={15}
            />
          </label>
          <label>
            Chassis Number <span className="optional">(optional)</span>
            <input value={form.chassisNumber} onChange={(e) => setForm((current) => ({ ...current, chassisNumber: e.target.value.toUpperCase() }))} placeholder="Enter only if required" autoComplete="off" />
          </label>
          <label>
            Engine Number <span className="optional">(optional)</span>
            <input value={form.engineNumber} onChange={(e) => setForm((current) => ({ ...current, engineNumber: e.target.value.toUpperCase() }))} placeholder="Enter only if required" autoComplete="off" />
          </label>
          <button type="submit" disabled={loading}>{loading ? 'Verifying vehicle…' : 'Verify vehicle  →'}</button>
          <p className="privacy-note">Use vehicle and owner information only for an authorized, lawful purpose.</p>
        </form>
      </div>

      {error ? <div className="alert error" role="alert">{error}</div> : null}

      {result ? (
        <section className="result-card" aria-live="polite">
          <div className="title-row">
            <div><p className="label">Provider status</p><h2>{result.status || 'Record returned'}</h2><strong className="registration-chip">{result.registrationNumber}</strong></div>
            <div className="score-badge">{Number.isFinite(result.verificationScore) ? result.verificationScore + '/100' : 'Verified response'}</div>
          </div>
          <div className="stats-grid">
            <div><p className="label">Registered owner</p><strong>{result.ownerName || 'Not supplied'}</strong></div>
            <div><p className="label">Make and model</p><strong>{[result.make, result.model].filter(Boolean).join(' ') || 'Not supplied'}</strong></div>
            <div><p className="label">Fuel type</p><strong>{result.fuelType || 'Not supplied'}</strong></div>
            <div><p className="label">Registration date</p><strong>{result.registrationDate || 'Not supplied'}</strong></div>
            <div><p className="label">Insurance status</p><strong>{result.insuranceStatus || 'Not supplied by provider'}</strong></div>
            <div><p className="label">Fitness status</p><strong>{result.fitnessStatus || 'Not supplied'}</strong></div>
            <div><p className="label">Data source</p><strong>{result.source || 'Configured provider'}</strong></div>
          </div>
          {result.warnings?.length ? <div className="warnings"><p className="label">Notes</p><ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
        </section>
      ) : (
        <section className="empty-state"><div className="empty-icon">✓</div><h2>Vehicle details appear here</h2><p>Enter a registration number to request a record from the configured provider. No sample vehicle is pre-filled.</p></section>
      )}
      <footer className="app-footer"><span>Vahan AI · Partner testing version</span><span>Secure access · Provider-returned data only</span></footer>
    </main>
  );
}
