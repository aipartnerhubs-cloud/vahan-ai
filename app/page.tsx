"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm);
  const [result, setResult] = useState<VehicleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignOut() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace('/login');
      router.refresh();
    } catch {
      setError('Unable to sign out. Please reload the page and try again.');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/rc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to verify RC details.');
      }

      setResult(data.result);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            border: '1px solid #d0d5dd',
            borderRadius: 10,
            padding: '10px 16px',
            background: '#ffffff',
            color: '#344054',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
      <div className="hero-card">
        <div className="hero-copy">
          <span className="eyebrow">RC-first vehicle verification</span>
          <h1>Vahan AI</h1>
          <p>
            Verify a vehicle record, inspect ownership and RC status, and surface a confidence score
            before downstream approvals or checks.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="verification-form">
          <label>
            Registration Number
            <input
              value={form.registrationNumber}
              onChange={(e) => setForm((current) => ({ ...current, registrationNumber: e.target.value }))}
              placeholder="e.g. MH12AB1234"
            />
          </label>

          <label>
            Chassis Number
            <input
              value={form.chassisNumber}
              onChange={(e) => setForm((current) => ({ ...current, chassisNumber: e.target.value }))}
              placeholder="e.g. ABCD1234567890"
            />
          </label>

          <label>
            Engine Number
            <input
              value={form.engineNumber}
              onChange={(e) => setForm((current) => ({ ...current, engineNumber: e.target.value }))}
              placeholder="e.g. XYZ987654321"
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify RC'}
          </button>
        </form>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      {result ? (
        <section className="result-card">
          <div className="title-row">
            <div>
              <p className="label">Status</p>
              <h2>{result.status}</h2>
            </div>
            <div className="score-badge">{result.verificationScore}/100</div>
          </div>

          <div className="stats-grid">
            <div>
              <p className="label">Registration</p>
              <strong>{result.registrationNumber}</strong>
            </div>
            <div>
              <p className="label">Owner</p>
              <strong>{result.ownerName}</strong>
            </div>
            <div>
              <p className="label">Vehicle</p>
              <strong>{result.make} {result.model}</strong>
            </div>
            <div>
              <p className="label">Fuel</p>
              <strong>{result.fuelType}</strong>
            </div>
            <div>
              <p className="label">Registration Date</p>
              <strong>{result.registrationDate}</strong>
            </div>
            <div>
              <p className="label">Insurance</p>
              <strong>{result.insuranceStatus}</strong>
            </div>
            <div>
              <p className="label">Fitness</p>
              <strong>{result.fitnessStatus}</strong>
            </div>
            <div>
              <p className="label">Source</p>
              <strong>{result.source}</strong>
            </div>
          </div>

          {result.warnings && result.warnings.length > 0 ? (
            <div className="warnings">
              <p className="label">Warnings</p>
              <ul>
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
