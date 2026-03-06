import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "";
const FROM_EMAIL    = "aeroqualify@gmail.com";
const FROM_NAME     = "AeroQualify Pro";

const base = (content: string) => `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f0f4f8;padding:20px;">
  <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #dde3ea;">
    <div style="background:#1a2332;paddinimport { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "";
const FROM_EMAIL    = "aeroqualify@gmail.com";
const FROM_NAME     = "AeroQualify Pro";

const base = (content: string) => `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f0f4f8;padding:20px;">
  <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #dde3ea;">
    <div style="background:#1a2332;padding:20px 28px;">
      <div style="font-size:20px;font-weight:800;color:#fff;">Aero<span style="color:#0288d1;">Qualify</span> Pro</div>
      <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-top:2px;">Aviation Quality Management System</div>
    </div>
    <div style="padding:28px;">${content}</div>
    <div style="background:#f8fafc;padding:14px 28px;border-top:1px solid #dde3ea;font-size:11px;color:#8fa8c0;text-align:center;">
      AeroQualify Pro - AS9100D / ISO 9001:2015 - This is an automated notification.
    </div>
  </div>
</div>`;

const row = (label: string, value: string, color?: string) =>
  `<tr><td style="padding:8px 12px;background:#f8fafc;font-size:11px;font-weight:700;color:#5f7285;text-transform:uppercase;width:38%;border:1px solid #dde3ea;vertical-align:top;">${label}</td><td style="padding:8px 12px;font-size:13px;color:${color||'#1a2332'};border:1px solid #dde3ea;vertical-align:top;">${value||'--'}</td></tr>`;

const templates: Record<string, (r: Record<string,string>) => {subject:string; html:string}> = {

  car_raised: (r) => ({
    subject: `[AeroQualify] New CAR: ${r.id} - ${r.severity} Severity`,
    html: base(`
      <h2 style="color:#c62828;margin:0 0 6px;font-size:18px;">New Corrective Action Request</h2>
      <p style="color:#5f7285;font-size:13px;margin:0 0 20px;">A new CAR has been raised and requires your action.</p>
      <div style="background:#e3f2fd;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-family:monospace;font-size:15px;font-weight:700;color:#01579b;">${r.id}</div>
        <div style="font-size:13px;color:#1a2332;margin-top:6px;">${r.finding_description||'--'}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${row('Severity', r.severity, r.severity==='Critical'?'#c62828':r.severity==='Major'?'#e65100':'#00695c')}
        ${row('Department', r.department)}
        ${row('Assigned To', r.responsible_manager)}
        ${row('Due Date', r.due_date)}
        ${row('QMS Clause', r.qms_clause)}
        ${row('Raised By', r.raised_by_name)}
      </table>
      <div style="padding:12px 16px;background:#fff3e0;border-left:4px solid #f57f17;border-radius:4px;font-size:12px;color:#5f7285;">
        <strong>Action Required:</strong> Log in to AeroQualify Pro to submit your Corrective Action Plan.
      </div>
    `),
  }),

  cap_submitted: (r) => ({
    subject: `[AeroQualify] CAP Ready for Verification: ${r.id}`,
    html: base(`
      <h2 style="color:#4527a0;margin:0 0 6px;font-size:18px;">CAP Submitted - Awaiting Verification</h2>
      <p style="color:#5f7285;font-size:13px;margin:0 0 20px;">A Corrective Action Plan has been submitted and is pending your review.</p>
      <div style="background:#ede7f6;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-family:monospace;font-size:15px;font-weight:700;color:#4527a0;">${r.id}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${row('Submitted By', r.submitted_by_name)}
        ${row('Root Cause', r.root_cause)}
        ${row('Corrective Action', r.corrective_action)}
        ${row('Evidence', r.evidence_filename)}
      </table>
      <div style="padding:12px 16px;background:#e8f5e9;border-left:4px solid #2e7d32;border-radius:4px;font-size:12px;color:#5f7285;">
        <strong>Action Required:</strong> Log in to AeroQualify Pro to verify this CAP and close the CAR.
      </div>
    `),
  }),

  verification_submitted: (r) => ({
    subject: `[AeroQualify] CAPA Verified: ${r.id} - ${r.status}`,
    html: base(`
      <h2 style="color:${r.status==='Closed'?'#2e7d32':'#e65100'};margin:0 0 6px;font-size:18px;">CAPA Verification: ${r.status}</h2>
      <p style="color:#5f7285;font-size:13px;margin:0 0 20px;">The Quality Manager has completed verification of your CAPA.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${row('CAR Number', r.id)}
        ${row('Final Status', r.status, r.status==='Closed'?'#2e7d32':'#c62828')}
        ${row('Effectiveness Rating', r.effectiveness_rating)}
        ${row('Verified By', r.verified_by_name)}
        ${row('Comments', r.comments)}
      </table>
    `),
  }),

  returned_for_resubmission: (r) => ({
    subject: `[AeroQualify] CAP Returned for Resubmission: ${r.id}`,
    html: base(`
      <h2 style="color:#c62828;margin:0 0 6px;font-size:18px;">CAP Returned - Action Required</h2>
      <p style="color:#5f7285;font-size:13px;margin:0 0 20px;">Your CAP has been reviewed and returned. Please revise and resubmit.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${row('CAR Number', r.id)}
        ${row('Effectiveness Rating', 'Not Effective', '#c62828')}
        ${row('QM Comments', r.comments)}
      </table>
      <div style="padding:12px 16px;background:#ffebee;border-left:4px solid #c62828;border-radius:4px;font-size:12px;color:#5f7285;">
        <strong>Action Required:</strong> Log in to AeroQualify Pro, review the QM comments, and resubmit your CAP.
      </div>
    `),
  }),


  audit_scheduled: (r) => ({
    subject: `[AeroQualify] Audit Notification: ${r.area} — ${r.planned_date||'Date TBC'}`,
    html: base(`
      <h2 style="color:#01579b;margin:0 0 6px;font-size:18px;">Audit Notification</h2>
      <p style="color:#5f7285;font-size:13px;margin:0 0 20px;">The following audit has been scheduled. Please ensure all relevant records, documentation and personnel are available on the date of audit.</p>
      <div style="background:#e3f2fd;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-size:15px;font-weight:700;color:#01579b;">${r.area}</div>
        <div style="font-size:12px;color:#5f7285;margin-top:4px;">${r.audit_type||'Internal'} Audit · ${r.year} Programme · Slot #${r.slot}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${row('Planned Date', r.planned_date||'TBC', '#01579b')}
        ${row('Lead Auditor', r.lead_auditor||'TBC')}
        ${row('Opening Brief', r.opening_brief||'TBC')}
        ${row('Closing Brief', r.closing_brief||'TBC')}
        ${row('Audit Criteria', r.audit_criteria||'AS9100D / KCAA ANO / Quality Manual')}
        ${row('Scope', r.notes||'As per Annual Audit Programme')}
      </table>
      <div style="padding:12px 16px;background:#e3f2fd;border-left:4px solid #01579b;border-radius:4px;font-size:12px;color:#5f7285;">
        <strong>Note:</strong> This notification is issued at least 7 days prior to the audit date per Quality Manual requirements. A formal Audit Notification Form (QMS 002) will be issued separately.
      </div>
    `),
  }),

};

async function sendEmail(to: string, subject: string, html: string) {
  if (!BREVO_API_KEY) { console.warn("No BREVO_API_KEY set"); return; }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": BREVO_API_KEY },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error(`Brevo error ${res.status}: ${await res.text()}`);
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }});

  try {
    const { type, record, recipients } = await req.json();
    const tmplFn = templates[type];
    if (!tmplFn) return new Response(JSON.stringify({ ok:true, skipped:true }), { status:200 });
    const { subject, html } = tmplFn(record || {});
    const toList = (recipients || []).filter(Boolean);
    if (toList.length === 0) return new Response(JSON.stringify({ ok:true, message:"No recipients" }), { status:200 });
    await Promise.all(toList.map((email: string) => sendEmail(email, subject, html)));
    return new Response(JSON.stringify({ ok:true, sent:toList.length }), {
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" },
    });
  } catch (err) {
    console.error("send-notification error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" },
    });
  }
});g:20px 28px;">
      <div style="font-size:20px;font-weight:800;color:#fff;">Aero<span style="color:#0288d1;">Qualify</span> Pro</div>
      <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-top:2px;">Aviation Quality Management System</div>
    </div>
    <div style="padding:28px;">${content}</div>
    <div style="background:#f8fafc;padding:14px 28px;border-top:1px solid #dde3ea;font-size:11px;color:#8fa8c0;text-align:center;">
      AeroQualify Pro - AS9100D / ISO 9001:2015 - This is an automated notification.
    </div>
  </div>
</div>`;

