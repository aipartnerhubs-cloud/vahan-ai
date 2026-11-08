"use client";

import { FormEvent, useEffect, useState } from 'react';

const emptyForm = { registrationNumber: '', chassisNumber: '', engineNumber: '' };
type VehicleResult = {
  registrationNumber: string; status: string; ownerName: string; make: string; model: string;
  fuelType: string; registrationDate: string; insuranceStatus: string; fitnessStatus: string;
  verificationScore: number; source: string; referenceId?: string; warnings?: string[];
  variant?: string; vehicleClass?: string; makerModel?: string; color?: string;
  insurerName?: string; policyNumber?: string; insuranceExpiryDate?: string;
  pucExpiryDate?: string; taxValidity?: string; financier?: string; ownershipCount?: string;
  claimsHistory?: string; chassisNumber?: string; engineNumber?: string; bodyType?: string; normsType?: string;
  vehicleCategory?: string; registeredAt?: string; rcExpiryDate?: string; blacklistStatus?: string;
  manufacturedMonthYear?: string; cubicCapacity?: string; seatingCapacity?: string;
};
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> };
const tabs = [{id:'overview',label:'Overview',icon:'🚘'},{id:'rc',label:'RC Details',icon:'▤'},{id:'owner',label:'Owner',icon:'♙'},{id:'insurance',label:'Insurance',icon:'🛡'},{id:'claims',label:'Claims',icon:'✚'},{id:'history',label:'History',icon:'↺'}] as const;

