"use client";

import { FormEvent, useEffect, useState } from 'react';

type Language = 'en' | 'hi' | 'mr';

type PublicVehicleResult = {
  registrationNumber: string;
  status: string;
  make: string | null;
  model: string | null;
  fuelType: string | null;
  registrationDate: string | null;
  insuranceStatus: string | null;
  fitnessStatus: string | null;
  source: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const copy = {
  en: {
    eyebrow: 'PARTNER VEHICLE LOOKUP',
    subtitle: 'Open Vahan AI directly on your phone. No account or password is required for this partner lookup.',
    find: 'Find a vehicle',
    hint: 'Enter the registration number printed on the vehicle RC',
    reg: 'Vehicle registration number',
    verify: 'Verify vehicle',
    verifying: 'Checking provider…',
    results: 'Vehicle record',
    awaiting: 'Awaiting lookup',
    status: 'Provider status',
    make: 'Make',
    model: 'Model',
    fuel: 'Fuel type',
    date: 'Registration date',
    insurance: 'Insurance status',
    fitness: 'Fitness status',
    missing: 'Not supplied by provider',
    note: 'Only basic vehicle details are displayed on this public partner page. Owner name, address, mobile, chassis and engine details are not shared here.',
    consent: 'I confirm I am authorized to request this vehicle lookup and will use the returned information only for a lawful insurance or service purpose.',
    error: 'Vehicle lookup could not be completed.',
    source: 'Source',
    share: 'Share on WhatsApp',
    install: 'Add to phone',
    installing: 'Opening install prompt…',
    installHelp: 'To keep Vahan AI on your phone: open Chrome menu ⋮ and choose “Add to Home screen” or “Install app”. On iPhone, use Safari Share → Add to Home Screen.',
    shareText: 'Open Vahan AI Partner Vehicle Lookup:',
    footer: 'Vahan AI · Partner access',
    privacy: 'Public access is rate-limited. No owner personal details are displayed.',
    consentRequired: 'Please confirm that you are authorized to request this lookup.',
  },
  hi: {
    eyebrow: 'पार्टनर वाहन जाँच',
    subtitle: 'Vahan AI अपने मोबाइल पर सीधे खोलें। इस पार्टनर lookup के लिए account या password की जरूरत नहीं है।',
    find: 'वाहन खोजें',
    hint: 'वाहन की RC पर लिखा रजिस्ट्रेशन नंबर डालें',
    reg: 'वाहन रजिस्ट्रेशन नंबर',
    verify: 'वाहन जाँचें',
    verifying: 'प्रदाता से जाँच हो रही है…',
    results: 'वाहन रिकॉर्ड',
    awaiting: 'जाँच की प्रतीक्षा',
    status: 'प्रदाता स्थिति',
    make: 'कंपनी',
    model: 'मॉडल',
    fuel: 'ईंधन प्रकार',
    date: 'रजिस्ट्रेशन तारीख',
    insurance: 'बीमा स्थिति',
    fitness: 'फिटनेस स्थिति',
    missing: 'प्रदाता ने उपलब्ध नहीं कराया',
    note: 'इस सार्वजनिक पार्टनर पेज पर केवल वाहन की सामान्य जानकारी दिखाई जाती है। मालिक का नाम, पता, मोबाइल, चेसिस और इंजन विवरण यहाँ साझा नहीं होते।',
    consent: 'मैं पुष्टि करता/करती हूँ कि इस वाहन की जानकारी प्राप्त करने के लिए अधिकृत हूँ और इसका उपयोग केवल वैध बीमा या सर्विस उद्देश्य से करूँगा/करूँगी।',
    error: 'वाहन की जाँच पूरी नहीं हो सकी।',
    source: 'डेटा स्रोत',
    share: 'WhatsApp पर लिंक भेजें',
    install: 'मोबाइल में रखें',
    installing: 'Install विकल्प खोला जा रहा है…',
    installHelp: 'Vahan AI को मोबाइल में रखने के लिए Chrome के ⋮ मेनू में “Add to Home screen” या “Install app” चुनें। iPhone पर Safari Share → Add to Home Screen चुनें।',
    shareText: 'Vahan AI Partner Vehicle Lookup खोलें:',
    footer: 'Vahan AI · पार्टनर एक्सेस',
    privacy: 'सार्वजनिक lookup पर सीमा लागू है। मालिक की निजी जानकारी नहीं दिखाई जाती।',
    consentRequired: 'कृपया पुष्टि करें कि आप इस lookup के लिए अधिकृत हैं।',
  },
  mr: {
    eyebrow: 'पार्टनर वाहन तपासणी',
    subtitle: 'Vahan AI थेट मोबाईलवर उघडा. या पार्टनर lookup साठी account किंवा password आवश्यक नाही.',
    find: 'वाहन शोधा',
    hint: 'वाहनाच्या RC वर छापलेला नोंदणी क्रमांक टाका',
    reg: 'वाहन नोंदणी क्रमांक',
    verify: 'वाहन तपासा',
    verifying: 'प्रदात्याकडून तपासणी सुरू आहे…',
    results: 'वाहन नोंद',
    awaiting: 'तपासणीची प्रतीक्षा',
    status: 'प्रदाता स्थिती',
    make: 'कंपनी',
    model: 'मॉडेल',
    fuel: 'इंधन प्रकार',
    date: 'नोंदणी दिनांक',
    insurance: 'विमा स्थिती',
    fitness: 'फिटनेस स्थिती',
    missing: 'प्रदात्याकडून उपलब्ध नाही',
    note: 'या सार्वजनिक पार्टनर पेजवर फक्त वाहनाची सामान्य माहिती दाखवली जाते. मालकाचे नाव, पत्ता, मोबाईल, चेसिस आणि इंजिन तपशील येथे दाखवले जात नाहीत.',
    consent: 'या वाहनाची माहिती मिळवण्यासाठी मी अधिकृत आहे आणि मिळालेली माहिती फक्त कायदेशीर विमा किंवा सेवा उद्देशासाठी वापरेन.',
    error: 'वाहन तपासणी पूर्ण होऊ शकली नाही.',
    source: 'माहितीचा स्रोत',
    share: 'WhatsApp वर लिंक पाठवा',
    install: 'मोबाईलमध्ये ठेवा',
    installing: 'Install पर्याय उघडत आहे…',
    installHelp: 'Vahan AI मोबाईलमध्ये ठेवण्यासाठी Chrome ⋮ मेनूमधून “Add to Home screen” किंवा “Install app” निवडा. iPhone वर Safari Share → Add to Home Screen निवडा.',
    shareText: 'Vahan AI Partner Vehicle Lookup उघडा:',
    footer: 'Vahan AI · पार्टनर प्रवेश',
    privacy: 'सार्वजनिक lookup वर मर्यादा आहेत. मालकाची वैयक्तिक माहिती दाखवली जात नाही.',
    consentRequired: 'कृपया तुम्ही या lookup साठी अधिकृत असल्याची पुष्टी करा.',
  },
} as const;

export default function PartnerPage() {
  const [language, setLanguage] = useState<Language>('en');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [authorizedPurpose, setAuthorizedPurpose] = useState(false);
  const [result, setResult] = useState<PublicVehicleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [installMessage, setInstallMessage] = useState('');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const t = copy[language];

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  async function handleInstall() {
    setInstallMessage('');
    if (!installPrompt) {
      setInstallMessage(t.installHelp);
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function handleWhatsAppShare() {
    const currentUrl = new URL(window.location.href);
    const partnerUrl = new URL('/partner', currentUrl.origin);
    // Preserve a Vercel Preview share-link bypass token if this page was
    // opened through a deployment-specific Shareable Link.
    currentUrl.searchParams.forEach((value, key) => {
      if (key.startsWith('x-vercel-')) partnerUrl.searchParams.set(key, value);
    });
    const message = t.shareText + ' ' + partnerUrl.toString();
    const whatsappUrl = 'https://wa.me/?text=' + encodeURIComponent(message);
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    if (!authorizedPurpose) {
      setError(t.consentRequired);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/public/rc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          registrationNumber,
          authorizedPurpose: true,
        }),
      });
      const data = (await response.json()) as { result?: PublicVehicleResult; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error || t.error);
      setResult(data.result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.error);
    } finally {
      setLoading(false);
    }
  }

  const display = (value: string | null) => value || t.missing;
  const details: Array<[string, string | null]> = result ? [
    [t.status, result.status],
    [t.make, result.make],
    [t.model, result.model],
    [t.fuel, result.fuelType],
    [t.date, result.registrationDate],
    [t.insurance, result.insuranceStatus],
    [t.fitness, result.fitnessStatus],
  ] : [];

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/partner" aria-label="Vahan AI partner home">
          <span className="brand-mark">V</span><span>Vahan <strong>AI</strong></span>
        </a>
        <div className="partner-tools">
          <label className="language-picker">
            <span>Language</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label="Language">
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="mr">मराठी</option>
            </select>
          </label>
          <button className="button button-share" type="button" onClick={handleWhatsAppShare}>{t.share}</button>
          <button className="button button-install" type="button" onClick={handleInstall}>{t.install}</button>
        </div>
      </header>

      <section className="intro">
        <div className="intro-copy">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>Vahan AI<span className="title-dot">.</span></h1>
          <p className="intro-text">{t.subtitle}</p>
          <div className="trust-row">
            <span><span className="status-dot" /> Mobile partner access</span>
            <span>Privacy limited</span>
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
            <circle cx="116" cy="161" r="25" fill="#0d1728"/><circle cx="116" cy="161" r="13" fill="#7c90a8"/>
            <circle cx="335" cy="161" r="25" fill="#0d1728"/><circle cx="335" cy="161" r="13" fill="#7c90a8"/>
          </svg>
          <div className="art-caption"><span className="caption-pulse" /> Partner RC lookup</div>
        </div>
      </section>

      <section className="workspace partner-workspace">
        <div className="panel form-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">STEP 01</p><h2>{t.find}</h2></div>
            <span className="panel-icon">⌕</span>
          </div>
          <p className="panel-description">{t.hint}</p>
          <form onSubmit={handleSubmit} className="lookup-form">
            <label className="field-label" htmlFor="partner-registration">{t.reg}<span className="required-mark">*</span></label>
            <input
              id="partner-registration"
              value={registrationNumber}
              onChange={(event) => setRegistrationNumber(event.target.value.toUpperCase())}
              placeholder="MH 12 AB 1234"
              autoComplete="off"
              autoCapitalize="characters"
              inputMode="text"
              spellCheck={false}
              maxLength={25}
              pattern="[A-Za-z0-9\s-]+"
              required
            />
            <label className="consent-row">
              <input
                className="consent-checkbox"
                type="checkbox"
                checked={authorizedPurpose}
                onChange={(event) => setAuthorizedPurpose(event.target.checked)}
                required
              />
              <span>{t.consent}</span>
            </label>
            <button className="button button-primary submit-button" type="submit" disabled={loading}>
              {loading ? t.verifying : t.verify} <span aria-hidden="true">→</span>
            </button>
          </form>
          {error ? <div className="alert error" role="alert">{error}</div> : null}
          {installMessage ? <div className="alert info" role="status">{installMessage}</div> : null}
          <p className="privacy-note"><span>▣</span>{t.privacy}</p>
        </div>

        <div className="panel result-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">STEP 02</p><h2>{t.results}</h2></div>
            <span className={result ? 'result-status' : 'waiting-chip'}>{result ? result.status : t.awaiting}</span>
          </div>
          {result ? (
            <>
              <div className="vehicle-summary">
                <div><p className="result-label">{t.reg}</p><p className="registration-pill">{result.registrationNumber}</p></div>
                <div className="result-status">Verified provider response</div>
              </div>
              <div className="detail-grid">
                {details.map(([label, value]) => (
                  <div className="detail-item" key={label}>
                    <span>{label}</span>
                    <strong>{display(value)}</strong>
                  </div>
                ))}
                <div className="detail-item"><span>{t.source}</span><strong>Surepass RC V2</strong></div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <h3>Vehicle details appear here</h3>
              <p>Enter a registration number to request basic vehicle information from the configured provider. Owner personal details are not displayed.</p>
              <div className="empty-line"><span/><span/><span/></div>
            </div>
          )}
          <div className="panel-footnote">{t.note}</div>
        </div>
      </section>

      <footer className="footer">
        <div><strong>Vahan AI</strong><span className="footer-separator">/</span>{t.footer}</div>
        <div>Secure provider access <span className="footer-separator">·</span> Mobile friendly</div>
      </footer>
    </main>
  );
}
