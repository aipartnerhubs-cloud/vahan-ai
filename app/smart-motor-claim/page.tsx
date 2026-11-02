"use client";

import { useState } from "react";

type DocKey = "policy" | "rc" | "driverDl" | "ownerDl" | "accident" | "police" | "other";
const requiredDocs: { key: DocKey; title: string; hint: string; required: boolean; accept: string }[] = [
  { key: "policy", title: "Active motor insurance policy", hint: "Upload all policy pages, including schedule and add-ons.", required: true, accept: "image/*,.pdf" },
  { key: "rc", title: "Vehicle RC copy", hint: "Front and back, or a clear digital RC PDF.", required: true, accept: "image/*,.pdf" },
  { key: "driverDl", title: "Accident-time driver's Driving Licence", hint: "Both sides; the person driving at the time of accident.", required: true, accept: "image/*,.pdf" },
  { key: "ownerDl", title: "Owner's Driving Licence (if different)", hint: "Upload if requested by the insurer or applicable to this claim.", required: false, accept: "image/*,.pdf" },
  { key: "accident", title: "Accident photos / video", hint: "Vehicle sides, number plate, close-up damage and accident location.", required: true, accept: "image/*,video/*" },
  { key: "police", title: "FIR / police intimation (if applicable)", hint: "Upload the acknowledgement or FIR when available/required.", required: false, accept: "image/*,.pdf" },
  { key: "other", title: "Additional insurer-requested documents", hint: "Estimate, repair bills, permit, fitness, statements or other requested files.", required: false, accept: "image/*,.pdf" },
];

