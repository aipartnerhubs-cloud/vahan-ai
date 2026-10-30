"use client";

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkRecoverySession() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (!active) return;

        if (sessionError || !data.session) {
          setError('This recovery link is invalid or has expired. Request a new password recovery email.');
          return;
        }

        setReady(true);
      } catch {
        if (active) setError('Could not verify the recovery session. Request a new recovery email.');
      }
    }

    void checkRecoverySession();
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (password.length < 12) {
      setError('Use a password with at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError('Password could not be updated. Request a fresh recovery email and try again.');
        return;
      }

      await supabase.auth.signOut();
      setPassword('');
      setConfirmPassword('');
      setNotice('Your password has been updated. You can now sign in with your new password.');
    } catch {
      setError('Password update is temporarily unavailable. Please try again.');
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
        <p className="eyebrow">SECURE ACCOUNT SETUP</p>
        <h1>Choose a new password</h1>
        <p className="login-copy">Set a new password for your Vahan AI account. Use at least 12 characters.</p>

        {error ? <div className="alert error" role="alert">{error}</div> : null}
        {notice ? <div className="alert info" role="status">{notice}</div> : null}

        {ready && !notice ? (
          <form onSubmit={submit} className="login-form">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
            />
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={loading}
            />
            <button className="button button-primary" type="submit" disabled={loading}>
              {loading ? 'Updating password…' : 'Update password'} <span aria-hidden="true">→</span>
            </button>
          </form>
        ) : null}

        {notice ? (
          <p className="login-footnote"><Link href="/login" className="text-link">Go to sign in</Link></p>
        ) : null}
      </section>
      <p className="login-bottom">Vahan AI · Secure account recovery</p>
    </main>
  );
}
