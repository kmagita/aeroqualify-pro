import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL     = Deno.env.get("FROM_EMAIL") || "qms@yourcompany.com";
const TEAM_EMAILS    = (Deno.env.get("TEAM_EMAILS") || "").split(",").filter(Boolean);

const base = (content) => `
<div style="font-family:'Segoe UI',sans-serif;max-width:580px;margin:0 auto;background:#f0f4f8;padding:20px">
  <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #dde3ea">
    <div style="background:linear-gradient(135deg,#01579b,#0277bd);padding:20px 24px;display:flex;align-items:center;gap:12px">
      <span style="font-size:28px">✈</span>
      <div>
        <div style="color:#fff;font-size:18px;font-weight:700;letter-spacing:0.5px">AeroQualify Pro</div>
        <div style="color:rgba(255,255,255,0.7);font-size:11px">Aviation Quality Management System</div>
      </div>
    </div>
    <div style="padding:24px">${content}</div>
    <div style="padding:12px 24px;background:#f5f8fc;border-top:1px solid #dde3ea;font-size:11px;color:#8fa0b0;text-align:center">
      AS9100D · ISO 9001:2015 · This is an automated notification from AeroQualify Pro
    </div>
  </div>
</div>`;

const row = (label, value, highlight) =>
  `<tr><td style="padding:7px 0;font-size:12px;color:#5f7285;width:140px;vertical-align:top">${label}</td><td style="padding:7px 0;font-size:13px;color:${highlight||'#1a2332'};font-weight:${highlight?'600':'400'}">${value||'—'}</td></tr>`;

const templates = {
  new_car: (r) => ({
    subject: `[AeroQualify] New CAR Raised: ${r.id} — ${r.severity} Severity`,
    html: base(`
      <h2 style="color:#01579b;margin:0 0 4px;font-size:18px">New Corrective Action Request</h2>
      <p style="color:#5f7285;font-size:13px;margin:0 0 20px">A new CAR has been raised and assigned to you for action.</p>
      <div style="background:#e3f2fd;border-radius:8px;padding:14px 16px;margin-bottom:20px">
        <div style="font-family:monospace;font-size:16px;font-weight:700;color:#01579b">${r.id}</div>
        <div style="font-size:13px;color:#1a2332;margin-top:4px">${r.finding_description||'—'}</div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${row('QMS Clause', r.qms_clause)}
        ${row('Severity', r.severity, r.severity==='Critical'?'#c62828':r.severity==='Major'?'#e65100':'#00695c')}
        ${row('Department', r.department)}
        ${row('Raised By', r.raised_by_name)}
        ${row('Due Date', r.due_date)}
      </table>
      <div style="margin-top:20px;padding:12px 16px;background:#fff3e0;border-radius:8px;font-size:12px;color:#e65100">
        <strong>Action Required:</strong> Please log in to AeroQualify Pro to complete the Corrective Action Plan (CAP) form.
      </div>
    `),
  }),

  cap_submitted: (r) => ({
    subject: `[AeroQualify] CAP Submitted for Verification: ${r.car_id||r.id}`,
    html: base(`
      <h2 style="color:#4527a0;margin:0 0 4px;font-size:18px">CAP Ready for Verification</h2>
      <p style="color:#5f7285;font-size:13px;margin:0 0 20px">A Corrective Action Plan has been submitted and is pending your verification.</p>
      <div style="background:#ede7f6;border-radius:8px;padding:14px 16px;margin-bottom:20px">
        <div style="font-family:monospace;font-size:16px;font-weight:700;color:#4527a0">${r.car_id||r.id}</div>
        <div style="font-size:13px;color:#1a2332;margin-top:4px">${r.finding_description||'—'}</div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        ${row('QMS Clause', r.qms_clause)}
        ${row('Immediate Action', r.immediate_action)}
        ${row('Root Cause', r.root_cause_analysis)}
        ${row('Corrective Action', r.corrective_action)}
        ${row('Preventive Action', r.preventive_action)}
        ${row('Evidence', r.evidence_filename)}
      </table>
      <div style="margin-top:20px;padding:12px 16px;background:#e8f5e9;border-radius:8px;font-size:12px;color:#2e7d32">
        <strong>Action Required:</strong> Please log in to AeroQualify Pro to review and verify this CAP.
      </div>
    `),
  }),

  verification_submitted: (r) => ({
    subject: `[AeroQualify] CAPA Verification Complete: ${r.car_id||r.id} — ${r.status}`,
    html: base(`
      <h2 style="color:${r.status==='Closed'?'#2e7d32':'#e65100'};margin:0 0 4px;font-size:18px">CAPA Verification: ${r.status}</h2>
      <p style="color:#5f7285;font-size:13px;margin:0 0 20px">The Quality Manager has completed verification of the CAPA for finding ${r.car_id||r.id}.</p>
      <table style="width:100%;border-collapse:collapse">
        ${row('CAR Number', r.car_id||r.id)}
        ${row('Final Status', r.status, r.status==='Closed'?'#2e7d32':'#c62828')}
        ${row('Effectiveness', r.effectiveness_rating)}
        ${row('Verified By', r.verified_by_name)}
        ${row('Comments', r.verifier_comments)}
      </table>
    `),
  }),
};

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) { console.log("No RESEND_API_KEY — skipped"); return; }
  const toArr = Array.isArray(to) ? to : [to];
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_EMAIL, to: toArr, subject, html }),
  });
}

serve(async (req) => {
  try {
    const { type, record, recipients } = await req.json();
    const template = templates[type]?.(record);
    if (!template) return new Response("Unknown type", { status: 400 });
    const to = [...new Set([...TEAM_EMAILS, ...(recipients||[])])].filter(Boolean);
    if (to.length) await sendEmail(to, template.subject, template.html);
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
