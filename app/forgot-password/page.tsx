"use client";

import { FormEvent, useState } from 'react';
import Link from 'next/link';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!configured) {
      setError('Authentication is not configured. Contact your Vahan AI administrator.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = new URL(
        '/auth/callback?next=/reset-password',
        window.location.origin
      ).toString();

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo }
      );

      if (resetError) {
        setError('We could not send the recovery email. Please check the address and try again later.');
        return;
      }

      setNotice(
        'If this address has an account, a password recovery email has been sent. Check your inbox and spam folder, then open the newest message.'
      );
    } catch {
      setError('Password recovery is temporarily unavailable. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <Link className="brand login-brand" href="/login">
        <span className="brand-mark">V</span><span>Vahan <strong>AI</strong></span>
      </Link>
      <section className="login-card">
        <div className="login-symbol">V</div>
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1>Reset your password</h1>
        <p className="login-copy">
          Enter your registered work email. We will send a secure password recovery link if an account exists.
        </p>

        {!configured ? (
          <div className="alert error" role="alert">
            Supabase setup is required. Ask the administrator to complete the hosting configuration.
          </div>
        ) : null}

        <form onSubmit={submit} className="login-form">
          <label htmlFor="email">Work email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={!configured || loading}
            placeholder="name@company.com"
          />
          {error ? <div className="alert error" role="alert">{error}</div> : null}
          {notice ? <div className="alert info" role="status">{notice}</div> : null}
          <button className="button button-primary" disabled={!configured || loading} type="submit">
            {loading ? 'Sending recovery email…' : 'Send recovery link'} <span aria-hidden="true">→</span>
          </button>
        </form>
        <p className="login-footnote">
          <Link href="/login" className="text-link">Back to sign in</Link>
        </p>
      </section>
      <p className="login-bottom">Vahan AI · Secure account recovery</p>
    </main>
  );
}