export default function HomePage() {
  const [form,setForm] = useState(emptyForm);
  const [result,setResult] = useState<VehicleResult|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [activeTab,setActiveTab] = useState<(typeof tabs)[number]['id']>('overview');
  const [installPrompt,setInstallPrompt] = useState<InstallPromptEvent|null>(null);
  const [installMessage,setInstallMessage] = useState('');

  useEffect(() => {
    if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
    const onBeforeInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener('beforeinstallprompt',onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt',onBeforeInstall);
  },[]);

  async function installApp() {
    if (!installPrompt) { setInstallMessage('Android Chrome: open ⋮ menu and choose Install app or Add to Home screen.'); return; }
    await installPrompt.prompt(); const choice = await installPrompt.userChoice;
    setInstallMessage(choice.outcome === 'accepted' ? 'App installation accepted.' : 'Installation cancelled.'); setInstallPrompt(null);
  }
  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError(''); setResult(null); setActiveTab('overview');
    const registrationNumber = form.registrationNumber.replace(/[^a-zA-Z0-9]/g,'').toUpperCase();
    if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/.test(registrationNumber) && !['SB00SA0001','SB00SA0002','SB00SA0004'].includes(registrationNumber)) { setError('Enter a valid Indian registration number, e.g. MH12AB1234.'); setLoading(false); return; }
    try {
      const response = await fetch('/api/rc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({registrationNumber,chassisNumber:form.chassisNumber.trim(),engineNumber:form.engineNumber.trim()})});
      const data = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(data.error || 'Unable to verify this vehicle.');
      if (!data.result) throw new Error('No vehicle record was returned by the provider.');
      setResult(data.result);
    } catch(err) { setError(err instanceof Error ? err.message : 'Vehicle verification failed.'); }
    finally { setLoading(false); }
  }
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = encodeURIComponent('Explore VAHAN AI vehicle verification: '+shareUrl);
  const value = (v?:string) => v && v !== 'Not available' && v !== 'Not supplied' ? v : 'Not supplied by provider';
  const field = (label:string,v?:string) => <div className="detail-row" key={label}><span>{label}</span><strong>{value(v)}</strong></div>;

  return <main className="vahan-app">
    <header className="topbar">
      <a className="brand" href="/" aria-label="Vahan AI home"><span className="brand-symbol">V</span><span><b>VAHAN <i>AI</i></b><small>Independent Vehicle Information Platform</small></span></a>
      <button className="install-btn" onClick={installApp}>＋ Install app</button>
    </header>
    {installMessage && <p className="install-note">{installMessage}</p>}
    <section className="welcome-hero">
      <div className="hero-glow" />
      <div className="hero-copy"><span className="kicker">RC-FIRST VEHICLE INTELLIGENCE</span><h1>Complete Vehicle Insight<br/><em>in One Place</em></h1>
        <p>RC · Owner · Insurance · Claims · Challan · History</p>
        <div className="hero-pills"><span>✓ Provider-connected lookup</span><span>✓ No sample RC data</span></div>
      </div>
      <div className="hero-car" aria-hidden="true">🚙</div>
    </section>
    <section className="lookup-panel">
      <div className="section-heading"><span className="heading-icon">⌕</span><div><h2>Find your vehicle</h2><p>Enter registration number to fetch available provider records. Sandbox fixture numbers are synthetic.</p></div></div>
      <form className="lookup-form" onSubmit={handleSubmit}>
        <label className="registration-input"><span>🇮🇳</span><input aria-label="Vehicle registration number" value={form.registrationNumber} onChange={e=>setForm({...form,registrationNumber:e.target.value.toUpperCase()})} placeholder="e.g. MH12AB1234" maxLength={15} autoCapitalize="characters" required/><button type="submit" disabled={loading}>{loading?'…':'⌕'}</button></label>
        <div className="optional-fields"><input aria-label="Chassis number optional" placeholder="Chassis number (optional)" value={form.chassisNumber} onChange={e=>setForm({...form,chassisNumber:e.target.value.toUpperCase()})}/><input aria-label="Engine number optional" placeholder="Engine number (optional)" value={form.engineNumber} onChange={e=>setForm({...form,engineNumber:e.target.value.toUpperCase()})}/></div>
        <button className="verify-btn" type="submit" disabled={loading}>{loading?'Verifying vehicle…':'Verify vehicle →'}</button>
      </form>
      <div className="quick-actions"><span>🎙 Voice search (coming soon)</span><span>▦ Scan RC (coming soon)</span><span>☁ Upload RC (coming soon)</span></div>
      <a className="share-link" href={'https://wa.me/?text='+shareText} target="_blank" rel="noreferrer">Share VAHAN AI with partners on WhatsApp ↗</a>
    </section>
    {error && <div className="error-banner" role="alert">{error}</div>}
    {!result ? <section className="feature-grid">
      {[['🚘','RC Details','Vehicle registration information'],['♙','Owner Details','Owner information where available'],['🛡','Insurance History','Previous policy and validity details'],['✚','Claim Support & History','Claim information when supplied'],['₹','Challan Details','Traffic challan information'],['☑','Fitness & PUC','Fitness and pollution validity'],['↺','Ownership History','Available ownership record'],['⌂','Hypothecation / Finance','Financier information'],['▤','Vehicle Report','AI-assisted vehicle summary']].map(([icon,title,desc])=><article className="feature-tile" key={title}><span>{icon}</span><b>{title}</b><small>{desc}</small></article>)}
    </section> : <section className="vehicle-section" aria-live="polite">
      <div className="vehicle-banner"><div className="vehicle-avatar">🚙</div><div className="vehicle-title"><span className="kicker">VERIFICATION RESPONSE</span><h2>{result.registrationNumber}</h2><p>{[result.make,result.model,result.variant].filter(Boolean).join(' ') || 'Vehicle details'}</p><span className="verified-pill">✓ Provider response received</span></div></div>
      <nav className="detail-tabs" aria-label="Vehicle information">{tabs.map(tab=><button key={tab.id} className={activeTab===tab.id?'active':''} onClick={()=>setActiveTab(tab.id)}><span>{tab.icon}</span>{tab.label}</button>)}</nav>
      <div className="detail-panel">
        {activeTab==='overview' && <><h3>🚘 Vehicle Overview</h3><div className="detail-grid">{field('Make & Model',[result.make,result.model].filter(Boolean).join(' '))}{field('Variant',result.variant)}{field('Fuel type',result.fuelType)}{field('Vehicle class',result.vehicleClass)}{field('Registration date',result.registrationDate)}{field('RTO',result.registeredAt)}{field('RC expiry',result.rcExpiryDate)}{field('Vehicle category',result.vehicleCategory)}{field('Body type',result.bodyType)}{field('Engine capacity (cc)',result.cubicCapacity)}{field('Seating capacity',result.seatingCapacity)}{field('Manufactured',result.manufacturedMonthYear)}{field('RC status',result.status)}</div><h3>Validity & Status</h3><div className="status-grid"><div><b>Fitness</b><strong>{value(result.fitnessStatus)}</strong></div><div><b>Insurance</b><strong>{value(result.insuranceStatus)}</strong></div><div><b>PUC</b><strong>{value(result.pucExpiryDate)}</strong></div><div><b>Road tax</b><strong>{value(result.taxValidity)}</strong></div></div></>}
        {activeTab==='rc' && <><h3>▤ Registration Certificate</h3><div className="detail-grid">{field('Registration number',result.registrationNumber)}{field('Registration date',result.registrationDate)}{field('Vehicle class',result.vehicleClass)}{field('Vehicle category',result.vehicleCategory)}{field('Maker / Model',result.model)}{field('Body type',result.bodyType)}{field('Fuel type',result.fuelType)}{field('Colour',result.color)}{field('Chassis number',result.chassisNumber)}{field('Engine number',result.engineNumber)}{field('Engine capacity (cc)',result.cubicCapacity)}{field('Seating capacity',result.seatingCapacity)}{field('Manufactured',result.manufacturedMonthYear)}{field('Registered at (RTO)',result.registeredAt)}{field('RC expiry',result.rcExpiryDate)}{field('Blacklist status',result.blacklistStatus)}{field('Fitness validity',result.fitnessStatus)}{field('PUC validity',result.pucExpiryDate)}{field('Insurance validity',result.insuranceStatus)}</div></>}
        {activeTab==='owner' && <><h3>♙ Registered Owner</h3><div className="detail-grid">{field('Owner name',result.ownerName)}{field('Ownership count',result.ownershipCount)}{field('Financier',result.financier)}</div><p className="data-note">Personal information is shown only when returned by the authorized data provider.</p></>}
        {activeTab==='insurance' && <><h3>🛡 Insurance Details</h3><div className="detail-grid">{field('Insurance validity / status',result.insuranceStatus)}{field('Insurance company',result.insurerName)}{field('Policy number',result.policyNumber)}{field('Policy expiry date',result.insuranceExpiryDate)}</div><p className="data-note">Insurance information depends on the fields returned by the connected RC provider. Missing values are not inferred. A separate insurer/policy-history API may be required for complete previous policy details.</p></>}
        {activeTab==='claims' && <><h3>✚ Claim Information</h3><div className="detail-grid">{field('Claims history',result.claimsHistory)}</div><p className="data-note">Claim records are not guaranteed in an RC response. A permitted insurer or claims-data integration is required to retrieve them.</p></>}
        {activeTab==='history' && <><h3>↺ Vehicle History</h3><div className="detail-grid">{field('Ownership count',result.ownershipCount)}{field('Registration date',result.registrationDate)}{field('Financier / hypothecation',result.financier)}</div><p className="data-note">Only history fields supplied by the provider can be displayed here.</p></>}
        <div className="source-note">Data source: {result.source || 'Configured provider'} · Status: {result.status}{result.referenceId ? ' · Reference: '+result.referenceId : ''}</div>
        {result.source === 'stampmitra_rc' ? <p className="data-note">Sandbox mode: StampMitra returns synthetic sample data, not a real vehicle record.</p> : null}{result.warnings?.length ? <ul className="warning-list">{result.warnings.map(w=><li key={w}>{w}</li>)}</ul>:null}
      </div>
    </section>}
    <footer className="bottom-nav"><a className="selected" href="#top">⌂<small>Home</small></a><a href="#lookup">🚘<small>My Vehicles</small></a><a className="ask-ai" href="mailto:ai.partnerhubs@gmail.com">✦<small>Ask AI</small></a><a href="#alerts">♡<small>Alerts</small></a><a href="#profile">♙<small>Profile</small></a></footer>
    <footer className="legal-footer">VAHAN AI · Independent vehicle information platform · Provider-returned data only. Not a government website.</footer>
  </main>;
}
