"use client";

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('setup') === 'missing') {
      setNotice('Setup is incomplete. An administrator must configure Supabase and the approved-agent allowlist in the hosting environment.');
    } else if (params.get('access') === 'denied') {
      setNotice('This account is not approved to access Vahan AI. Contact your administrator.');
    } else if (params.get('authError') === 'recovery-link-invalid') {
      setNotice('That recovery link is invalid or has expired. Request a new password recovery email.');
    } else if (params.get('password') === 'updated') {
      setNotice('Your password has been updated. Sign in with your new password.');
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!configured) {
      setError('Authentication is not configured yet. Ask the administrator to complete deployment setup.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError('Sign-in failed. Check your credentials or contact your administrator.');
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Sign-in is temporarily unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <Link className="brand login-brand" href="/">
        <span className="brand-mark">V</span><span>Vahan <strong>AI</strong></span>
      </Link>
      <section className="login-card">
        <div className="login-symbol">V</div>
        <p className="eyebrow">AUTHORIZED ACCESS</p>
        <h1>Welcome back</h1>
        <p className="login-copy">Sign in with an account created by your Vahan AI administrator.</p>

        {notice ? <div className="alert info" role="status">{notice}</div> : null}
        {!configured ? (
          <div className="alert error" role="alert">
            Supabase setup is required. Add the project URL and public publishable key in the hosting environment.
          </div>
        ) : null}

        <form onSubmit={submit} className="login-form">
          <label htmlFor="email">Work email</label>
          <input id="email" type="email" autoComplete="username" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} disabled={!configured || loading} placeholder="name@company.com" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={!configured || loading} placeholder="Enter password" />
          {error ? <div className="alert error" role="alert">{error}</div> : null}
          <button className="button button-primary" disabled={!configured || loading} type="submit">
            {loading ? 'Signing in…' : 'Sign in securely'} <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="login-footnote">
          <Link href="/forgot-password" className="text-link">Forgot your password?</Link>
        </p>
        <p className="login-footnote">Public self-registration is disabled. Access is provisioned by an administrator.</p>
      </section>
      <p className="login-bottom">Vahan AI · Secure vehicle verification</p>
    </main>
  );
}
