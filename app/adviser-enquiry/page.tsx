"use client";

import { useState } from "react";

const documentTypes = [
  { id: "photo", label: "Recent passport-size photograph", required: true, note: "Clear face photo" },
  { id: "pan", label: "PAN card", required: true, note: "For identity and onboarding checks" },
  { id: "tenth", label: "10th class pass certificate / marksheet", required: true, note: "Minimum education proof; upload a clear certificate or marksheet" },
  { id: "address", label: "Address / identity proof", required: true, note: "Masked Aadhaar where accepted, or another accepted proof" },
  { id: "bank", label: "Bank proof / cancelled cheque", required: true, note: "Name and account details should be readable" },
  { id: "licence", label: "Existing IRDAI / insurance qualification", required: false, note: "If already licensed or qualified" },
  { id: "other", label: "Other supporting document", required: false, note: "Only if requested by the onboarding team" },
];

export default function AdviserEnquiryPage() {
  const [form, setForm] = useState({ fullName: "", mobile: "", email: "", city: "", state: "Maharashtra", education: "10th pass", experience: "New to insurance", interest: "Motor insurance", message: "" });
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);

  const requiredDocsReady = documentTypes.filter((d) => d.required).every((d) => (files[d.id]?.length ?? 0) > 0);
  function update(key: string, value: string) { setForm((old) => ({ ...old, [key]: value })); }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(form.mobile.replace(/\D/g, ""))) { setNotice("कृपया 10 अंकों का सही भारतीय mobile number दर्ज करें।"); return; }
    if (!requiredDocsReady) { setNotice("कृपया सभी आवश्यक दस्तावेज़ चुनें।"); return; }
    if (!consent) { setNotice("आगे बढ़ने के लिए consent आवश्यक है।"); return; }
    setSending(true);
    try {
      const response = await fetch("/api/adviser-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mobile: form.mobile.replace(/\D/g, ""), documents: Object.entries(files).map(([type, selected]) => ({ type, files: selected.map((file) => ({ name: file.name, size: file.size, mimeType: file.type })) })), consent: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Enquiry notification service is not configured yet.");
      setNotice("आपकी enquiry receive हो गई है। हमारी टीम आपसे संपर्क करेगी।");
      setForm({ fullName: "", mobile: "", email: "", city: "", state: "Maharashtra", education: "10th pass", experience: "New to insurance", interest: "Motor insurance", message: "" });
      setFiles({});
      setConsent(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Enquiry submit नहीं हो पाई। कृपया बाद में कोशिश करें।");
    } finally { setSending(false); }
  }

  return (
    <main className="adviser-app">
      <header className="adviser-top"><a href="/" className="adviser-brand">✦ VAHAN <b>AI</b></a><nav><a href="/">Home</a><a href="/smart-motor-claim">Smart Motor Claim</a></nav></header>
      <section className="adviser-hero"><span className="adviser-kicker">SMART INSURANCE • PBPARTNERS</span><h1>Start your journey as an <em>Insurance Adviser.</em></h1><p>Interested in joining the PBPartners network? Submit your details and required documents, including minimum 10th class education proof, for an onboarding enquiry.</p><div className="adviser-pills"><span>Partner opportunity</span><span>Guided onboarding</span><span>Mobile-first enquiry</span></div></section>
      <section className="adviser-info"><b>How it works</b><p>Share your contact details → our team reviews your enquiry → we contact you about eligibility, documentation and the official onboarding process. Submitting this form is an enquiry only; it does not grant an insurance licence or appointment.</p></section>
      <form className="adviser-form" onSubmit={submit}>
        <div className="adviser-heading"><div><span className="adviser-kicker">STEP 01</span><h2>Your contact details</h2><p>Mobile number and email address are required so our team can contact you.</p></div><span className="adviser-step">PARTNER ENQUIRY</span></div>
        <div className="adviser-fields">
          <label>Full name *<input required value={form.fullName} onChange={e=>update("fullName",e.target.value)} placeholder="As per identity proof" /></label>
          <label>Mobile number *<input required inputMode="numeric" maxLength={10} value={form.mobile} onChange={e=>update("mobile",e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="10-digit mobile number" /></label>
          <label>Email address *<input required type="email" value={form.email} onChange={e=>update("email",e.target.value)} placeholder="name@example.com" /></label>
          <label>City / district *<input required value={form.city} onChange={e=>update("city",e.target.value)} placeholder="Your city or district" /></label>
          <label>State<input value={form.state} onChange={e=>update("state",e.target.value)} /></label>
          <label>Minimum education<select required value={form.education} onChange={e=>update("education",e.target.value)}><option>10th pass</option><option>12th pass</option><option>Graduate</option><option>Postgraduate</option></select></label>
          <label>Insurance experience<select value={form.experience} onChange={e=>update("experience",e.target.value)}><option>New to insurance</option><option>Existing insurance adviser</option><option>POSP / agent</option><option>Other financial services experience</option></select></label>
          <label>Interested in<select value={form.interest} onChange={e=>update("interest",e.target.value)}><option>Motor insurance</option><option>Health insurance</option><option>Life / term insurance</option><option>Multiple insurance products</option></select></label>
          <label className="adviser-wide">Additional information<textarea rows={3} value={form.message} onChange={e=>update("message",e.target.value)} placeholder="Tell us about your experience or preferred time to contact you" /></label>
        </div>
        <div className="adviser-heading adviser-doc-heading"><div><span className="adviser-kicker">STEP 02</span><h2>Required documents</h2><p>Choose clear images or PDF files. Final requirements will be confirmed by the authorised onboarding team.</p></div><span className="adviser-step">DOCUMENTS</span></div>
        <div className="adviser-docs">{documentTypes.map(doc=><article className="adviser-doc" key={doc.id}><div><b>{doc.label}</b><span className={doc.required?"adviser-required":"adviser-optional"}>{doc.required?"Required for enquiry":"If applicable"}</span></div><p>{doc.note}</p><label className="adviser-upload">＋ Choose file(s)<input type="file" accept="image/*,.pdf" multiple onChange={e=>{const selected=e.target.files?Array.from(e.target.files):[];setFiles(old=>({...old,[doc.id]:[...(old[doc.id]??[]),...selected]}));}} /></label>{(files[doc.id]??[]).map((file,i)=><div className="adviser-file" key={file.name+i}>{file.name}<button type="button" onClick={()=>setFiles(old=>({...old,[doc.id]:(old[doc.id]??[]).filter((_,n)=>n!==i)}))}>Remove</button></div>)}</article>)}</div>
        <div className="adviser-privacy"><b>Privacy note</b><p>Do not upload OTPs, PINs or passwords. Prefer masked Aadhaar where accepted. Collect only documents requested for the applicable onboarding process. This form currently sends document names and contact details to the enquiry notification endpoint; secure document storage and upload must be enabled before actual document files can be transmitted.</p></div>
        <label className="adviser-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} /> I consent to being contacted about this PBPartners adviser enquiry and to the use of the information I submit for enquiry review.</label>
        <button className="adviser-submit" disabled={sending}>{sending?"Submitting…":"Submit adviser enquiry →"}</button>
        {notice&&<div className="adviser-notice" role="status">{notice}</div>}
      </form>
      <footer className="adviser-footer"><a href="/">← Back to VAHAN AI</a><span>VAHAN AI • Smart Insurance Enquiry</span></footer>
    </main>
  );
}