export default function SmartMotorClaimPage() {
  const [files, setFiles] = useState<Partial<Record<DocKey, File[]>>>({});
  const [registration, setRegistration] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [insurer, setInsurer] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentPlace, setIncidentPlace] = useState("");
  const [description, setDescription] = useState("");
  const [driverName, setDriverName] = useState("");
  const [consent, setConsent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const [language, setLanguage] = useState("hi-IN");
  const [listening, setListening] = useState(false);

  const requiredComplete = requiredDocs.filter((d) => d.required).every((d) => (files[d.key]?.length ?? 0) > 0);
  const uploadedCount = Object.values(files).reduce((n, list) => n + (list?.length ?? 0), 0);
  const canPrepare = requiredComplete && consent && confirmed && registration.trim().length > 0 && incidentDate && description.trim().length > 0;

  function addFiles(key: DocKey, list: FileList | null) {
    if (!list) return;
    setFiles((old) => ({ ...old, [key]: [...(old[key] ?? []), ...Array.from(list)] }));
    setNotice("");
  }

  function startVoice() {
    const w = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const Speech = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Speech) { setNotice("इस ब्राउज़र में voice input उपलब्ध नहीं है। कृपया जानकारी टाइप करें।"); return; }
    const rec = new Speech();
    rec.lang = language;
    rec.interimResults = false;
    rec.onresult = (e: any) => { const spoken = e.results?.[0]?.[0]?.transcript ?? ""; setDescription((v) => v ? v + " " + spoken : spoken); setListening(false); };
    rec.onerror = () => { setListening(false); setNotice("Voice capture नहीं हो पाया। दोबारा कोशिश करें या टाइप करें।"); };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  function prepareClaim() {
    if (!canPrepare) return;
    setNotice("Checklist पूरी है। यह जानकारी अभी आपके ब्राउज़र में तैयार की गई है। वास्तविक OCR matching, secure document storage, insurer-specific claim form generation और submission integration जुड़ने के बाद ही आधिकारिक claim form बनेगा या कंपनी को भेजा जाएगा। अभी कोई दस्तावेज़ सर्वर पर अपलोड या insurer को submit नहीं हुआ है।");
  }

  return (
    <main className="claim-app">
      <header className="claim-top"><a href="/" className="claim-brand">✦ VAHAN <b>AI</b></a><nav><a href="/">Vehicle AI Home</a><a href="#documents">Upload documents</a><a href="#claim-details">Claim details</a></nav></header>
      <section className="claim-hero">
        <span className="claim-kicker">VAHAN AI • DIGITAL MOTOR CLAIMS</span>
        <h1>Smart Motor <em>Claim</em></h1>
        <p>Accident के समय से claim preparation तक — AI-guided photo survey, document checklist और claim details एक ही जगह।</p>
        <div className="claim-hero-pills"><span>AI Self Survey</span><span>Hindi • Marathi • English</span><span>Customer-controlled uploads</span></div>
      </section>

      <section className="claim-safety"><strong>पहले सुरक्षा</strong><p>घायल व्यक्ति हों या तत्काल खतरा हो तो पहले emergency services से संपर्क करें। भारत में आपातकालीन सहायता के लिए 112 उपलब्ध है। सुरक्षित स्थान पर जाने के बाद ही फोटो लें। चलती सड़क पर खड़े होकर फोटो न लें और वाहन/मलबे को असुरक्षित तरीके से न छुएँ।</p></section>

      <section className="claim-progress">
        <div><small>DOCUMENT CHECKLIST</small><strong>{uploadedCount} files selected</strong></div>
        <div className="claim-progress-track"><span style={{ width: Math.min(100, (requiredDocs.filter((d) => (files[d.key]?.length ?? 0) > 0).length / requiredDocs.length) * 100) + "%" }} /></div>
        <small>Required documents: {requiredDocs.filter((d) => d.required && (files[d.key]?.length ?? 0) > 0).length} / {requiredDocs.filter((d) => d.required).length} uploaded</small>
      </section>

      <section className="claim-section" id="documents">
        <div className="claim-section-heading"><div><span className="claim-kicker">STEP 01</span><h2>Upload your documents</h2><p>एक-एक दस्तावेज़ चुनें। अतिरिक्त दस्तावेज़ भी बाद में जोड़े जा सकते हैं।</p></div><span className="claim-step-badge">DOCUMENTS</span></div>
        <div className="claim-doc-grid">
          {requiredDocs.map((doc) => <article className="claim-doc-card" key={doc.key}>
            <div className="claim-doc-top"><span className="claim-doc-icon">▤</span><span className={doc.required ? "claim-required" : "claim-optional"}>{doc.required ? "Required" : "If applicable"}</span></div>
            <h3>{doc.title}</h3><p>{doc.hint}</p>
            <label className="claim-upload"><input type="file" accept={doc.accept} multiple onChange={(e) => addFiles(doc.key, e.target.files)} />＋ Choose file(s)</label>
            {(files[doc.key] ?? []).map((f, i) => <div className="claim-file" key={f.name + i}><span>✓ {f.name}</span><button type="button" onClick={() => setFiles((old) => ({ ...old, [doc.key]: (old[doc.key] ?? []).filter((_, n) => n !== i) }))}>Remove</button></div>)}
          </article>)}
        </div>
        <div className="claim-ai-note"><b>✦ AI document matching — planned secure processing</b><p>अगले चरण में OCR policy, RC और DL से नाम, registration number, policy validity, vehicle details और licence validity निकालेगा। अंतर मिलने पर Mismatch दिखेगा और AI सही/अतिरिक्त दस्तावेज़ मांगेगा। अभी इस prototype में file selection होती है; वास्तविक OCR या server upload सक्रिय नहीं है।</p></div>
      </section>

      <section className="claim-section" id="claim-details">
        <div className="claim-section-heading"><div><span className="claim-kicker">STEP 02</span><h2>Tell us what happened</h2><p>अपनी भाषा में लिखें या voice से दुर्घटना का विवरण बताएं।</p></div><span className="claim-step-badge">INCIDENT</span></div>
        <div className="claim-form-grid">
          <label>Vehicle registration number<input value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} placeholder="उदा. MH15AB1234" /></label>
          <label>Policy number<input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} placeholder="Policy number" /></label>
          <label>Insurance company<input value={insurer} onChange={(e) => setInsurer(e.target.value)} placeholder="Insurer name as on policy" /></label>
          <label>Accident date<input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} /></label>
          <label>Accident location<input value={incidentPlace} onChange={(e) => setIncidentPlace(e.target.value)} placeholder="City, road / landmark" /></label>
          <label>Driver name at time of accident<input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="As per Driving Licence" /></label>
          <label className="claim-wide">Accident description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="दुर्घटना कैसे हुई, वाहन का कौन-सा हिस्सा क्षतिग्रस्त हुआ, कोई घायल हुआ या दूसरा वाहन शामिल था — जानकारी दें।" /><div className="claim-voice-row"><select value={language} onChange={(e) => setLanguage(e.target.value)}><option value="hi-IN">हिन्दी</option><option value="mr-IN">मराठी</option><option value="en-IN">English</option></select><button type="button" onClick={startVoice}>{listening ? "Listening…" : "🎙 Speak accident details"}</button></div></label>
        </div>
      </section>

      <section className="claim-section">
        <div className="claim-section-heading"><div><span className="claim-kicker">STEP 03</span><h2>Review before final form</h2><p>Final claim form से पहले जानकारी की पुष्टि जरूरी है।</p></div><span className="claim-step-badge">REVIEW</span></div>
        <div className="claim-review-list"><p><span>Policy ↔ RC ↔ vehicle number</span><b>OCR match required</b></p><p><span>Policy owner ↔ RC owner</span><b>Identity match required</b></p><p><span>Driver details ↔ DL validity</span><b>Licence check required</b></p><p><span>Accident details ↔ photos / documents</span><b>Customer confirmation required</b></p></div>
        <label className="claim-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /> मैंने भरी गई दुर्घटना जानकारी और अपलोड किए गए दस्तावेज़ों की समीक्षा की है।</label>
        <label className="claim-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> मैं इस claim assistance प्रक्रिया के लिए अपने दस्तावेज़ों और जानकारी के सुरक्षित उपयोग हेतु सहमति देता/देती हूँ। मुझे बताया गया है कि insurer submission अलग से मेरी मंजूरी के बाद ही होगा।</label>
        <button className="claim-primary" disabled={!canPrepare} onClick={prepareClaim}>Prepare claim checklist <span>→</span></button>
        {!canPrepare && <small className="claim-hint">आगे बढ़ने के लिए Policy, RC, Driver DL और accident photos अपलोड करें; वाहन नंबर, दुर्घटना की तारीख/विवरण भरें और दोनों confirmations दें।</small>}
        {notice && <div className="claim-notice" role="status">{notice}</div>}
      </section>

      <section className="claim-disclaimer"><b>महत्वपूर्ण जानकारी</b><p>यह अभी VAHAN AI का Smart Motor Claim interface prototype है। वास्तविक claim form auto-fill तभी सक्षम होगा जब OCR/document verification, secure private storage, insurer-specific form templates और अधिकृत submission channels जुड़ेंगे। AI survey केवल प्रारंभिक photo/document assistance है; यह insurer के अधिकृत surveyor, police process या claim approval का विकल्प नहीं है। कोई claim स्वतः submit नहीं किया जाता।</p></section>
      <footer className="claim-footer"><a href="/">← Back to VAHAN AI</a><span>VAHAN AI • Smart Motor Claim</span></footer>
    </main>
  );
}