const row = (label: string, value: string, color?: string) =>
  `<tr><td style="padding:8px 12px;background:#f8fafc;font-size:11px;font-weight:700;color:#5f7285;text-transform:uppercase;width:38%;border:1px solid #dde3ea;vertical-align:top;">${label}</td><td style="padding:8px 12px;font-size:13px;color:${color||'#1a2332'};border:1px solid #dde3ea;vertical-align:top;">${value||'--'}</td></tr>`;

const templates: Record<string, (r: Record<string,string>) => {subject:string; html:string}> = {

  car_raised: (r) => ({
    subject: `[AeroQualify] New CAR: ${r.id} - ${r.severity} Severity`,
    html: base(`
      <h2 style="color:#c62828;margin:0 0 6px;font-size:18px;">New Corrective Action Request</h2>
      <p style="color:#5f7285;font-size:13px;margin:0 0 20px;">A new CAR has been raised and requires your action.</p>
      <div style="background:#e3f2fd;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-family:monospace;font-size:15px;font-weight:700;color:#01579b;">${r.id}</div>
        <div style="font-size:13px;color:#1a2332;margin-top:6px;">${r.finding_description||'--'}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${row('Severity', r.severity, r.severity==='Critical'?'#c62828':r.severity==='Major'?'#e65100':'#00695c')}
        ${row('Department', r.department)}
        ${row('Assigned To', r.responsible_manager)}
        ${row('Due Date', r.due_date)}
        ${row('QMS Clause', r.qms_clause)}
        ${row('Raised By', r.raised_by_name)}
      </table>
      <div style="padding:12px 16px;background:#fff3e0;border-left:4px solid #f57f17;border-radius:4px;font-size:12px;color:#5f7285;">
        <strong>Action Required:</strong> Log in to AeroQualify Pro to submit your Corrective Action Plan.
      </div>
    `),
  }),

  cap_submitted: (r) => ({
    subject: `[AeroQualify] CAP Ready for Verification: ${r.id}`,
    html: base(`
      <h2 style="color:#4527a0;margin:0 0 6px;font-size:18px;">CAP Submitted - Awaiting Verification</h2>
      <p style="color:#5f7285;font-size:13px;margin:0 0 20px;">A Corrective Action Plan has been submitted and is pending your review.</p>
      <div style="background:#ede7f6;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-family:monospace;font-size:15px;font-weight:700;color:#4527a0;">${r.id}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${row('Submitted By', r.submitted_by_name)}
        ${row('Root Cause', r.root_cause)}
        ${row('Corrective Action', r.corrective_action)}
        ${row('Evidence', r.evidence_filename)}
      </table>
      <div style="padding:12px 16px;background:#e8f5e9;border-left:4px solid #2e7d32;border-radius:4px;font-size:12px;color:#5f7285;">
        <strong>Action Required:</strong> Log in to AeroQualify Pro to verify this CAP and close the CAR.
      </div>
    `),
  }),

  verification_submitted: (r) => ({
    subject: `[AeroQualify] CAPA Verified: ${r.id} - ${r.status}`,
    html: base(`
      <h2 style="color:${r.status==='Closed'?'#2e7d32':'#e65100'};margin:0 0 6px;font-size:18px;">CAPA Verification: ${r.status}</h2>
      <p style="color:#5f7285;font-size:13px;margin:0 0 20px;">The Quality Manager has completed verification of your CAPA.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${row('CAR Number', r.id)}
        ${row('Final Status', r.status, r.status==='Closed'?'#2e7d32':'#c62828')}
        ${row('Effectiveness Rating', r.effectiveness_rating)}
        ${row('Verified By', r.verified_by_name)}
        ${row('Comments', r.comments)}
      </table>
    `),
  }),

  returned_for_resubmission: (r) => ({
    subject: `[AeroQualify] CAP Returned for Resubmission: ${r.id}`,
    html: base(`
      <h2 style="color:#c62828;margin:0 0 6px;font-size:18px;">CAP Returned - Action Required</h2>
      <p style="color:#5f7285;font-size:13px;margin:0 0 20px;">Your CAP has been reviewed and returned. Please revise and resubmit.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${row('CAR Number', r.id)}
        ${row('Effectiveness Rating', 'Not Effective', '#c62828')}
        ${row('QM Comments', r.comments)}
      </table>
      <div style="padding:12px 16px;background:#ffebee;border-left:4px solid #c62828;border-radius:4px;font-size:12px;color:#5f7285;">
        <strong>Action Required:</strong> Log in to AeroQualify Pro, review the QM comments, and resubmit your CAP.
      </div>
    `),
  }),

};

async function sendEmail(to: string, subject: string, html: string) {
  if (!BREVO_API_KEY) { console.warn("No BREVO_API_KEY set"); return; }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": BREVO_API_KEY },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error(`Brevo error ${res.status}: ${await res.text()}`);
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }});

  try {
    const { type, record, recipients } = await req.json();
    const tmplFn = templates[type];
    if (!tmplFn) return new Response(JSON.stringify({ ok:true, skipped:true }), { status:200 });
    const { subject, html } = tmplFn(record || {});
    const toList = (recipients || []).filter(Boolean);
    if (toList.length === 0) return new Response(JSON.stringify({ ok:true, message:"No recipients" }), { status:200 });
    await Promise.all(toList.map((email: string) => sendEmail(email, subject, html)));
    return new Response(JSON.stringify({ ok:true, sent:toList.length }), {
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" },
    });
  } catch (err) {
    console.error("send-notification error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type":"application/json", "Access-Control-Allow-Origin":"*" },
    });
  }
});
