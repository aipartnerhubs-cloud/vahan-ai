import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 120) : "";
    const mobile = typeof body.mobile === "string" ? body.mobile.replace(/\D/g, "") : "";
    const city = typeof body.city === "string" ? body.city.trim().slice(0, 100) : "";
    const email = typeof body.email === "string" ? body.email.trim().slice(0, 160) : "";
    const education = typeof body.education === "string" ? body.education.trim().slice(0, 40) : "";
    const consent = body.consent === true;
    const documents = Array.isArray(body.documents) ? body.documents : [];
    const requiredTypes = ["photo", "pan", "tenth", "address", "bank"];
    const hasRequiredDocs = requiredTypes.every((type) =>
      documents.some((item: any) => item?.type === type && Array.isArray(item.files) && item.files.length > 0)
    );

    if (!fullName || !/^[6-9]\d{9}$/.test(mobile) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !city || !education || !hasRequiredDocs || !consent) {
      return NextResponse.json({ error: "Please provide valid name, mobile, email, city, education, required document selections and consent." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const recipient = process.env.ADVISER_ENQUIRY_EMAIL;
    const from = process.env.ENQUIRY_FROM_EMAIL;
    if (!apiKey || !recipient || !from) {
      return NextResponse.json({ error: "Enquiry email is not configured yet. Please contact the site administrator." }, { status: 503 });
    }

    const docSummary = documents.map((item: any) => {
      const names = Array.isArray(item.files)
        ? item.files.slice(0, 5).map((file: any) => String(file.name || "").slice(0, 120)).join(", ")
        : "";
      return `${String(item.type || "document").slice(0, 40)}: ${names || "not selected"}`;
    }).join("\n");

    const text = [
      "New VAHAN AI / PBPartners adviser enquiry",
      `Name: ${fullName}`,
      `Mobile: ${mobile}`,
      `Email: ${email}`,
      `Minimum education: ${education}`,
      `City: ${city}`,
      `State: ${String(body.state || "").slice(0, 80)}`,
      `Experience: ${String(body.experience || "").slice(0, 100)}`,
      `Interest: ${String(body.interest || "").slice(0, 100)}`,
      `Message: ${String(body.message || "").slice(0, 1000)}`,
      "Selected document names only (files are not uploaded or attached):",
      docSummary,
    ].join("\n");

    const mail = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [recipient], subject: `New PBPartners Adviser Enquiry — ${fullName}`, text }),
      cache: "no-store",
    });
    if (!mail.ok) return NextResponse.json({ error: "Email notification could not be delivered. Please try again later." }, { status: 502 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid enquiry request." }, { status: 400 });
  }
}
