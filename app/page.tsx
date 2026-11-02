"use client";

import { useEffect, useRef, useState } from "react";

type VehicleResult = {
  registrationNumber?: string;
  status?: string;
  ownerName?: string;
  make?: string;
  model?: string;
  fuelType?: string;
  registrationDate?: string;
  insuranceStatus?: string;
  fitnessStatus?: string;
  verificationScore?: number;
  source?: string;
  warnings?: string[];
  [key: string]: unknown;
};

type SpeechRecognitionResult = { [index: number]: { transcript: string }; length: number };
type SpeechRecognitionEvent = { results: { [index: number]: SpeechRecognitionResult }; };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const slides = [
  { eyebrow: "THE NEXT-GEN VEHICLE EXPERIENCE", title: "Every vehicle story.\nOne intelligent place.", body: "Explore verified vehicle details, ownership records, previous insurance and claim information in one beautifully simple experience.", tag: "VEHICLE INTELLIGENCE", icon: "✦", className: "slide-one" },
  { eyebrow: "KNOW WHAT YOU DRIVE", title: "Your vehicle.\nClearly understood.", body: "A structured view of RC details, registration, fitness, PUC and other available vehicle records.", tag: "RC • OWNER • RTO", icon: "⌁", className: "slide-two" },
  { eyebrow: "CLAIMS, WITHOUT THE CONFUSION", title: "Bring claim records\ninto focus.", body: "Organise claim history, documents and status updates from authorised sources or records you provide.", tag: "CLAIM SUPPORT", icon: "◇", className: "slide-three" },
  { eyebrow: "MADE FOR EVERY LANGUAGE", title: "Just speak.\nVAHAN AI listens.", body: "Use voice search and a multilingual experience designed for Hindi, Marathi and English.", tag: "VOICE • AI • MULTILINGUAL", icon: "◉", className: "slide-four" },
];

const features = [
  { icon: "▣", title: "RC Details", subtitle: "Registration & vehicle profile", tone: "blue" },
  { icon: "♙", title: "Owner Details", subtitle: "Owner & transfer records", tone: "violet" },
  { icon: "◈", title: "Insurance History", subtitle: "Previous policy details", tone: "cyan" },
  { icon: "⌁", title: "Claim Support", subtitle: "Claim history & documents", tone: "pink" },
  { icon: "▤", title: "Challan Details", subtitle: "Available traffic records", tone: "orange" },
  { icon: "✓", title: "Fitness & PUC", subtitle: "Vehicle compliance status", tone: "green" },
  { icon: "↗", title: "Ownership History", subtitle: "Transfer timeline", tone: "blue" },
  { icon: "⌂", title: "RTO & Finance", subtitle: "RTO and hypothecation", tone: "violet" },
  { icon: "✧", title: "AI Vehicle Report", subtitle: "Clear summary of available data", tone: "cyan" },
];

const languages = [
  { label: "English", code: "en-IN" },
  { label: "हिन्दी", code: "hi-IN" },
  { label: "मराठी", code: "mr-IN" },
];

function displayValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "Not available from current source";
}

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vehicle, setVehicle] = useState<VehicleResult | null>(null);
  const [activeFeature, setActiveFeature] = useState("RC Details");
  const [featureNotice, setFeatureNotice] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 5200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  function startVoiceSearch() {
    const Speech = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!Speech) {
      setError("Voice search is not supported in this browser. Please use Chrome or type the vehicle number.");
      return;
    }
    setError("");
    const recognition = new Speech();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      const cleaned = transcript.toUpperCase().replace(/[^A-Z0-9]/g, "");
      setRegistrationNumber(cleaned);
      setListening(false);
    };
    recognition.onerror = () => {
      setListening(false);
      setError("Voice input could not be captured. Please try again or type the registration number.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function searchVehicle(event?: React.FormEvent) {
    event?.preventDefault();
    const cleaned = registrationNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleaned) {
      setError("Please enter a vehicle registration number.");
      return;
    }
    setLoading(true);
    setError("");
    setVehicle(null);
    try {
      const response = await fetch("/api/rc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber: cleaned }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Vehicle verification could not be completed.");
      setVehicle(payload.result as VehicleResult);
      setActiveFeature("RC Details");
      document.getElementById("vehicle-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function selectFeature(title: string) {
    setActiveFeature(title);
    if (title === "RC Details" && vehicle) {
      document.getElementById("vehicle-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setFeatureNotice("");
      return;
    }
    setFeatureNotice(title + " is part of the VAHAN AI roadmap. This section will show verified records only when an authorised data source or user-provided document is connected.");
  }

  return (
    <main className="vahan-app">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <header className="topbar">
        <a className="brand" href="#" aria-label="VAHAN AI home">
          <span className="brand-mark">V<span>✦</span></span>
          <span className="brand-copy"><strong>VAHAN <em>AI</em></strong><small>INDEPENDENT VEHICLE INFORMATION PLATFORM</small></span>
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a className="nav-active" href="#home">Home</a>
          <a href="#features">Explore</a>
          <a href="#vehicle-result">Vehicle report</a>
          <a href="#claim-support">Claim support</a>
        </nav>
        <div className="top-actions">
          <label className="language-select" aria-label="Voice language">
            <span>文</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              {languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
          </label>
          <a className="profile-button" href="#features" aria-label="Explore features">↗</a>
        </div>
      </header>

      <section className="hero-wrap" id="home">
        <div className="hero-copy">
          <div className="live-label"><span className="live-dot" /> A SMARTER WAY TO KNOW YOUR VEHICLE</div>
          <h1>More than details.<br /><span>Your vehicle&apos;s</span><br /><span className="gradient-text">whole story.</span></h1>
          <p>One intelligent destination for vehicle records, owner information, previous insurance, claim support and more.</p>
          <div className="hero-points"><span>✦ RC intelligence</span><span>✦ Claim history</span><span>✦ Voice enabled</span></div>
        </div>
        <div className="hero-art" aria-label="Abstract futuristic vehicle illustration">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="art-glow" />
          <div className="car-emoji">🚘</div>
          <div className="float-chip chip-top"><span>✦</span> AI VEHICLE INSIGHTS</div>
          <div className="float-chip chip-bottom"><b>360°</b><span>VEHICLE VIEW</span></div>
          <div className="art-caption">INTELLIGENCE IN MOTION</div>
        </div>
      </section>

      <section className="slider-section" aria-label="Featured information">
        <div className="slider-heading"><div><span className="section-kicker">DISCOVER VAHAN AI</span><h2>A new perspective, every slide.</h2></div><div className="slider-controls"><button onClick={() => setActiveSlide((activeSlide + slides.length - 1) % slides.length)} aria-label="Previous slide">←</button><button onClick={() => setActiveSlide((activeSlide + 1) % slides.length)} aria-label="Next slide">→</button></div></div>
        <div className={"feature-slider " + slides[activeSlide].className} onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }} onTouchEnd={(event) => { if (touchStartX.current === null) return; const delta = event.changedTouches[0].clientX - touchStartX.current; if (Math.abs(delta) > 45) setActiveSlide((activeSlide + (delta < 0 ? 1 : slides.length - 1)) % slides.length); touchStartX.current = null; }}>
          <div className="slider-content"><span className="slider-eyebrow">{slides[activeSlide].eyebrow}</span><h3>{slides[activeSlide].title.split("\n").map((line) => <span key={line}>{line}<br /></span>)}</h3><p>{slides[activeSlide].body}</p><span className="slider-tag">{slides[activeSlide].tag}</span></div>
          <div className="slider-symbol">{slides[activeSlide].icon}</div>
          <div className="slider-bottom"><span>0{activeSlide + 1} <i>/ 0{slides.length}</i></span><div className="slider-dots">{slides.map((slide, index) => <button key={slide.title} className={index === activeSlide ? "dot active" : "dot"} onClick={() => setActiveSlide(index)} aria-label={"Show slide " + (index + 1)} />)}</div><span className="swipe-hint">SWIPE TO EXPLORE ↗</span></div>
        </div>
      </section>

      <section className="search-panel" aria-label="Vehicle search">
        <div className="search-intro"><span className="section-kicker">START WITH A NUMBER</span><h2>Let&apos;s find your vehicle.</h2><p>Enter a registration number or use your voice to begin.</p></div>
        <form className="vehicle-search" onSubmit={searchVehicle}>
          <div className="search-input-wrap"><span className="india-badge">IND</span><input value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value.toUpperCase())} placeholder="Enter registration number" aria-label="Vehicle registration number" maxLength={20} /><button type="button" className={listening ? "voice-button listening" : "voice-button"} onClick={listening ? () => recognitionRef.current?.stop() : startVoiceSearch} aria-label={listening ? "Stop voice search" : "Start voice search"}>{listening ? "■" : "🎙"}</button><button className="search-button" type="submit" disabled={loading}>{loading ? <span className="spinner" /> : "⌕"}<span>{loading ? "Checking" : "Search vehicle"}</span></button></div>
          <div className="search-foot"><span>⌁ Secure lookup through connected authorised sources</span><span className={listening ? "listening-label" : ""}>{listening ? "Listening… speak now" : "Voice: Hindi • Marathi • English"}</span></div>
        </form>
        {error && <div className="error-message" role="alert">{error}</div>}
      </section>

      {vehicle && <section className="result-panel" id="vehicle-result"><div className="result-heading"><div><span className="section-kicker">LIVE LOOKUP RESPONSE</span><h2>Vehicle overview</h2></div><span className="verified-pill">● API RESPONSE RECEIVED</span></div><div className="vehicle-identity"><div className="vehicle-avatar">🚙</div><div><strong>{vehicle.registrationNumber || registrationNumber}</strong><span>{[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle details"}</span></div></div><div className="result-grid">{[["Registered owner", vehicle.ownerName],["Fuel type",vehicle.fuelType],["Registration date",vehicle.registrationDate],["RC status",vehicle.status],["Insurance status",vehicle.insuranceStatus],["Fitness status",vehicle.fitnessStatus],["Verification score",typeof vehicle.verificationScore === "number" ? vehicle.verificationScore + "%" : undefined],["Data source",vehicle.source]].map(([label,value])=><div className="result-cell" key={String(label)}><small>{label}</small><strong>{displayValue(value)}</strong></div>)}</div>{vehicle.warnings?.length ? <div className="result-warnings">{vehicle.warnings.map((warning)=><p key={warning}>ⓘ {warning}</p>)}</div> : null}</section>}

      <section className="modules-section" id="features">
        <div className="section-heading"><div><span className="section-kicker">EXPLORE THE PLATFORM</span><h2>Everything connected.<br /><span className="gradient-text">Beautifully organised.</span></h2></div><p>One vehicle profile. Multiple insights. A clear, modern experience.</p></div>
        <div className="feature-grid">{features.map((feature,index)=><button className={"module-card tone-" + feature.tone} key={feature.title} onClick={() => selectFeature(feature.title)}><span className="module-index">0{index+1}</span><span className="module-icon">{feature.icon}</span><strong>{feature.title}</strong><small>{feature.subtitle}</small><span className="module-arrow">↗</span></button>)}</div>
        {featureNotice && <div className="feature-notice"><span>✦</span><p>{featureNotice}</p><button onClick={() => setFeatureNotice("")} aria-label="Close feature note">×</button></div>}
      </section>

      <section className="claim-band" id="claim-support"><div className="claim-icon">◇</div><div><span className="section-kicker">CLAIM SUPPORT & HISTORY</span><h2>Every claim deserves clarity.</h2><p>Keep claim references, documents and status updates organised. Historical claim data appears only when supplied by an authorised source or verified documents.</p></div><a href="#features" className="claim-link">Explore claim features <span>↗</span></a></section>

      <section className="voice-band"><div className="voice-orb">◉</div><div><span className="section-kicker">MEET YOUR VOICE COMPANION</span><h2>Say it. Search it. Understand it.</h2><p>Voice input is available in supported browsers. Choose Hindi, Marathi or English above and tap the microphone.</p></div><button onClick={startVoiceSearch} className="voice-cta">🎙 Try voice search</button></section>

      <footer className="footer"><a className="brand footer-brand" href="#home"><span className="brand-mark">V<span>✦</span></span><span className="brand-copy"><strong>VAHAN <em>AI</em></strong><small>INDEPENDENT VEHICLE INFORMATION PLATFORM</small></span></a><p>Independent platform. Not affiliated with any government department.</p><span>© {new Date().getFullYear()} VAHAN AI</span></footer>
    </main>
  );
}
