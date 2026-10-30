"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Language = 'en' | 'hi' | 'mr';

type VehicleResult = {
  registrationNumber: string;
  status: string;
  ownerName: string | null;
  make: string | null;
  model: string | null;
  fuelType: string | null;
  registrationDate: string | null;
  insuranceStatus: string | null;
  fitnessStatus: string | null;
  verificationScore: number | null;
  source: string;
  warnings?: string[];
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const copy = {
  en: {
    eyebrow: 'SECURE RC-FIRST VERIFICATION',
    title: 'Vahan AI',
    subtitle: 'Look up a vehicle using its registration number first. Verified provider data can then support your insurance workflow.',
    reg: 'Vehicle registration number',
    regHint: 'Enter the number printed on the vehicle RC',
    chassis: 'Chassis number (optional)',
    engine: 'Engine number (optional)',
    verify: 'Verify vehicle',
    verifying: 'Checking provider…',
    voice: 'Speak number',
    voiceUnsupported: 'Voice input is not supported in this browser. Type the registration number instead.',
    voiceError: 'Could not capture speech. Please try again or type the number.',
    results: 'Vehicle record',
    provider: 'Provider status',
    owner: 'Registered owner',
    makeModel: 'Make and model',
    fuel: 'Fuel type',
    date: 'Registration date',
    insurance: 'Insurance status',
    fitness: 'Fitness status',
    score: 'Provider score',
    noScore: 'Not supplied',
    source: 'Data source',
    note: 'Only fields returned by the connected provider are shown. Missing fields are not guessed.',
    disclaimer: 'Use vehicle and owner information only for an authorized, lawful purpose.',
    signOut: 'Sign out',
    error: 'Vehicle lookup could not be completed.',
    missing: 'Not provided by provider',
    language: 'Language',
  },
  hi: {
    eyebrow: 'सुरक्षित RC-आधारित जाँच',
    title: 'Vahan AI',
    subtitle: 'पहले वाहन का रजिस्ट्रेशन नंबर डालें। प्रदाता से मिले सत्यापित विवरण आपके बीमा कार्य में मदद कर सकते हैं।',
    reg: 'वाहन रजिस्ट्रेशन नंबर',
    regHint: 'RC पर लिखा नंबर दर्ज करें',
    chassis: 'चेसिस नंबर (वैकल्पिक)',
    engine: 'इंजन नंबर (वैकल्पिक)',
    verify: 'वाहन जाँचें',
    verifying: 'प्रदाता से जाँच हो रही है…',
    voice: 'बोलकर नंबर डालें',
    voiceUnsupported: 'इस ब्राउज़र में वॉइस सुविधा उपलब्ध नहीं है। नंबर टाइप करें।',
    voiceError: 'आवाज़ समझ नहीं आई। दोबारा प्रयास करें या नंबर टाइप करें।',
    results: 'वाहन रिकॉर्ड',
    provider: 'प्रदाता स्थिति',
    owner: 'पंजीकृत मालिक',
    makeModel: 'कंपनी और मॉडल',
    fuel: 'ईंधन प्रकार',
    date: 'रजिस्ट्रेशन तारीख',
    insurance: 'बीमा स्थिति',
    fitness: 'फिटनेस स्थिति',
    score: 'प्रदाता स्कोर',
    noScore: 'उपलब्ध नहीं',
    source: 'डेटा स्रोत',
    note: 'केवल प्रदाता से प्राप्त विवरण दिखाए जाते हैं। अनुपलब्ध जानकारी का अनुमान नहीं लगाया जाता।',
    disclaimer: 'वाहन और मालिक की जानकारी का उपयोग केवल अधिकृत और वैध उद्देश्य से करें।',
    signOut: 'साइन आउट',
    error: 'वाहन की जाँच पूरी नहीं हो सकी।',
    missing: 'प्रदाता ने उपलब्ध नहीं कराया',
    language: 'भाषा',
  },
  mr: {
    eyebrow: 'सुरक्षित RC-आधारित पडताळणी',
    title: 'Vahan AI',
    subtitle: 'प्रथम वाहनाचा नोंदणी क्रमांक टाका. प्रदात्याकडून मिळालेली पडताळलेली माहिती विमा प्रक्रियेस मदत करू शकते.',
    reg: 'वाहन नोंदणी क्रमांक',
    regHint: 'RC वर छापलेला क्रमांक टाका',
    chassis: 'चेसिस क्रमांक (ऐच्छिक)',
    engine: 'इंजिन क्रमांक (ऐच्छिक)',
    verify: 'वाहन तपासा',
    verifying: 'प्रदात्याकडून तपासणी सुरू आहे…',
    voice: 'बोलून क्रमांक भरा',
    voiceUnsupported: 'या ब्राउझरमध्ये आवाजाद्वारे इनपुट उपलब्ध नाही. क्रमांक टाइप करा.',
    voiceError: 'आवाज समजू शकला नाही. पुन्हा प्रयत्न करा किंवा क्रमांक टाइप करा.',
    results: 'वाहन नोंद',
    provider: 'प्रदाता स्थिती',
    owner: 'नोंदणीकृत मालक',
    makeModel: 'कंपनी आणि मॉडेल',
    fuel: 'इंधन प्रकार',
    date: 'नोंदणी दिनांक',
    insurance: 'विमा स्थिती',
    fitness: 'फिटनेस स्थिती',
    score: 'प्रदाता स्कोअर',
    noScore: 'उपलब्ध नाही',
    source: 'माहितीचा स्रोत',
    note: 'फक्त प्रदात्याकडून मिळालेली माहिती दाखवली जाते. अनुपलब्ध माहितीचा अंदाज लावला जात नाही.',
    disclaimer: 'वाहन आणि मालकाची माहिती फक्त अधिकृत व कायदेशीर कारणासाठी वापरा.',
    signOut: 'साइन आउट',
    error: 'वाहन तपासणी पूर्ण होऊ शकली नाही.',
    missing: 'प्रदात्याकडून उपलब्ध नाही',
    language: 'भाषा',
  },
} as const;

export default function HomePage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [result, setResult] = useState<VehicleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const t = copy[language];

  async function handleSignOut() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace('/login');
      router.refresh();
    } catch {
      setError('Sign out failed. Please reload and try again.');
    }
  }

  function handleVoiceInput() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError(t.voiceUnsupported);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript || '';
      setRegistrationNumber(spoken.trim().toUpperCase());
      setError('');
    };
    recognition.onerror = () => setError(t.voiceError);
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/rc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          registrationNumber,
          ...(chassisNumber.trim() ? { chassisNumber: chassisNumber.trim() } : {}),
          ...(engineNumber.trim() ? { engineNumber: engineNumber.trim() } : {}),
        }),
      });

      const data = (await response.json()) as { result?: VehicleResult; error?: string };
      if (response.status === 401) {
        router.replace('/login');
        return;
      }
      if (!response.ok || !data.result) {
        throw new Error(data.error || t.error);
      }
      setResult(data.result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.error);
    } finally {
      setLoading(false);
    }
  }

  const display = (value: string | null) => value || t.missing;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Vahan AI home">
          <span className="brand-mark">V</span>
          <span>Vahan <strong>AI</strong></span>
        </a>
        <div className="topbar-actions">
          <label className="language-picker">
            <span>{t.language}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="mr">मराठी</option>
            </select>
          </label>
          <button className="button button-quiet" onClick={handleSignOut} type="button">{t.signOut}</button>
        </div>
      </header>

      <section className="intro">
        <div className="intro-copy">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}<span className="title-dot">.</span></h1>
          <p className="intro-text">{t.subtitle}</p>
          <div className="trust-row">
            <span><span className="status-dot" /> Server-side provider access</span>
            <span>Private by design</span>
          </div>
        </div>
        <div className="vehicle-art" aria-hidden="true">
          <div className="art-glow" />
          <svg viewBox="0 0 440 220" role="img" aria-label="Car illustration">
            <path d="M52 151 L75 113 Q83 99 103 95 L148 87 L184 54 Q192 46 207 46 L283 46 Q299 47 313 63 L343 98 L374 108 Q390 114 394 132 L397 151 Q399 160 387 164 L61 164 Q45 162 52 151Z" fill="#182c47"/>
            <path d="M158 88 L194 56 Q199 52 210 52 L245 52 L245 88Z" fill="#9cc3dc"/>
            <path d="M255 52 L281 52 Q292 53 303 66 L322 88 L255 88Z" fill="#9cc3dc"/>
            <path d="M75 117 L149 104 L149 144 L59 144Z" fill="#274563"/>
            <path d="M159 102 L322 102 L341 119 L341 145 L159 145Z" fill="#24415e"/>
            <path d="M53 147 L388 147 L390 157 L61 158Z" fill="#55d6c2"/>
            <circle cx="116" cy="161" r="25" fill="#0d1728"/><circle cx="116" cy="161" r="13" fill="#7c90a8"/><circle cx="116" cy="161" r="5" fill="#d9e6f4"/>
            <circle cx="335" cy="161" r="25" fill="#0d1728"/><circle cx="335" cy="161" r="13" fill="#7c90a8"/><circle cx="335" cy="161" r="5" fill="#d9e6f4"/>
            <path d="M362 125 L385 132 L386 143 L365 143Z" fill="#f5c26b"/>
          </svg>
          <div className="art-caption"><span className="caption-pulse" /> RC-first workflow</div>
        </div>
      </section>

      <section className="workspace">
        <div className="panel form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">STEP 01</p>
              <h2>Find a vehicle</h2>
            </div>
            <span className="panel-icon">⌕</span>
          </div>
          <p className="panel-description">{t.regHint}</p>
          <form onSubmit={handleSubmit} className="lookup-form">
            <label className="field-label" htmlFor="registration">{t.reg}<span className="required-mark">*</span></label>
            <div className="input-with-action">
              <input
                id="registration"
                value={registrationNumber}
                onChange={(event) => setRegistrationNumber(event.target.value.toUpperCase())}
                placeholder="MH 12 AB 1234"
                autoComplete="off"
                spellCheck={false}
                maxLength={25}
                pattern="[A-Za-z0-9\s-]+"
                required
              />
              <button className="voice-button" type="button" onClick={handleVoiceInput} disabled={listening} aria-label={t.voice}>
                <span aria-hidden="true">🎙</span>
                <span>{listening ? 'Listening…' : t.voice}</span>
              </button>
            </div>
            <div className="optional-fields">
              <label>
                <span className="field-label">{t.chassis}</span>
                <input value={chassisNumber} onChange={(event) => setChassisNumber(event.target.value)} maxLength={64} autoComplete="off" />
              </label>
              <label>
                <span className="field-label">{t.engine}</span>
                <input value={engineNumber} onChange={(event) => setEngineNumber(event.target.value)} maxLength={64} autoComplete="off" />
              </label>
            </div>
            <button className="button button-primary submit-button" type="submit" disabled={loading}>
              {loading ? t.verifying : t.verify}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          {error ? <div className="alert error" role="alert">{error}</div> : null}
          <p className="privacy-note"><span aria-hidden="true">▣</span> {t.disclaimer}</p>
        </div>

        <div className="panel result-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">STEP 02</p>
              <h2>{t.results}</h2>
            </div>
            {result ? <span className="result-status"><span className="status-dot" /> Live response</span> : <span className="waiting-chip">Awaiting lookup</span>}
          </div>

          {!result ? (
            <div className="empty-state">
              <div className="empty-icon"><span>✓</span></div>
              <h3>Vehicle details appear here</h3>
              <p>Enter a registration number to request a record from the configured provider. No sample vehicle is pre-filled.</p>
              <div className="empty-line"><span /> <span /> <span /></div>
            </div>
          ) : (
            <div className="vehicle-results">
              <div className="vehicle-summary">
                <div>
                  <p className="result-label">{t.provider}</p>
                  <h3>{result.status}</h3>
                  <p className="registration-pill">{result.registrationNumber}</p>
                </div>
                <div className="score-ring">
                  <strong>{result.verificationScore === null ? '—' : result.verificationScore}</strong>
                  <span>{result.verificationScore === null ? t.noScore : t.score}</span>
                </div>
              </div>
              <div className="detail-grid">
                <Detail label={t.owner} value={display(result.ownerName)} />
                <Detail label={t.makeModel} value={[result.make, result.model].filter(Boolean).join(' ') || t.missing} />
                <Detail label={t.fuel} value={display(result.fuelType)} />
                <Detail label={t.date} value={display(result.registrationDate)} />
                <Detail label={t.insurance} value={display(result.insuranceStatus)} />
                <Detail label={t.fitness} value={display(result.fitnessStatus)} />
                <Detail label={t.source} value={result.source} />
              </div>
              {result.warnings?.length ? (
                <div className="warning-list">
                  <strong>Provider notes</strong>
                  <ul>{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
                </div>
              ) : null}
            </div>
          )}
          <div className="panel-footnote">{t.note}</div>
        </div>
      </section>

      <footer className="footer">
        <span>Vahan AI <span className="footer-separator">/</span> Vehicle verification workspace</span>
        <span>Secure access · Authorized provider data</span>
      </footer>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
