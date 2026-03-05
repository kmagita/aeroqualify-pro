import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY    = Deno.env.get("BREVO_API_KEY")!;
const FROM_EMAIL       = "aeroqualify@gmail.com";
const FROM_NAME        = "AeroQualify Pro";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const base = (content: string) => `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f0f4f8;padding:20px;">
  <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #dde3ea;">
    <div style="background:#1a2332;padding:20px 28px;">
      <div style="font-size:20px;font-weight:800;color:#fff;">Aero<span style="color:#0288d1;">Qualify</span> Pro</div>
      <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-top:2px;">Aviation Quality Management System</div>
    </div>
    <div style="padding:28px;">${content}</div>
    <div style="background:#f8fafc;padding:14px 28px;border-top:1px solid #dde3ea;font-size:11px;color:#8fa8c0;text-align:center;">
      AeroQualify Pro - AS9100D / ISO 9001:2015 - Automated notification. Do not reply.
    </div>
  </div>
</div>`;

const row = (label: string, value: string, color?: string) =>
  `<tr><td style="padding:8px 12px;background:#f8fafc;font-size:11px;font-weight:700;color:#5f7285;text-transform:uppercase;width:38%;border:1px solid #dde3ea;vertical-align:top;">${label}</td><td style="padding:8px 12px;font-size:13px;color:${color||'#1a2332'};border:1px solid #dde3ea;vertical-align:top;">${value||'--'}</td></tr>`;

async function sendEmail(to: string, subject: string, html: string) {
  if(!BREVO_API_KEY) return;
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
  if(!res.ok) throw new Error(`Brevo error: ${await res.text()}`);
}

serve(async () => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const twoDaysFromNow = new Date(today); twoDaysFromNow.setDate(twoDaysFromNow.getDate()+2);
    const todayStr = today.toISOString().split("T")[0];
    const reminderStr = twoDaysFromNow.toISOString().split("T")[0];

    // Fetch all open CARs with due dates
    const { data: cars } = await supabase
      .from("cars")
      .select("*")
      .in("status", ["Open","In Progress","Pending Verification","Returned for Resubmission","Overdue"]) // fetch all open
      .not("due_date", "is", null);

    if(!cars || cars.length === 0) {
      return new Response(JSON.stringify({ ok:true, processed:0 }), { status:200 });
    }

    // Fetch managers for email lookup
    const { data: managers } = await supabase.from("responsible_managers").select("*");

    let sent = 0;
    let overdueUpdated = 0;

    for(const car of cars) {
      const dueDate = car.due_date; // YYYY-MM-DD
      const rm = managers?.find((m:Record<string,string>) => m.role_title === car.responsible_manager);
      const rmEmail = rm?.email;

      // ── Auto-mark as Overdue ──────────────────────────────
      if(dueDate < todayStr && ["Open","In Progress"].includes(car.status)) {
        await supabase.from("cars").update({
          status: "Overdue",
          updated_at: new Date().toISOString(),
        }).eq("id", car.id);
        overdueUpdated++;

        // Send overdue notification
        if(rmEmail) {
          const html = base(`
            <h2 style="color:#c62828;margin:0 0 6px;font-size:18px;">CAR Now Overdue - Escalation Risk</h2>
            <p style="color:#5f7285;font-size:13px;margin:0 0 20px;">The following CAR has passed its due date and is now considered <strong>Overdue</strong>. This is liable for escalation to the Accountable Manager.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              ${row('CAR Number', car.id)}
              ${row('Severity', car.severity, car.severity==='Critical'?'#c62828':car.severity==='Major'?'#e65100':'#00695c')}
              ${row('Department', car.department)}
              ${row('Due Date', dueDate, '#c62828')}
              ${row('Days Overdue', `${Math.abs(Math.floor((today.getTime()-new Date(dueDate).getTime())/(1000*60*60*24)))} day(s)`, '#c62828')}
              ${row('Finding', car.finding_description)}
            </table>
            <div style="padding:12px 16px;background:#ffebee;border-left:4px solid #c62828;border-radius:4px;font-size:12px;color:#5f7285;">
              <strong>Immediate action required.</strong> Please log in to AeroQualify Pro and submit or update your Corrective Action Plan. Continued non-compliance will be escalated to the Accountable Manager.
            </div>
          `);
          await sendEmail(rmEmail, `[AeroQualify] OVERDUE CAR - Escalation Risk: ${car.id}`, html);
          sent++;
        }
      }

      // ── 2-day reminder ───────────────────────────────────
      if(dueDate === reminderStr && car.status !== "Overdue") {
        if(rmEmail) {
          const html = base(`
            <h2 style="color:#e65100;margin:0 0 6px;font-size:18px;">CAR Due in 2 Days - Reminder</h2>
            <p style="color:#5f7285;font-size:13px;margin:0 0 20px;">This is a reminder that the following CAR is due in <strong>2 days</strong>. Please ensure your Corrective Action Plan is submitted before the due date.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              ${row('CAR Number', car.id)}
              ${row('Severity', car.severity, car.severity==='Critical'?'#c62828':car.severity==='Major'?'#e65100':'#00695c')}
              ${row('Department', car.department)}
              ${row('Due Date', dueDate, '#e65100')}
              ${row('Current Status', car.status)}
              ${row('Finding', car.finding_description)}
            </table>
            <div style="padding:12px 16px;background:#fff3e0;border-left:4px solid #f57f17;border-radius:4px;font-size:12px;color:#5f7285;">
              <strong>Action required:</strong> Log in to AeroQualify Pro and submit your Corrective Action Plan before the due date to avoid escalation.
            </div>
          `);
          await sendEmail(rmEmail, `[AeroQualify] Reminder - CAR Due in 2 Days: ${car.id}`, html);
          sent++;
        }
      }
    }

    return new Response(JSON.stringify({ ok:true, sent, overdueUpdated }), {
      headers: { "Content-Type":"application/json" },
    });

  } catch(err) {
    console.error("car-reminders error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status:500 });
  }
});
