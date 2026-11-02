export default function OfflinePage() {
  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#080d1b",color:"#f4f6ff",fontFamily:"Arial,sans-serif",textAlign:"center"}}>
      <section style={{maxWidth:440}}>
        <div style={{fontSize:56}}>✦</div>
        <h1>You&apos;re offline</h1>
        <p style={{color:"#aab5d1",lineHeight:1.7}}>Your VAHAN AI app is installed, but live vehicle verification, claim services and enquiry submission need an internet connection.</p>
        <a href="/" style={{display:"inline-block",marginTop:16,padding:"12px 18px",borderRadius:10,background:"#426bdb",color:"white",textDecoration:"none"}}>Try again</a>
      </section>
    </main>
  );
}
