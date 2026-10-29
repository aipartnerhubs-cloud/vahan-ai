"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!supabaseConfigured) {
      setError('Authentication is not configured. Ask the site administrator to complete the deployment setup.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
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
    <main className="page-shell" style={{ maxWidth: 560, justifyContent: 'center' }}>
      <section
        className="result-card"
        style={{ width: '100%', padding: 32 }}
        aria-labelledby="login-title"
      >
        <p className="eyebrow">Secure partner access</p>
        <h1 id="login-title" style={{ marginTop: 0 }}>Vahan AI</h1>
        <p style={{ color: '#475467', lineHeight: 1.6 }}>
          Sign in with an account provisioned by your administrator to access vehicle verification.
        </p>

        {!supabaseConfigured ? (
          <div className="alert error" role="alert" style={{ margin: '20px 0' }}>
            Setup required: configure the Supabase environment variables described in README.md in your hosting provider, then redeploy.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="verification-form" style={{ marginTop: 24 }}>
          <label>
            Work email
            <input
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              disabled={!supabaseConfigured || loading}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              disabled={!supabaseConfigured || loading}
            />
          </label>

          {error ? <div className="alert error" role="alert">{error}</div> : null}

          <button type="submit" disabled={!supabaseConfigured || loading}>
            {loading ? 'Signing in…' : 'Sign in securely'}
          </button>
        </form>

        <p style={{ color: '#667085', fontSize: 13, lineHeight: 1.6, marginTop: 20 }}>
          Accounts are created by an administrator. Public self-registration is not available in this application.
        </p>
      </section>
    </main>
  );
}
