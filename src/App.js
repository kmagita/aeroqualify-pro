import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, TABLES, logChange, sendNotification } from "./supabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

// ─── Global Styles ──────────────────────────────────────────
const GlobalStyle = () => (
  <>
    <link href="https://fonts.googleapis.com/css2?family=Oxanium:wght@400;500;600;700;800&family=Source+Sans+3:wght@300;400;500;600&family=Source+Code+Pro:wght@400;600&display=swap" rel="stylesheet" />
    <style>{`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #root { height: 100%; }
      body { background: #eef2f7; overflow: hidden; font-family: 'Source Sans 3', sans-serif; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: #e8edf3; }
      ::-webkit-scrollbar-thumb { background: #b0bec5; border-radius: 3px; }
      input, select, textarea { outline: none; font-family: 'Source Sans 3', sans-serif; }
      button { font-family: 'Source Sans 3', sans-serif; cursor: pointer; }
      @keyframes fadeIn  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
      @keyframes slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
      @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
      @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      .nav-item:hover    { background: rgba(1,87,155,0.08) !important; color: #01579b !important; }
      .nav-item.active   { background: rgba(1,87,155,0.12) !important; color: #01579b !important; border-left: 3px solid #01579b !important; }
      .row-hover:hover   { background: #f5f8fc !important; }
      .btn-primary:hover { background: #01579b !important; }
      .btn-danger:hover  { background: #c62828 !important; }
      .btn-ghost:hover   { background: #e8edf3 !important; }
      .btn-success:hover { background: #2e7d32 !important; }
      .card { background: #fff; border-radius: 10px; border: 1px solid #dde3ea; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
      .tooltip-wrap { position: relative; cursor: pointer; }
      .tooltip-wrap .tooltip-box { display:none; position:absolute; left:0; top:100%; z-index:500; background:#1a2332; color:#fff; font-size:12px; line-height:1.5; padding:10px 14px; border-radius:8px; min-width:260px; max-width:400px; white-space:pre-wrap; box-shadow:0 4px 20px rgba(0,0,0,0.2); margin-top:4px; }
      .tooltip-wrap:hover .tooltip-box { display:block; animation:fadeIn 0.15s ease; }
    `}</style>
  </>
);

// ─── Theme ───────────────────────────────────────────────────
const T = {
  bg: "#eef2f7", surface: "#fff", card: "#fff",
  border: "#dde3ea", borderDark: "#b0bec5",
  primary: "#01579b", primaryLt: "#e3f2fd", primaryDk: "#003c71",
  green: "#2e7d32", greenLt: "#e8f5e9",
  yellow: "#e65100", yellowLt: "#fff3e0",
  red: "#c62828", redLt: "#ffebee",
  teal: "#00695c", tealLt: "#e0f2f1",
  purple: "#4527a0", purpleLt: "#ede7f6",
  sky: "#0277bd", skyLt: "#e1f5fe",
  text: "#1a2332", muted: "#5f7285", light: "#8fa0b0",
  white: "#ffffff",
};

// ─── Status meta ─────────────────────────────────────────────
const SM = {
  Open:                  { c:T.red,    bg:T.redLt    },
  "In Progress":         { c:T.yellow, bg:T.yellowLt },
  "Pending Verification":{ c:T.purple, bg:T.purpleLt },
  "Pending":             { c:T.yellow, bg:T.yellowLt },
  Overdue:               { c:T.red,    bg:T.redLt    },
  Closed:                { c:T.green,  bg:T.greenLt  },
  Approved:              { c:T.green,  bg:T.greenLt  },
  Completed:             { c:T.green,  bg:T.greenLt  },
  Valid:                 { c:T.green,  bg:T.greenLt  },
  Effective:             { c:T.green,  bg:T.greenLt  },
  Scheduled:             { c:T.teal,   bg:T.tealLt   },
  Draft:                 { c:T.muted,  bg:"#f5f5f5"  },
  "In Review":           { c:T.yellow, bg:T.yellowLt },
  Expired:               { c:T.red,    bg:T.redLt    },
  "Not Effective":       { c:T.red,    bg:T.redLt    },
  Critical:              { c:T.red,    bg:T.redLt    },
  Major:                 { c:T.yellow, bg:T.yellowLt },
  Minor:                 { c:T.teal,   bg:T.tealLt   },
  Corrective:            { c:T.primary,bg:T.primaryLt},
  Preventive:            { c:T.purple, bg:T.purpleLt },
  Internal:              { c:T.primary,bg:T.primaryLt},
  External:              { c:T.purple, bg:T.purpleLt },
  Supplier:              { c:T.teal,   bg:T.tealLt   },
  admin:                 { c:T.red,    bg:T.redLt    },
  quality_manager:       { c:T.primary,bg:T.primaryLt},
  quality_auditor:       { c:T.sky,    bg:T.skyLt    },
  manager:               { c:T.teal,   bg:T.tealLt   },
  viewer:                { c:T.muted,  bg:"#f5f5f5"  },
  "A+":{ c:T.green, bg:T.greenLt }, A:{ c:T.green, bg:T.greenLt },
  B:   { c:T.yellow,bg:T.yellowLt}, C:{ c:T.red,   bg:T.redLt   },
};

const Badge = ({ label }) => {
  if (!label) return null;
  const m = SM[label] || { c: T.muted, bg: "#f5f5f5" };
  return <span style={{ background:m.bg, color:m.c, border:`1px solid ${m.c}33`, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:600, whiteSpace:"nowrap", fontFamily:"'Source Code Pro',monospace" }}>{label}</span>;
};

// ─── Helpers ─────────────────────────────────────────────────
const daysUntil    = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;
const isOverdue    = (d) => { const n=daysUntil(d); return n!==null&&n<0; };
const isApproaching= (d) => { const n=daysUntil(d); return n!==null&&n>=0&&n<=14; };
const fmt          = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—";
const today        = () => new Date().toISOString().slice(0,10);

// ─── Atoms ───────────────────────────────────────────────────
const Input = ({ label, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.muted, letterSpacing:0.8, textTransform:"uppercase", marginBottom:4 }}>{label}</label>}
    <input {...props} style={{ width:"100%", background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", color:T.text, fontSize:13, transition:"border 0.15s", ...props.style }}
      onFocus={e=>e.target.style.borderColor=T.primary} onBlur={e=>e.target.style.borderColor=T.border} />
  </div>
);

const Textarea = ({ label, rows=3, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.muted, letterSpacing:0.8, textTransform:"uppercase", marginBottom:4 }}>{label}</label>}
    <textarea {...props} rows={rows} style={{ width:"100%", background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", color:T.text, fontSize:13, resize:"vertical", fontFamily:"inherit", ...props.style }}
      onFocus={e=>e.target.style.borderColor=T.primary} onBlur={e=>e.target.style.borderColor=T.border} />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom:14 }}>
    {label && <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.muted, letterSpacing:0.8, textTransform:"uppercase", marginBottom:4 }}>{label}</label>}
    <select {...props} style={{ width:"100%", background:"#f8fafc", border:`1px solid ${T.border}`, borderRadius:6, padding:"9px 12px", color:T.text, fontSize:13, ...props.style }}>
      {children}
    </select>
  </div>
);

const Btn = ({ children, variant="primary", size="md", ...props }) => {
  const variants = {
    primary: { background:T.primary, color:"#fff", border:"none" },
    danger:  { background:T.red,     color:"#fff", border:"none" },
    ghost:   { background:"transparent", color:T.muted, border:`1px solid ${T.border}` },
    success: { background:T.green,   color:"#fff", border:"none" },
    outline: { background:"transparent", color:T.primary, border:`1px solid ${T.primary}` },
  };
  const sizes = { sm:{ padding:"5px 12px", fontSize:12 }, md:{ padding:"8px 18px", fontSize:13 }, lg:{ padding:"11px 24px", fontSize:14 } };
  return (
    <button {...props} className={`btn-${variant}`}
      style={{ borderRadius:7, fontWeight:600, transition:"background 0.15s", ...variants[variant], ...sizes[size], ...(props.style||{}) }}>
      {children}
    </button>
  );
};

const Checkbox = ({ label, checked, onChange }) => (
  <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:10 }}>
    <div onClick={onChange} style={{ width:18, height:18, borderRadius:4, border:`2px solid ${checked?T.primary:T.border}`, background:checked?T.primary:"#fff", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s", flexShrink:0 }}>
      {checked && <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>✓</span>}
    </div>
    <span style={{ fontSize:13, color:T.text }}>{label}</span>
  </label>
);

// ─── Section Header ───────────────────────────────────────────
const SectionHeader = ({ title, subtitle, action }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
    <div>
      <h2 style={{ fontFamily:"'Oxanium',sans-serif", fontSize:22, fontWeight:700, color:T.primaryDk, letterSpacing:0.5 }}>{title}</h2>
      {subtitle && <p style={{ fontSize:13, color:T.muted, marginTop:2 }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ─── Card ─────────────────────────────────────────────────────
const Card = ({ children, style, title, action }) => (
  <div className="card" style={{ padding:20, animation:"fadeIn 0.3s ease", ...style }}>
    {title && (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
        <span style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:700, fontSize:15, color:T.primaryDk }}>{title}</span>
        {action}
      </div>
    )}
    {children}
  </div>
);

// ─── Toast ────────────────────────────────────────────────────
const Toast = ({ message, type, onDone }) => {
  useEffect(() => { const t=setTimeout(onDone,3500); return ()=>clearTimeout(t); },[onDone]);
  const colors = { success:T.green, error:T.red, info:T.primary, warning:T.yellow };
  return (
    <div style={{ position:"fixed", bottom:24, right:24, background:"#fff", border:`1px solid ${colors[type]||T.border}`, borderLeft:`4px solid ${colors[type]||T.primary}`, borderRadius:8, padding:"12px 18px", color:T.text, fontSize:13, zIndex:9999, animation:"fadeIn 0.2s ease", boxShadow:"0 4px 20px rgba(0,0,0,0.12)", maxWidth:360 }}>
      {message}
    </div>
  );
};

// ─── Alert Banner ─────────────────────────────────────────────
const AlertBanner = ({ items }) => {
  const [dismissed, setDismissed] = useState(false);
  if (!items.length||dismissed) return null;
  return (
    <div style={{ background:T.yellowLt, borderBottom:`1px solid #ffb74d`, padding:"9px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexShrink:0 }}>
      <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", flex:1 }}>
        <span style={{ fontSize:16 }}>⚠️</span>
        <span style={{ color:T.yellow, fontWeight:700, fontSize:12 }}>ACTION REQUIRED:</span>
        {items.slice(0,4).map((item,i) => (
          <span key={i} style={{ fontSize:12, color:T.text }}>
            <span style={{ color:isOverdue(item.due)?T.red:T.yellow, fontFamily:"'Source Code Pro',monospace", fontWeight:600 }}>{item.id}</span>
            {" — "}<span style={{ color:isOverdue(item.due)?T.red:T.yellow }}>{isOverdue(item.due)?`OVERDUE ${Math.abs(daysUntil(item.due))}d`:`due in ${daysUntil(item.due)}d`}</span>
            {i<Math.min(items.length,4)-1&&<span style={{ color:T.muted }}> · </span>}
          </span>
        ))}
        {items.length>4&&<span style={{ fontSize:12,color:T.muted }}>+{items.length-4} more</span>}
      </div>
      <button onClick={()=>setDismissed(true)} style={{ background:"none", border:"none", color:T.muted, fontSize:18 }}>✕</button>
    </div>
  );
};

// ─── Login ────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [email,setEmail]=useState(""); const [pw,setPw]=useState("");
  const [loading,setLoading]=useState(false); const [err,setErr]=useState(""); const [mode,setMode]=useState("login");
  const handle = async(e) => {
    e.preventDefault(); setLoading(true); setErr("");
    try {
      if(mode==="reset"){
        const{error}=await supabase.auth.resetPasswordForEmail(email);
        if(error)throw error; setErr("✓ Reset link sent — check your email");
      } else if(mode==="signup"){
        const{error}=await supabase.auth.signUp({email,password:pw,options:{data:{full_name:email.split("@")[0]}}});
        if(error)throw error; setErr("✓ Account created — check your email to confirm");
      } else {
        const{data,error}=await supabase.auth.signInWithPassword({email,password:pw});
        if(error)throw error; onLogin(data.user);
      }
    } catch(ex){setErr(ex.message);} setLoading(false);
  };
  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(135deg, #e3f2fd 0%, #f0f4f8 50%, #e8f5e9 100%)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <GlobalStyle />
      {/* Sky horizon decoration */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:4, background:`linear-gradient(90deg,${T.primary},${T.sky},${T.teal})` }} />
      <div style={{ width:400, animation:"fadeIn 0.5s ease" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64, height:64, borderRadius:16, background:`linear-gradient(135deg,${T.primary},${T.sky})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px", boxShadow:"0 4px 20px rgba(1,87,155,0.25)" }}>✈</div>
          <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:28, fontWeight:800, color:T.primaryDk, letterSpacing:1 }}>AeroQualify Pro</div>
          <div style={{ fontSize:13, color:T.muted, marginTop:4 }}>Aviation Quality Management System</div>
        </div>
        <div className="card" style={{ padding:32 }}>
          <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:700, fontSize:16, color:T.primaryDk, marginBottom:22 }}>
            {mode==="login"?"Sign In":mode==="signup"?"Create Account":"Reset Password"}
          </div>
          <form onSubmit={handle}>
            <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required />
            {mode!=="reset"&&<Input label="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" required />}
            {err&&<div style={{ fontSize:12, color:err.startsWith("✓")?T.green:T.red, marginBottom:14, padding:"8px 12px", background:err.startsWith("✓")?T.greenLt:T.redLt, borderRadius:6 }}>{err}</div>}
            <Btn type="submit" size="lg" style={{ width:"100%", opacity:loading?0.7:1 }}>{loading?"Please wait…":mode==="login"?"Sign In":mode==="signup"?"Create Account":"Send Reset Link"}</Btn>
          </form>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:16 }}>
            <button onClick={()=>setMode(mode==="login"?"signup":"login")} style={{ background:"none",border:"none",color:T.primary,fontSize:12 }}>{mode==="login"?"Create account":"Back to sign in"}</button>
            {mode==="login"&&<button onClick={()=>setMode("reset")} style={{ background:"none",border:"none",color:T.muted,fontSize:12 }}>Forgot password?</button>}
          </div>
        </div>
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:T.muted }}>AS9100D · ISO 9001:2015 · AS9110</div>
      </div>
    </div>
  );
};

// ─── Dashboard Charts ─────────────────────────────────────────
const CHART_COLORS = [T.primary, T.yellow, T.green, T.teal, T.purple, T.red];

const Dashboard = ({ data }) => {
  const openCARs     = data.cars.filter(c=>c.status==="Open").length;
  const inProgCARs   = data.cars.filter(c=>c.status==="In Progress").length;
  const pendVerif    = data.cars.filter(c=>c.status==="Pending Verification").length;
  const closedCARs   = data.cars.filter(c=>c.status==="Closed").length;
  const upAudits     = data.audits.filter(a=>a.status==="Scheduled").length;
  const expDocs      = data.flightDocs.filter(d=>isOverdue(d.expiry_date)||isApproaching(d.expiry_date)).length;

  // ── QMS Compliance Score ─────────────────────────────────────
  // Weighted scoring across 5 pillars (total 100 points)
  const totalCARs    = data.cars.length;
  const overdueCARs  = data.cars.filter(c=>isOverdue(c.due_date)&&!["Closed","Completed"].includes(c.status)).length;
  const criticalOpen = data.cars.filter(c=>c.severity==="Critical"&&c.status!=="Closed").length;
  const expiredDocs  = data.flightDocs.filter(d=>isOverdue(d.expiry_date)).length;
  const totalFlDocs  = data.flightDocs.length;
  const capRate      = totalCARs>0 ? data.caps.filter(c=>c.status==="Complete").length/totalCARs : 1;
  const closeRate    = totalCARs>0 ? closedCARs/totalCARs : 1;
  const auditsDone   = data.audits.filter(a=>a.status==="Completed").length;
  const auditsTotal  = data.audits.length;
  const contractorOk = data.contractors.filter(c=>["A+","A"].includes(c.rating)).length;
  const contractorTot= data.contractors.length;

  // Pillar 1 — CAPA Closure Rate (25pts): % of CARs closed
  const p1 = Math.round(25 * Math.min(closeRate, 1));
  // Pillar 2 — CAP Compliance (20pts): % of CARs with complete CAPs
  const p2 = Math.round(20 * Math.min(capRate, 1));
  // Pillar 3 — No Overdue/Critical (25pts): deduct for each overdue or critical open
  const p3 = Math.max(0, 25 - (overdueCARs * 5) - (criticalOpen * 8));
  // Pillar 4 — Document Currency (20pts): deduct for expired docs
  const p4 = totalFlDocs>0 ? Math.max(0, Math.round(20 * (1 - expiredDocs/totalFlDocs))) : 20;
  // Pillar 5 — Audit & Contractor Health (10pts)
  const auditScore  = auditsTotal>0 ? (auditsDone/auditsTotal)*5 : 5;
  const contScore   = contractorTot>0 ? (contractorOk/contractorTot)*5 : 5;
  const p5          = Math.round(auditScore + contScore);

  // Risk Register bonus/penalty (replaces p5 weighting when risks exist)
  const totalRisks    = (data.risks||[]).length;
  const openCritRisks = (data.risks||[]).filter(r=>r.residual_rating==="Critical"&&r.status!=="Closed").length;
  const treatedRisks  = (data.risks||[]).filter(r=>r.treatment_action&&r.status!=="Open").length;
  const riskPenalty   = Math.min(10, openCritRisks * 5);
  const riskBonus     = totalRisks>0 ? Math.round((treatedRisks/totalRisks)*5) : 0;

  const compScore   = Math.min(100, p1+p2+Math.max(0,p3-riskPenalty)+p4+p5+riskBonus);
  const scoreColor  = compScore>=90?"#2e7d32":compScore>=75?T.teal:compScore>=60?T.yellow:compScore>=40?"#e65100":T.red;
  const scoreLabel  = compScore>=90?"Excellent":compScore>=75?"Good":compScore>=60?"Satisfactory":compScore>=40?"Needs Attention":"Critical";
  const pillars     = [
    {label:"CAPA Closure",    score:p1, max:25, desc:`${closedCARs}/${totalCARs} CARs closed`},
    {label:"CAP Compliance",  score:p2, max:20, desc:`${data.caps.filter(c=>c.status==="Complete").length}/${totalCARs} CAPs complete`},
    {label:"No Overdue/Critical",score:Math.min(p3,25),max:25,desc:`${overdueCARs} overdue · ${criticalOpen} critical open`},
    {label:"Document Currency",score:p4,max:20, desc:`${totalFlDocs-expiredDocs}/${totalFlDocs} docs current`},
    {label:"Audit & Contractors",score:p5,max:10,desc:`${auditsDone} audits done · ${contractorOk} approved contractors`},
  ];

  const carsByStatus = [
    {name:"Open",value:openCARs},{name:"In Progress",value:inProgCARs},
    {name:"Pend. Verif.",value:pendVerif},{name:"Closed",value:closedCARs},
  ].filter(d=>d.value>0);

  const carsBySeverity = ["Critical","Major","Minor"].map(s=>({
    name:s, value:data.cars.filter(c=>c.severity===s).length
  })).filter(d=>d.value>0);

  const monthlyData = Array.from({length:6},(_,i)=>{
    const d=new Date(); d.setMonth(d.getMonth()-5+i);
    const mo=d.toLocaleString("en-GB",{month:"short"});
    const yr=d.getFullYear(); const mn=d.getMonth();
    return {
      month:mo,
      Raised: data.cars.filter(c=>{ const cd=new Date(c.created_at); return cd.getFullYear()===yr&&cd.getMonth()===mn; }).length,
      Closed: data.cars.filter(c=>{ const cd=new Date(c.updated_at); return c.status==="Closed"&&cd.getFullYear()===yr&&cd.getMonth()===mn; }).length,
    };
  });

  const kpis = [
    {label:"Open CARs",     value:openCARs,   color:T.red,    icon:"📋", sub:"Requires action"},
    {label:"In Progress",   value:inProgCARs, color:T.yellow, icon:"🔄", sub:"CAP being completed"},
    {label:"Pend. Verif.",  value:pendVerif,  color:T.purple, icon:"🔍", sub:"Awaiting QM review"},
    {label:"Closed",        value:closedCARs, color:T.green,  icon:"✅", sub:"Verified closed"},
    {label:"Upcoming Audits",value:upAudits,  color:T.teal,   icon:"📅", sub:"Scheduled"},
    {label:"Expiring Docs", value:expDocs,    color:T.yellow, icon:"📄", sub:"Within 14 days"},
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* KPIs */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        {kpis.map(k=>(
          <div key={k.label} className="card" style={{ flex:1, minWidth:140, padding:"18px 20px", borderTop:`3px solid ${k.color}`, animation:"fadeIn 0.4s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:32, fontFamily:"'Oxanium',sans-serif", fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:12, color:T.text, fontWeight:600, marginTop:4 }}>{k.label}</div>
                <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{k.sub}</div>
              </div>
              <span style={{ fontSize:22, opacity:0.6 }}>{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* QMS Compliance Score */}
      <div className="card" style={{ padding:"20px 24px", borderTop:`4px solid ${scoreColor}`, animation:"fadeIn 0.4s ease" }}>
        <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:24, alignItems:"center" }}>
          {/* Score dial */}
          <div style={{ textAlign:"center", minWidth:130 }}>
            <div style={{ position:"relative", display:"inline-block" }}>
              <svg width="130" height="130" viewBox="0 0 130 130">
                {/* Background arc */}
                <circle cx="65" cy="65" r="54" fill="none" stroke="#eef2f7" strokeWidth="10"/>
                {/* Score arc — strokeDasharray trick for partial circle */}
                <circle cx="65" cy="65" r="54" fill="none" stroke={scoreColor} strokeWidth="10"
                  strokeDasharray={`${(compScore/100)*339.3} 339.3`}
                  strokeLinecap="round"
                  transform="rotate(-90 65 65)"
                  style={{transition:"stroke-dasharray 1s ease"}}/>
                <text x="65" y="58" textAnchor="middle" style={{fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:28,fill:scoreColor}}>{compScore}</text>
                <text x="65" y="72" textAnchor="middle" style={{fontFamily:"'Oxanium',sans-serif",fontWeight:600,fontSize:11,fill:"#5f7285"}}>/100</text>
                <text x="65" y="86" textAnchor="middle" style={{fontFamily:"'Source Sans 3',sans-serif",fontWeight:700,fontSize:10,fill:scoreColor}}>{scoreLabel.toUpperCase()}</text>
              </svg>
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:T.text, marginTop:2 }}>QMS Compliance Score</div>
            <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>AS9100D · ISO 9001:2015</div>
          </div>
          {/* Pillars */}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {pillars.map(p=>{
              const pct=Math.round((p.score/p.max)*100);
              const pc=pct>=80?"#2e7d32":pct>=60?T.teal:pct>=40?T.yellow:T.red;
              return (
                <div key={p.label}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:T.text }}>{p.label}</span>
                    <span style={{ fontSize:11, color:T.muted }}>{p.score}/{p.max} pts · <span style={{color:T.muted,fontStyle:"italic"}}>{p.desc}</span></span>
                  </div>
                  <div style={{ height:7, background:"#eef2f7", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:pc, borderRadius:4, transition:"width 0.8s ease" }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:16 }}>
        <Card title="CAR Trend (6 months)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="month" tick={{fontSize:11,fill:T.muted}} />
              <YAxis tick={{fontSize:11,fill:T.muted}} />
              <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:`1px solid ${T.border}`}} />
              <Bar dataKey="Raised" fill={T.primary} radius={[3,3,0,0]} />
              <Bar dataKey="Closed" fill={T.green} radius={[3,3,0,0]} />
              <Legend wrapperStyle={{fontSize:12}} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="By Status">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={carsByStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {carsByStatus.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{fontSize:12,borderRadius:8}} />
              <Legend wrapperStyle={{fontSize:11}} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="By Severity">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={carsBySeverity} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {carsBySeverity.map((_,i)=><Cell key={i} fill={[T.red,T.yellow,T.teal][i]||CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{fontSize:12,borderRadius:8}} />
              <Legend wrapperStyle={{fontSize:11}} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent CARs + Upcoming Audits */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="Recent CARs">
          {data.cars.slice(0,6).map(c=>(
            <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
              <div>
                <div style={{ fontFamily:"'Source Code Pro',monospace", color:T.primary, fontSize:11, fontWeight:600 }}>{c.id}</div>
                <div style={{ fontSize:12, color:T.text, maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</div>
                <div style={{ fontSize:11, color:T.muted }}>Clause: {c.qms_clause||"—"}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3, alignItems:"flex-end" }}>
                <Badge label={c.severity}/><Badge label={c.status}/>
              </div>
            </div>
          ))}
          {data.cars.length===0&&<div style={{ textAlign:"center", color:T.muted, fontSize:13, padding:20 }}>No CARs raised yet</div>}
        </Card>
        <Card title="Upcoming Audits">
          {data.audits.filter(a=>a.status==="Scheduled").map(a=>{
            const d=daysUntil(a.date);
            return (
              <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontFamily:"'Source Code Pro',monospace", color:T.primary, fontSize:11 }}>{a.id}</div>
                  <div style={{ fontSize:12, color:T.text }}>{a.title}</div>
                  <div style={{ fontSize:11, color:d!==null&&d<=7?T.red:T.muted }}>{fmt(a.date)}{d!==null?` (${d}d)`:""}</div>
                </div>
                <Badge label={a.type}/>
              </div>
            );
          })}
          {data.audits.filter(a=>a.status==="Scheduled").length===0&&<div style={{ textAlign:"center",color:T.muted,fontSize:13,padding:20 }}>No upcoming audits</div>}
        </Card>
      </div>
    </div>
  );
};

// ─── CAR Form Modal ───────────────────────────────────────────
const CARModal = ({ car, managers, onSave, onClose }) => {
  const [form, setForm] = useState(car || {
    id:`CAR-${String(Date.now()).slice(-6)}`, status:"Open",
    severity:"Minor", date_raised:today(),
  });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  return (
    <ModalShell title={car?"Edit CAR":"Raise New CAR"} onClose={onClose} wide>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
        <Input label="CAR Number" value={form.id||""} onChange={e=>set("id",e.target.value)} />
        <Input label="Date Raised" type="date" value={form.date_raised||""} onChange={e=>set("date_raised",e.target.value)} />
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Description of Finding" rows={4} value={form.finding_description||""} onChange={e=>set("finding_description",e.target.value)} />
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="QMS Clause Reference" rows={4} value={form.qms_clause||""} onChange={e=>set("qms_clause",e.target.value)} placeholder="e.g. Clause 8.7.1 — Nonconforming outputs" />
        </div>
        <Select label="Severity" value={form.severity||""} onChange={e=>set("severity",e.target.value)}>
          {["Minor","Major","Critical"].map(o=><option key={o}>{o}</option>)}
        </Select>
        <Select label="Responsible Manager" value={form.responsible_manager||""} onChange={e=>set("responsible_manager",e.target.value)}>
          <option value="">Select…</option>
          {managers.map(m=><option key={m.id} value={m.role_title}>{m.role_title}{m.person_name?` – ${m.person_name}`:""}</option>)}
        </Select>
        <Select label="Department" value={form.department||""} onChange={e=>set("department",e.target.value)}>
          <option value="">Select…</option>
          {["Training","Safety","Quality","Administration","Maintenance"].map(o=><option key={o}>{o}</option>)}
        </Select>
        <Input label="Due Date" type="date" value={form.due_date||""} onChange={e=>set("due_date",e.target.value)} />
        <div style={{ gridColumn:"1/-1" }}>
          <Input label="Additional Notification Recipients (comma separated emails)" value={(form.additional_notify||[]).join(",")} onChange={e=>set("additional_notify",e.target.value.split(",").map(s=>s.trim()).filter(Boolean))} placeholder="person@company.com, other@company.com" />
        </div>
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSave(form)}>Save CAR</Btn>
      </div>
    </ModalShell>
  );
};

// ─── CAP Form Modal ───────────────────────────────────────────
const CAPModal = ({ car, cap, onSave, onClose }) => {
  const [form, setForm] = useState(cap || { id:`CAP-${String(Date.now()).slice(-6)}`, car_id:car?.id, status:"Pending" });
  const [newFiles, setNewFiles] = useState([]); // files staged for upload
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  // Existing saved files (array stored as JSON in evidence_files, or legacy single file)
  const savedFiles = (() => {
    try { return JSON.parse(form.evidence_files||"[]"); } catch{ return []; }
  })();
  const legacyFile = !form.evidence_files && form.evidence_filename
    ? [{name:form.evidence_filename, url:form.evidence_url}] : [];
  const allSaved = [...savedFiles, ...legacyFile];

  const hasEvidence = allSaved.length>0 || newFiles.length>0;
  const allFilled = form.immediate_action&&form.root_cause_analysis&&form.corrective_action&&form.preventive_action&&hasEvidence;

  const addFiles = (e) => {
    const picked = Array.from(e.target.files||[]);
    setNewFiles(prev=>[...prev, ...picked]);
    e.target.value=""; // allow re-selecting same file
  };
  const removeNew = (i) => setNewFiles(prev=>prev.filter((_,idx)=>idx!==i));
  const removeSaved = (i) => {
    const updated = allSaved.filter((_,idx)=>idx!==i);
    set("evidence_files", JSON.stringify(updated));
    if(updated.length===0){ set("evidence_filename",""); set("evidence_url",""); }
  };

  return (
    <ModalShell title={`CAP Form – ${car?.id}`} onClose={onClose} wide>
      <div style={{ background:T.primaryLt, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:T.primaryDk }}>
        <strong>Finding:</strong> {car?.finding_description} &nbsp;|&nbsp; <strong>Clause:</strong> {car?.qms_clause}
      </div>
      <Textarea label="Immediate Corrective Action" rows={3} value={form.immediate_action||""} onChange={e=>set("immediate_action",e.target.value)} />
      <Textarea label="Root Cause Analysis" rows={4} value={form.root_cause_analysis||""} onChange={e=>set("root_cause_analysis",e.target.value)} />
      <Textarea label="Corrective Action" rows={3} value={form.corrective_action||""} onChange={e=>set("corrective_action",e.target.value)} />
      <Textarea label="Preventive Action" rows={3} value={form.preventive_action||""} onChange={e=>set("preventive_action",e.target.value)} />

      {/* Evidence upload */}
      <div style={{ marginBottom:14 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.muted, letterSpacing:0.8, textTransform:"uppercase", marginBottom:6 }}>Evidence of Closure</label>

        {/* Already-saved files */}
        {allSaved.length>0&&(
          <div style={{ marginBottom:8 }}>
            {allSaved.map((f,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:T.greenLt, border:`1px solid #a5d6a7`, borderRadius:6, padding:"6px 10px", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:14 }}>📎</span>
                  <div>
                    <div style={{ fontSize:12, color:T.green, fontWeight:600 }}>{f.name}</div>
                    {f.url&&<a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize:11, color:T.primary }}>View file</a>}
                  </div>
                </div>
                <button onClick={()=>removeSaved(i)} style={{ background:"none", border:"none", color:T.red, fontSize:16, cursor:"pointer", padding:"0 4px" }} title="Remove">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Newly staged files (not yet uploaded) */}
        {newFiles.length>0&&(
          <div style={{ marginBottom:8 }}>
            {newFiles.map((f,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:T.primaryLt, border:`1px solid #90caf9`, borderRadius:6, padding:"6px 10px", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:14 }}>🔄</span>
                  <div>
                    <div style={{ fontSize:12, color:T.primary, fontWeight:600 }}>{f.name}</div>
                    <div style={{ fontSize:11, color:T.muted }}>{(f.size/1024).toFixed(1)} KB — ready to upload</div>
                  </div>
                </div>
                <button onClick={()=>removeNew(i)} style={{ background:"none", border:"none", color:T.red, fontSize:16, cursor:"pointer", padding:"0 4px" }} title="Remove">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* File picker */}
        <label style={{ display:"flex", alignItems:"center", gap:8, background:T.bg, border:`2px dashed ${T.border}`, borderRadius:8, padding:"10px 14px", cursor:"pointer", fontSize:12, color:T.muted }}>
          <span style={{ fontSize:18 }}>📁</span>
          <span>Click to add files &nbsp;<span style={{ color:T.light }}>— images, PDF, Word, Excel (multiple allowed)</span></span>
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={addFiles} style={{ display:"none" }} />
        </label>
        {!hasEvidence&&<div style={{ fontSize:11, color:T.red, marginTop:4 }}>⚠ At least one evidence file is required to complete the CAP.</div>}
      </div>

      {allFilled&&<div style={{ background:T.greenLt, borderRadius:8, padding:"10px 14px", fontSize:12, color:T.green, marginBottom:14 }}>✓ All fields complete — CAR will be set to <strong>Pending Verification</strong> upon save.</div>}
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSave(form, newFiles)}>Submit CAP</Btn>
      </div>
    </ModalShell>
  );
};

// ─── Verification Form Modal ──────────────────────────────────
const VerificationModal = ({ car, cap, verif, onSave, onClose }) => {
  const [form, setForm] = useState(verif ? {...verif} : {
    id:`VRF-${String(Date.now()).slice(-6)}`, car_id:car?.id,
    immediate_action_ok:false, root_cause_ok:false,
    corrective_action_ok:false, preventive_action_ok:false,
    evidence_ok:false, recurrence_prevented:false,
    effectiveness_rating:"Pending", status:"Pending",
  });
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const allChecked = form.immediate_action_ok&&form.root_cause_ok&&form.corrective_action_ok&&form.preventive_action_ok&&form.evidence_ok;
  const checks = [
    {key:"immediate_action_ok",   label:"Immediate action was adequate and implemented"},
    {key:"root_cause_ok",         label:"Root cause has been correctly identified"},
    {key:"corrective_action_ok",  label:"Corrective action addresses the root cause"},
    {key:"preventive_action_ok",  label:"Preventive action prevents recurrence"},
    {key:"evidence_ok",           label:"Evidence of closure is satisfactory"},
    {key:"recurrence_prevented",  label:"Recurrence of the finding is prevented"},
  ];
  return (
    <ModalShell title={`CAPA Verification – ${car?.id}`} onClose={onClose} wide>
      <div style={{ background:T.primaryLt, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:T.primaryDk }}>
        <strong>Finding:</strong> {car?.finding_description} &nbsp;|&nbsp; <strong>Clause:</strong> {car?.qms_clause}
      </div>
      {cap&&(
        <div style={{ background:"#f8fafc", borderRadius:8, padding:"12px 14px", marginBottom:16, fontSize:12 }}>
          <div style={{ fontWeight:600, color:T.text, marginBottom:8 }}>CAP Summary</div>
          <div><strong>Immediate Action:</strong> {cap.immediate_action}</div>
          <div style={{ marginTop:4 }}><strong>Root Cause:</strong> {cap.root_cause_analysis}</div>
          <div style={{ marginTop:4 }}><strong>Corrective Action:</strong> {cap.corrective_action}</div>
          <div style={{ marginTop:4 }}><strong>Preventive Action:</strong> {cap.preventive_action}</div>
          {(()=>{
            let fs=[];try{fs=JSON.parse(cap.evidence_files||"[]");}catch{}
            if(!cap.evidence_files&&cap.evidence_filename) fs=[{name:cap.evidence_filename}];
            return fs.length>0&&<div style={{ marginTop:4, color:T.green }}>
              <strong>Evidence ({fs.length} file{fs.length!==1?"s":""}):</strong> {fs.map(f=>f.name).join(", ")}
            </div>;
          })()}
        </div>
      )}
      <div style={{ fontWeight:600, fontSize:13, color:T.text, marginBottom:10 }}>Verification Checklist</div>
      {checks.map(c=><Checkbox key={c.key} label={c.label} checked={!!form[c.key]} onChange={()=>set(c.key,!form[c.key])} />)}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px", marginTop:8 }}>
        <Select label="Effectiveness Rating" value={form.effectiveness_rating||""} onChange={e=>set("effectiveness_rating",e.target.value)}>
          {["Pending","Effective","Not Effective"].map(o=><option key={o}>{o}</option>)}
        </Select>
        <Select label="Final Status" value={form.status||""} onChange={e=>set("status",e.target.value)}>
          {["Pending","Closed","Overdue"].map(o=><option key={o}>{o}</option>)}
        </Select>
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Verifier Comments" value={form.verifier_comments||""} onChange={e=>set("verifier_comments",e.target.value)} />
        </div>
      </div>
      {allChecked&&form.status==="Closed"&&<div style={{ background:T.greenLt, borderRadius:8, padding:"10px 14px", fontSize:12, color:T.green, marginBottom:14 }}>✓ All checklist items verified — CAR will be marked <strong>Closed</strong>.</div>}
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="success" onClick={()=>onSave(form)}>Submit Verification</Btn>
      </div>
    </ModalShell>
  );
};

// ─── Generic Modal Shell ──────────────────────────────────────
const ModalShell = ({ title, children, onClose, wide }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
    <div style={{ background:"#fff", borderRadius:14, padding:28, width:wide?680:480, maxHeight:"90vh", overflowY:"auto", animation:"fadeIn 0.2s ease", boxShadow:"0 8px 40px rgba(0,0,0,0.15)" }} onClick={e=>e.stopPropagation()}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Oxanium',sans-serif", fontSize:18, fontWeight:700, color:T.primaryDk }}>{title}</h2>
        <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, color:T.muted, cursor:"pointer" }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);


// ─── Pegasus Letterhead ───────────────────────────────────────
const PegasusLetterhead = () => (
  <div style={{ borderBottom:`2px solid #01579b`, paddingBottom:14, marginBottom:18, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
    <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:22, color:"#01579b", letterSpacing:1 }}>✈ Pegasus Flyers (E.A.) Ltd.</div>
    <div style={{ textAlign:"right" }}>
      <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:13, color:"#01579b" }}>CORRECTIVE ACTION REQUEST</div>
      <div style={{ fontSize:10, color:"#5f7285", marginTop:2 }}>P.O Box 3341-00100 Wilson Airport, Nairobi Kenya</div>
      <div style={{ fontSize:10, color:"#5f7285" }}>Tel: +254206001467/8 · Email: pegasus@africaonline.co.ke</div>
    </div>
  </div>
);

// ─── CAPA Detail / Progress Modal ────────────────────────────
const CAPADetailModal = ({ car, cap, verif, onPDF, onClose }) => {
  const steps = [
    { label:"CAR Raised",           done:true,                                  active:car.status==="Open" },
    { label:"In Progress",          done:["In Progress","Pending Verification","Closed","Overdue"].includes(car.status), active:car.status==="In Progress" },
    { label:"Pending Verification", done:["Pending Verification","Closed"].includes(car.status), active:car.status==="Pending Verification" },
    { label:"Closed",               done:car.status==="Closed",                 active:car.status==="Closed" },
  ];
  const checkItem = (ok, label) => (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
      <div style={{ width:18,height:18,borderRadius:"50%",background:ok?"#e8f5e9":"#fff",border:`2px solid ${ok?"#2e7d32":"#dde3ea"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
        {ok&&<span style={{ color:"#2e7d32",fontSize:10,fontWeight:700 }}>✓</span>}
      </div>
      <span style={{ fontSize:12,color:ok?"#2e7d32":"#8fa0b0" }}>{label}</span>
    </div>
  );
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff",borderRadius:14,width:780,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 8px 50px rgba(0,0,0,0.2)",animation:"fadeIn 0.2s ease" }} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,#01579b,#0277bd)`,padding:"18px 24px",borderRadius:"14px 14px 0 0",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:"'Source Code Pro',monospace",color:"rgba(255,255,255,0.7)",fontSize:11 }}>CAPA PROGRESS REPORT</div>
            <div style={{ fontFamily:"'Oxanium',sans-serif",fontWeight:800,fontSize:20,color:"#fff",letterSpacing:0.5 }}>{car.id}</div>
          </div>
          <div style={{ display:"flex",gap:10,alignItems:"center" }}>
            <Btn size="sm" onClick={onPDF} style={{ background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)" }}>📄 Export PDF</Btn>
            <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:22,cursor:"pointer" }}>✕</button>
          </div>
        </div>

        <div style={{ padding:24 }}>
          {/* Letterhead */}
          <PegasusLetterhead />

          {/* Progress tracker */}
          <div style={{ display:"flex",alignItems:"center",marginBottom:24,background:"#f5f8fc",borderRadius:10,padding:"14px 20px" }}>
            {steps.map((s,i)=>(
              <div key={s.label} style={{ display:"flex",alignItems:"center",flex:i<steps.length-1?1:"auto" }}>
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}>
                  <div style={{ width:32,height:32,borderRadius:"50%",background:s.done?"#01579b":s.active?"#e3f2fd":"#eef2f7",border:`2px solid ${s.done?"#01579b":s.active?"#01579b":"#dde3ea"}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s" }}>
                    {s.done ? <span style={{ color:"#fff",fontSize:14,fontWeight:700 }}>✓</span> : <span style={{ width:8,height:8,borderRadius:"50%",background:s.active?"#01579b":"#dde3ea",display:"block" }}/>}
                  </div>
                  <div style={{ fontSize:10,fontWeight:600,color:s.done?"#01579b":T.muted,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:0.5 }}>{s.label}</div>
                </div>
                {i<steps.length-1&&<div style={{ flex:1,height:2,background:s.done?"#01579b":"#dde3ea",margin:"0 8px",marginBottom:18,transition:"background 0.3s" }}/>}
              </div>
            ))}
          </div>

          {/* CAR Details */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20 }}>
            <div style={{ background:"#f5f8fc",borderRadius:10,padding:16,gridColumn:"1/-1" }}>
              <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>Description of Finding</div>
              <div style={{ fontSize:13,color:T.text,lineHeight:1.6 }}>{car.finding_description||"—"}</div>
            </div>
            <div style={{ background:"#f5f8fc",borderRadius:10,padding:16,gridColumn:"1/-1" }}>
              <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:8 }}>QMS Clause Reference</div>
              <div style={{ fontSize:13,color:T.text,lineHeight:1.6,fontFamily:"'Source Code Pro',monospace" }}>{car.qms_clause||"—"}</div>
            </div>
            {[
              ["CAR Number",car.id,true],["Date Raised",fmt(car.date_raised),false],
              ["Severity",null,false,car.severity],["Status",null,false,car.status],
              ["Department",car.department,false],["Due Date",fmt(car.due_date),false],
              ["Responsible Manager",car.responsible_manager,false],["Raised By",car.raised_by_name,false],
            ].map(([label,val,mono,badge])=>(
              <div key={label} style={{ background:"#f5f8fc",borderRadius:8,padding:"10px 14px" }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:4 }}>{label}</div>
                {badge ? <Badge label={badge}/> : <div style={{ fontSize:13,color:T.text,fontFamily:mono?"'Source Code Pro',monospace":"inherit",fontWeight:mono?600:400 }}>{val||"—"}</div>}
              </div>
            ))}
          </div>

          {/* CAP Section */}
          <div style={{ borderTop:`2px solid ${T.border}`,paddingTop:18,marginBottom:18 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
              <div style={{ fontFamily:"'Oxanium',sans-serif",fontWeight:700,fontSize:16,color:T.primaryDk }}>Corrective Action Plan (CAP)</div>
              <Badge label={cap?"Submitted":"Not Submitted"}/>
            </div>
            {cap ? (
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {[
                  ["Immediate Corrective Action",cap.immediate_action,true],
                  ["Root Cause Analysis",cap.root_cause_analysis,true],
                  ["Corrective Action",cap.corrective_action,true],
                  ["Preventive Action",cap.preventive_action,true],
                ].map(([label,val,full])=>(
                  <div key={label} style={{ background:"#f5f8fc",borderRadius:8,padding:"12px 14px",gridColumn:full?"1/-1":"auto" }}>
                    <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6 }}>{label}</div>
                    <div style={{ fontSize:13,color:T.text,lineHeight:1.6 }}>{val||"—"}</div>
                  </div>
                ))}
                <div style={{ background:"#f5f8fc",borderRadius:8,padding:"12px 14px",gridColumn:"1/-1" }}>
                  <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:8 }}>Evidence of Closure</div>
                  {(()=>{
                    let files=[];
                    try{files=JSON.parse(cap.evidence_files||"[]");}catch{}
                    if(!cap.evidence_files&&cap.evidence_filename) files=[{name:cap.evidence_filename,url:cap.evidence_url}];
                    return files.length>0
                      ? <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                          {files.map((f,i)=>(
                            <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"#e8f5e9",borderRadius:6,padding:"7px 12px" }}>
                              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                                <span>📎</span>
                                <span style={{ fontSize:13,color:T.green,fontWeight:600 }}>{f.name}</span>
                              </div>
                              {f.url&&!f.url.startsWith("data:")&&
                                <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize:12,color:T.primary,fontWeight:600 }}>🔗 View</a>}
                            </div>
                          ))}
                        </div>
                      : <div style={{ fontSize:13,color:T.muted }}>— No evidence uploaded</div>;
                  })()}
                </div>
                <div style={{ background:"#f5f8fc",borderRadius:8,padding:"12px 14px" }}>
                  <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6 }}>Submitted By</div>
                  <div style={{ fontSize:13,color:T.text }}>{cap.submitted_by_name||"—"}</div>
                  <div style={{ fontSize:11,color:T.muted }}>{cap.submitted_at?new Date(cap.submitted_at).toLocaleString():""}</div>
                </div>
              </div>
            ) : (
              <div style={{ background:"#fff3e0",borderRadius:8,padding:"14px 18px",fontSize:13,color:T.yellow }}>⏳ CAP not yet submitted by the responsible manager.</div>
            )}
          </div>

          {/* Verification Section */}
          <div style={{ borderTop:`2px solid ${T.border}`,paddingTop:18 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
              <div style={{ fontFamily:"'Oxanium',sans-serif",fontWeight:700,fontSize:16,color:T.primaryDk }}>CAPA Verification</div>
              <Badge label={verif?verif.status:"Not Verified"}/>
            </div>
            {verif ? (
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div style={{ background:"#f5f8fc",borderRadius:8,padding:"12px 14px",gridColumn:"1/-1" }}>
                  <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:10 }}>Verification Checklist</div>
                  {checkItem(verif.immediate_action_ok,"Immediate action was adequate")}
                  {checkItem(verif.root_cause_ok,"Root cause correctly identified")}
                  {checkItem(verif.corrective_action_ok,"Corrective action addresses root cause")}
                  {checkItem(verif.preventive_action_ok,"Preventive action prevents recurrence")}
                  {checkItem(verif.evidence_ok,"Evidence of closure satisfactory")}
                  {checkItem(verif.recurrence_prevented,"Recurrence of finding prevented")}
                </div>
                <div style={{ background:"#f5f8fc",borderRadius:8,padding:"12px 14px" }}>
                  <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6 }}>Effectiveness Rating</div>
                  <Badge label={verif.effectiveness_rating}/>
                </div>
                <div style={{ background:"#f5f8fc",borderRadius:8,padding:"12px 14px" }}>
                  <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6 }}>Verified By</div>
                  <div style={{ fontSize:13,color:T.text }}>{verif.verified_by_name||"—"}</div>
                  <div style={{ fontSize:11,color:T.muted }}>{verif.verified_at?new Date(verif.verified_at).toLocaleString():""}</div>
                </div>
                {verif.verifier_comments&&(
                  <div style={{ background:"#f5f8fc",borderRadius:8,padding:"12px 14px",gridColumn:"1/-1" }}>
                    <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6 }}>Verifier Comments</div>
                    <div style={{ fontSize:13,color:T.text,lineHeight:1.6 }}>{verif.verifier_comments}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background:"#e3f2fd",borderRadius:8,padding:"14px 18px",fontSize:13,color:T.primary }}>⏳ Verification not yet completed by the Quality Manager.</div>
            )}
          </div>

          {/* Footer */}
          <div style={{ marginTop:20,paddingTop:14,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div style={{ fontSize:11,color:T.muted }}>Pegasus Flyers (E.A.) Ltd. · QMS Document · {new Date().toLocaleDateString("en-GB")}</div>
            <Btn size="sm" onClick={onPDF}>📄 Export PDF Report</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};


// ─── CARs Table View ──────────────────────────────────────────
const CARsView = ({ data, user, profile, managers, onRefresh, showToast }) => {
  const [modal, setModal]   = useState(null); // null | 'car' | 'cap' | 'verify'
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = data.cars
    .filter(c => filter==="all"||c.status===filter)
    .filter(c => !search || JSON.stringify(c).toLowerCase().includes(search.toLowerCase()));

  const canRaiseCAR = ["admin","quality_manager","quality_auditor"].includes(profile?.role);

  const saveCar = async(form) => {
    const isNew = !data.cars.find(c=>c.id===form.id);
    const payload = {...form, title: form.finding_description?.slice(0,80)||form.id, updated_at:new Date().toISOString()};
    if(isNew) {
      payload.raised_by=user.id; payload.raised_by_name=profile?.full_name||user.email;
      const{error}=await supabase.from(TABLES.cars).insert(payload);
      if(error){showToast(`Error: ${error.message}`,"error");return;}
      await logChange({user,action:"created",table:"cars",recordId:form.id,recordTitle:form.title||form.id,newData:form});
      await sendNotification({type:"new_car",record:form,recipients:[form.responsible_manager_email].filter(Boolean)});
      showToast("CAR raised — responsible manager notified","success");
    } else {
      const{error}=await supabase.from(TABLES.cars).update(payload).eq("id",form.id);
      if(error){showToast(`Error: ${error.message}`,"error");return;}
      await logChange({user,action:"updated",table:"cars",recordId:form.id,recordTitle:form.title||form.id,newData:form});
      showToast("CAR updated","success");
    }
    setModal(null); onRefresh();
  };

  const saveCap = async(form, newFiles) => {
    // Upload helper — tries Supabase storage, falls back to base64
    const uploadOne = async(file) => {
      try {
        await supabase.storage.createBucket("capa-evidence",{public:true}).catch(()=>{});
        const path=`evidence/${selected.id}/${Date.now()}_${file.name}`;
        const{error:ue}=await supabase.storage.from("capa-evidence").upload(path,file,{upsert:true,contentType:file.type});
        if(!ue){
          const{data:urlData}=supabase.storage.from("capa-evidence").getPublicUrl(path);
          return {name:file.name, url:urlData.publicUrl, size:file.size, type:file.type};
        }
        // fallback: base64
        const reader=new FileReader();
        const dataUrl=await new Promise((res,rej)=>{reader.onload=e=>res(e.target.result);reader.onerror=rej;reader.readAsDataURL(file);});
        return {name:file.name, url:dataUrl, size:file.size, type:file.type, inline:true};
      } catch(e){
        console.warn("Upload failed for",file.name,e);
        return null;
      }
    };

    // Start from existing saved files
    let existingFiles = [];
    try { existingFiles=JSON.parse(form.evidence_files||"[]"); } catch{}
    // Also migrate any legacy single-file evidence
    if(!form.evidence_files && form.evidence_filename){
      existingFiles=[{name:form.evidence_filename, url:form.evidence_url}];
    }

    // Upload all new files in parallel
    if(newFiles && newFiles.length>0){
      showToast(`Uploading ${newFiles.length} file(s)…`,"success");
      const results = await Promise.all(newFiles.map(uploadOne));
      const uploaded = results.filter(Boolean);
      existingFiles = [...existingFiles, ...uploaded];
      showToast(`${uploaded.length} file(s) uploaded`,"success");
    }

    const evidence_files = JSON.stringify(existingFiles);
    // Keep legacy fields populated from first file for backwards compat
    const firstFile = existingFiles[0];
    const evidence_url      = firstFile?.url || "";
    const evidence_filename = firstFile?.name || "";

    const hasEvidence = existingFiles.length>0;
    const allFilled = form.immediate_action&&form.root_cause_analysis&&form.corrective_action&&form.preventive_action&&hasEvidence;
    const capPayload={...form,evidence_files,evidence_url,evidence_filename,submitted_by:user.id,submitted_by_name:profile?.full_name||user.email,submitted_at:new Date().toISOString(),status:allFilled?"Complete":"Pending"};
    const{error}=await supabase.from(TABLES.caps).upsert(capPayload);
    if(error){showToast(`Error saving CAP: ${error.message}`,"error");return;}
    if(allFilled){
      await supabase.from(TABLES.cars).update({status:"Pending Verification",updated_at:new Date().toISOString()}).eq("id",selected.id);
      const qm=managers.find(m=>m.role_title==="Quality Manager");
      await sendNotification({type:"cap_submitted",record:{...selected,...form},recipients:[qm?.email].filter(Boolean)});
      showToast("CAP submitted — Quality Manager notified","success");
    } else {
      await supabase.from(TABLES.cars).update({status:"In Progress",updated_at:new Date().toISOString()}).eq("id",selected.id);
      showToast("CAP saved","success");
    }
    await logChange({user,action:"submitted CAP",table:"caps",recordId:form.id,recordTitle:selected.id,newData:form});
    setModal(null); onRefresh();
  };

  const saveVerification = async(form) => {
    const payload={...form,verified_by:user.id,verified_by_name:profile?.full_name||user.email,verified_at:new Date().toISOString()};
    const{error}=await supabase.from(TABLES.verifications).upsert(payload);
    if(error){showToast(`Error: ${error.message}`,"error");return;}
    await supabase.from(TABLES.cars).update({status:form.status,updated_at:new Date().toISOString()}).eq("id",selected.id);
    const rm=managers.find(m=>m.role_title===selected.responsible_manager);
    await sendNotification({type:"verification_submitted",record:{...selected,...form},recipients:[rm?.email].filter(Boolean)});
    await logChange({user,action:"verified CAPA",table:"capa_verifications",recordId:form.id,recordTitle:selected.id,newData:form});
    showToast("Verification submitted — responsible manager notified","success");
    setModal(null); onRefresh();
  };

  const getCAP  = (carId) => data.caps?.find(c=>c.car_id===carId);
  const getVerif= (carId) => data.verifications?.find(v=>v.car_id===carId);

  const generateReport = async(car) => {
    const{jsPDF}=await import("jspdf");
    const{default:autoTable}=await import("jspdf-autotable");
    const cap=getCAP(car.id); const verif=getVerif(car.id);
    const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    const W=210; const margin=14; const col=W-margin*2;

    // ── helpers ──
    const LINE_H=4.5; // line height for 9pt text
    const LABEL_SZ=6.5; const BODY_SZ=9;

    const sectionTitle=(text,y,color=[1,87,155])=>{
      doc.setFillColor(...color); doc.rect(margin,y,col,7,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(LABEL_SZ+1); doc.setTextColor(255,255,255);
      doc.text(text,margin+3,y+4.8); doc.setTextColor(0,0,0);
      return y+9;
    };

    // Draws a labelled box that auto-sizes to its content. Returns bottom y.
    const box=(label,value,x,y,w)=>{
      doc.setFont("helvetica","normal"); doc.setFontSize(BODY_SZ);
      const lines=doc.splitTextToSize(String(value||"—"),w-5);
      const textH=lines.length*LINE_H;
      const h=5+4+textH+3; // top-pad + label + text + bottom-pad
      doc.setFillColor(245,248,252); doc.rect(x,y,w,h,"F");
      doc.setDrawColor(221,227,234); doc.rect(x,y,w,h,"S");
      doc.setFont("helvetica","bold"); doc.setFontSize(LABEL_SZ); doc.setTextColor(95,114,133);
      doc.text(label.toUpperCase(),x+2.5,y+4);
      doc.setFont("helvetica","normal"); doc.setFontSize(BODY_SZ); doc.setTextColor(26,35,50);
      doc.text(lines,x+2.5,y+4+LINE_H+1);
      return y+h+2;
    };

    // Draws a pair of equal-width boxes on the same row. Returns bottom y.
    const boxRow=(pairs,x,y,totalW)=>{
      const gap=2; const n=pairs.length; const w=(totalW-(n-1)*gap)/n;
      // Calculate the max height needed across all boxes in this row
      let maxH=0;
      pairs.forEach(([,val])=>{
        doc.setFont("helvetica","normal"); doc.setFontSize(BODY_SZ);
        const lines=doc.splitTextToSize(String(val||"—"),w-5);
        const h=5+4+lines.length*LINE_H+3;
        if(h>maxH) maxH=h;
      });
      pairs.forEach(([label,val],i)=>{
        const bx=x+i*(w+gap);
        doc.setFillColor(245,248,252); doc.rect(bx,y,w,maxH,"F");
        doc.setDrawColor(221,227,234); doc.rect(bx,y,w,maxH,"S");
        doc.setFont("helvetica","bold"); doc.setFontSize(LABEL_SZ); doc.setTextColor(95,114,133);
        doc.text(label.toUpperCase(),bx+2.5,y+4);
        doc.setFont("helvetica","normal"); doc.setFontSize(BODY_SZ); doc.setTextColor(26,35,50);
        const lines=doc.splitTextToSize(String(val||"—"),w-5);
        doc.text(lines,bx+2.5,y+4+LINE_H+1);
      });
      return y+maxH+2;
    };

    // ── Page overflow guard ──
    // jsPDF doesn't auto-paginate — we must check before every draw call.
    // usable page height = 287 (leaving room for footer)
    const FOOTER_Y=287; const NEW_PAGE_Y=20;
    const needPage=(currentY,neededH=20)=>{
      if(currentY+neededH>FOOTER_Y){ doc.addPage(); return NEW_PAGE_Y; }
      return currentY;
    };

    const checkRow=(label,ok,x,y,w)=>{
      const bgR=ok?232:245; const bgG=ok?245:248; const bgB=ok?233:252;
      doc.setFillColor(bgR,bgG,bgB); doc.rect(x,y,w,7,"F");
      doc.setDrawColor(221,227,234); doc.rect(x,y,w,7,"S");
      // Use text marker instead of unicode to avoid encoding issues
      doc.setFont("helvetica","bold"); doc.setFontSize(9);
      doc.setTextColor(ok?46:180,ok?125:180,ok?50:180);
      doc.text(ok?"[x]":"[ ]",x+2.5,y+5);
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(26,35,50);
      doc.text(label,x+14,y+5);
      return y+8;
    };

    let y=margin;

    // ── Letterhead ──
    doc.setFillColor(1,87,155); doc.rect(0,0,W,18,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(255,255,255);
    doc.text("AeroQualify Pro",margin,12);
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(200,220,255);
    doc.text("CAPA PROGRESS REPORT",margin+52,12);
    doc.text("Pegasus Flyers (E.A.) Ltd.  |  Wilson Airport, Nairobi  |  +254206001467/8",W-margin,9,{align:"right"});
    doc.text("Generated: "+new Date().toLocaleDateString("en-GB"),W-margin,14,{align:"right"});
    y=24;

    // ── CAR Header bar ──
    doc.setFillColor(0,60,113); doc.rect(margin,y,col,10,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
    doc.text("CAR: "+car.id,margin+4,y+7);
    // status pill — right aligned, text only (avoid roundedRect encoding issues)
    const sc={Open:[198,40,40],"In Progress":[230,81,0],"Pending Verification":[69,39,160],Closed:[46,125,50],Overdue:[198,40,40]};
    const sCol=sc[car.status]||[95,114,133];
    doc.setFillColor(...sCol); doc.rect(W-margin-34,y+2,32,6,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(7); doc.setTextColor(255,255,255);
    doc.text(car.status,W-margin-34+16,y+6.2,{align:"center"});
    y+=14;

    // ── Progress Tracker ──
    doc.setFillColor(245,248,252); doc.rect(margin,y,col,16,"F");
    doc.setDrawColor(221,227,234); doc.rect(margin,y,col,16,"S");
    const steps=[
      {label:"CAR RAISED",done:true},
      {label:"IN PROGRESS",done:["In Progress","Pending Verification","Closed","Overdue"].includes(car.status)},
      {label:"PENDING VERIFICATION",done:["Pending Verification","Closed"].includes(car.status)},
      {label:"CLOSED",done:car.status==="Closed"},
    ];
    const stepW=col/steps.length;
    steps.forEach((s,i)=>{
      const cx=margin+stepW*i+stepW/2; const cy=y+7;
      // connector line (drawn before circle so circle overlaps)
      if(i<steps.length-1){
        doc.setLineWidth(1.5);
        doc.setDrawColor(s.done?1:210,s.done?87:210,s.done?155:210);
        doc.line(cx+5,cy,cx+stepW-5,cy);
      }
      // filled circle
      doc.setFillColor(s.done?1:220,s.done?87:230,s.done?155:240);
      doc.circle(cx,cy,4,"F");
      doc.setDrawColor(s.done?1:200,s.done?87:210,s.done?155:220);
      doc.setLineWidth(0.5); doc.circle(cx,cy,4,"S");
      // marker inside circle — use text not unicode
      doc.setFont("helvetica","bold"); doc.setFontSize(6);
      doc.setTextColor(s.done?255:150,s.done?255:160,s.done?255:170);
      doc.text(s.done?"OK":"--",cx,cy+2,{align:"center"});
      // label below
      doc.setFont("helvetica","bold"); doc.setFontSize(5.5);
      doc.setTextColor(s.done?1:140,s.done?87:150,s.done?155:160);
      doc.text(s.label,cx,y+15,{align:"center"});
    });
    y+=20;

    // Helper: estimate box height without drawing (used for page overflow checks)
    const estBoxH=(value,w)=>{
      doc.setFont("helvetica","normal"); doc.setFontSize(9);
      const lines=doc.splitTextToSize(String(value||"—"),w-5);
      return Math.max(14,5+4+lines.length*LINE_H+3+2);
    };

    // ── Section 1: CAR Details ──
    y=needPage(y,12);
    y=sectionTitle("SECTION 1 — CORRECTIVE ACTION REQUEST (CAR)",y);
    y=needPage(y,estBoxH(car.finding_description,col)); y=box("Description of Finding",car.finding_description,margin,y,col);
    y=needPage(y,estBoxH(car.qms_clause,col));          y=box("QMS Clause Reference",car.qms_clause,margin,y,col);
    y=needPage(y,14); y=boxRow([["CAR Number",car.id],["Date Raised",fmt(car.date_raised)]],margin,y,col);
    y=needPage(y,14); y=boxRow([["Severity",car.severity],["Status",car.status]],margin,y,col);
    y=needPage(y,14); y=boxRow([["Department",car.department],["Due Date",fmt(car.due_date)]],margin,y,col);
    y=needPage(y,14); y=boxRow([["Responsible Manager",car.responsible_manager],["Raised By",car.raised_by_name]],margin,y,col);
    y+=4;

    // ── Section 2: CAP ──
    y=needPage(y,12);
    y=sectionTitle("SECTION 2 — CORRECTIVE ACTION PLAN (CAP)",y,[0,105,92]);
    if(cap){
      const cap2Fields=[
        ["Immediate Corrective Action",cap.immediate_action],
        ["Root Cause Analysis",cap.root_cause_analysis],
        ["Corrective Action",cap.corrective_action],
        ["Preventive Action",cap.preventive_action],
      ];
      cap2Fields.forEach(([label,val])=>{
        y=needPage(y,estBoxH(val,col));
        y=box(label,val,margin,y,col);
      });
      let evFiles2=[];
      try{evFiles2=JSON.parse(cap.evidence_files||"[]");}catch{}
      if(!cap.evidence_files&&cap.evidence_filename) evFiles2=[{name:cap.evidence_filename,url:cap.evidence_url}];
      const evVal=evFiles2.length>0
        ?evFiles2.map((f,i)=>`${i+1}. ${f.name}`).join("\n")
        :"\u2014 No evidence uploaded";
      y=needPage(y,estBoxH(evVal,col)+4);
      y=box(`Evidence of Closure (${evFiles2.length} file${evFiles2.length!==1?"s":""})`,evVal,margin,y,col);
      evFiles2.forEach(f=>{
        if(f.url&&!f.url.startsWith("data:")){
          y=needPage(y,6);
          doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(1,87,155);
          doc.textWithLink("  Open: "+f.name,margin+2.5,y-1,{url:f.url});
          doc.setTextColor(0,0,0); y+=4;
        }
      });
      y=needPage(y,14);
      y=boxRow([["Submitted By",cap.submitted_by_name||"—"],["Submitted At",cap.submitted_at?new Date(cap.submitted_at).toLocaleString():"—"]],margin,y,col);
    } else {
      y=needPage(y,14);
      doc.setFillColor(255,243,224); doc.rect(margin,y,col,10,"F");
      doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(230,81,0);
      doc.text("CAP not yet submitted by the responsible manager.",margin+4,y+6.5); y+=12;
    }
    y+=4;

    // ── Section 3: Verification ──
    y=needPage(y,12);
    y=sectionTitle("SECTION 3 — CAPA VERIFICATION",y,[69,39,160]);
    if(verif){
      const checks=[
        ["Immediate action was adequate and implemented",verif.immediate_action_ok],
        ["Root cause has been correctly identified",verif.root_cause_ok],
        ["Corrective action addresses the root cause",verif.corrective_action_ok],
        ["Preventive action prevents recurrence",verif.preventive_action_ok],
        ["Evidence of closure is satisfactory",verif.evidence_ok],
        ["Recurrence of the finding is prevented",verif.recurrence_prevented],
      ];
      checks.forEach(([label,ok])=>{ y=needPage(y,9); y=checkRow(label,ok,margin,y,col); });
      y+=2;
      y=needPage(y,14); y=boxRow([["Effectiveness Rating",verif.effectiveness_rating||"—"],["Final Status",verif.status||"—"]],margin,y,col);
      y=needPage(y,14); y=boxRow([["Verified By",verif.verified_by_name||"—"],["Verified At",verif.verified_at?new Date(verif.verified_at).toLocaleString():"—"]],margin,y,col);
      if(verif.verifier_comments){ y=needPage(y,estBoxH(verif.verifier_comments,col)); y=box("Verifier Comments",verif.verifier_comments,margin,y,col); }
    } else {
      y=needPage(y,14);
      doc.setFillColor(227,242,253); doc.rect(margin,y,col,10,"F");
      doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(1,87,155);
      doc.text("Verification not yet completed by the Quality Manager.",margin+4,y+6.5); y+=12;
    }
    y+=8;

    // ── Signature Section ──
    y=needPage(y,50);
    y=sectionTitle("SIGNATURES",y,[26,35,50]);
    const sigW=(col-6)/2;
    const qm=managers?.find(m=>m.role_title==="Quality Manager");
    const am=managers?.find(m=>m.role_title==="Accountable Manager");
    [[margin,"QUALITY MANAGER",qm?.person_name],[margin+sigW+6,"ACCOUNTABLE MANAGER",am?.person_name]].forEach(([sx,role,name])=>{
      doc.setFillColor(255,255,255); doc.rect(sx,y,sigW,34,"F");
      doc.setDrawColor(221,227,234); doc.rect(sx,y,sigW,34,"S");
      doc.setFont("helvetica","bold"); doc.setFontSize(LABEL_SZ); doc.setTextColor(95,114,133);
      doc.text(role,sx+3,y+5);
      doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(26,35,50);
      doc.text(name||"",sx+3,y+12);
      doc.setDrawColor(180,190,200); doc.setLineWidth(0.3);
      doc.line(sx+3,y+22,sx+sigW-4,y+22);
      doc.setFontSize(LABEL_SZ); doc.setTextColor(95,114,133);
      doc.text("Signature",sx+3,y+26);
      doc.line(sx+3,y+30,sx+sigW-4,y+30);
      doc.text("Date",sx+3,y+33.5);
    });
    y+=40;

    // ── Attach all evidence files as final pages ──────────────────
    let pdfEvidenceFiles=[];
    try{pdfEvidenceFiles=JSON.parse(cap?.evidence_files||"[]");}catch{}
    if(!cap?.evidence_files&&cap?.evidence_filename) pdfEvidenceFiles=[{name:cap.evidence_filename,url:cap.evidence_url}];

    // Track which jsPDF page numbers are evidence pages (for footer labelling)
    const reportPageCount = doc.getNumberOfPages(); // pages before any evidence
    const evidencePageMap = {}; // pageNum → {fileIndex, fileName, fileTotal}

    for(let fi=0;fi<pdfEvidenceFiles.length;fi++){
      const evFile=pdfEvidenceFiles[fi];
      if(!evFile?.url) continue;
      try{
        const ext=(evFile.name.split(".").pop()||"").toLowerCase();
        const isImage=["jpg","jpeg","png","gif","webp"].includes(ext);
        const isInline=evFile.url.startsWith("data:");

        if(isImage){
          let dataUrl=evFile.url;
          if(!isInline){
            const resp=await fetch(evFile.url);
            if(!resp.ok) throw new Error("fetch failed");
            const blob=await resp.blob();
            dataUrl=await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.readAsDataURL(blob);});
          }
          doc.addPage();
          const pg=doc.getNumberOfPages();
          evidencePageMap[pg]={fileIndex:fi+1,fileName:evFile.name,fileTotal:pdfEvidenceFiles.length};

          // Dark header bar
          doc.setFillColor(26,35,50); doc.rect(0,0,W,18,"F");
          doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
          doc.text(`EVIDENCE OF CLOSURE — File ${fi+1} of ${pdfEvidenceFiles.length}`,margin,8);
          doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(200,210,220);
          doc.text(evFile.name,W-margin,8,{align:"right"});
          doc.setFontSize(7); doc.setTextColor(160,180,200);
          doc.text(`CAR: ${car.id}  |  Evidence of Closure`,margin,14);

          // Image centred between header and footer
          const imgTop=22; const imgBottom=284;
          const maxW=W-margin*2; const maxH=imgBottom-imgTop;
          const imgProps=doc.getImageProperties(dataUrl);
          let iw=imgProps.width; let ih=imgProps.height;
          const scale=Math.min(maxW/iw,maxH/ih,1);
          iw*=scale; ih*=scale;
          doc.addImage(dataUrl,ext==="png"?"PNG":"JPEG",margin+(maxW-iw)/2,imgTop+(maxH-ih)/2,iw,ih);

        } else if(ext==="pdf"&&!isInline){
          // Queue PDF files for pdf-lib merge
          try{
            if(!window._pdfMergeQueue) window._pdfMergeQueue=[];
            const resp=await fetch(evFile.url);
            if(resp.ok) window._pdfMergeQueue.push({
              name:evFile.name, bytes:await resp.arrayBuffer(),
              index:fi+1, total:pdfEvidenceFiles.length, carId:car.id
            });
          } catch(e){
            // Fallback reference page
            doc.addPage();
            const pg=doc.getNumberOfPages();
            evidencePageMap[pg]={fileIndex:fi+1,fileName:evFile.name,fileTotal:pdfEvidenceFiles.length};
            doc.setFillColor(26,35,50); doc.rect(0,0,W,18,"F");
            doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
            doc.text(`EVIDENCE OF CLOSURE — File ${fi+1} of ${pdfEvidenceFiles.length}`,margin,8);
            doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(200,210,220);
            doc.text(evFile.name,W-margin,8,{align:"right"});
            doc.setFontSize(7); doc.setTextColor(160,180,200);
            doc.text(`CAR: ${car.id}  |  Evidence of Closure`,margin,14);
            doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(26,35,50);
            doc.text(evFile.name+" (PDF — open separately via link below)",margin,32);
            doc.setTextColor(1,87,155); doc.textWithLink("Click to open",margin,42,{url:evFile.url});
          }
        } else {
          // Other file types — reference page
          doc.addPage();
          const pg=doc.getNumberOfPages();
          evidencePageMap[pg]={fileIndex:fi+1,fileName:evFile.name,fileTotal:pdfEvidenceFiles.length};
          doc.setFillColor(26,35,50); doc.rect(0,0,W,18,"F");
          doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
          doc.text(`EVIDENCE OF CLOSURE — File ${fi+1} of ${pdfEvidenceFiles.length}`,margin,8);
          doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(200,210,220);
          doc.text(evFile.name,W-margin,8,{align:"right"});
          doc.setFontSize(7); doc.setTextColor(160,180,200);
          doc.text(`CAR: ${car.id}  |  Evidence of Closure`,margin,14);
          doc.setFillColor(245,248,252); doc.rect(margin,24,col,36,"F");
          doc.setDrawColor(221,227,234); doc.rect(margin,24,col,36,"S");
          doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(26,35,50);
          doc.text("Attached File: "+evFile.name,margin+4,36);
          if(!isInline){doc.setTextColor(1,87,155);doc.textWithLink("Click to open / download",margin+4,48,{url:evFile.url});}
          else{doc.setFont("helvetica","italic");doc.setFontSize(8);doc.setTextColor(95,114,133);doc.text("(Stored inline — download from AeroQualify Pro)",margin+4,48);}
        }
      } catch(evErr){ console.warn("Evidence page failed for",evFile.name,evErr); }
    }

    // ── Footer on every page — evidence pages get special labelling ──
    const totalPagesBeforeMerge=doc.getNumberOfPages();
    for(let p=1;p<=totalPagesBeforeMerge;p++){
      doc.setPage(p);
      const isEvPage=p>reportPageCount;
      const evInfo=evidencePageMap[p];
      // Footer bar
      doc.setFillColor(isEvPage?26:245, isEvPage?35:248, isEvPage?50:252);
      doc.rect(0,287,W,10,"F");
      doc.setDrawColor(isEvPage?60:221, isEvPage?80:227, isEvPage?100:234);
      doc.setLineWidth(0.3); doc.line(0,287,W,287);
      doc.setFont("helvetica","normal"); doc.setFontSize(7);
      doc.setTextColor(isEvPage?200:95, isEvPage?210:114, isEvPage?220:133);
      if(isEvPage&&evInfo){
        // Evidence page footer — clearly labelled
        doc.setFont("helvetica","bold");
        doc.text(`EVIDENCE OF CLOSURE  |  File ${evInfo.fileIndex} of ${evInfo.fileTotal}  |  ${evInfo.fileName}`,margin,293);
        doc.setFont("helvetica","normal");
      } else {
        doc.text("Pegasus Flyers (E.A.) Ltd.  |  Confidential QMS Document  |  AS9100D / ISO 9001:2015",margin,293);
      }
      doc.text("Page "+p+" of "+totalPagesBeforeMerge,W-margin,293,{align:"right"});
    }

    // ── Merge queued PDF evidence files via pdf-lib ──
    if(window._pdfMergeQueue?.length>0){
      try{
        const{PDFDocument}=await import("pdf-lib");
        const{rgb,StandardFonts}=await import("pdf-lib");
        const mainBytes=doc.output("arraybuffer");
        const mainPdf=await PDFDocument.load(mainBytes);
        const boldFont=await mainPdf.embedFont(StandardFonts.HelveticaBold);
        const normFont=await mainPdf.embedFont(StandardFonts.Helvetica);
        const dark=rgb(0.1,0.14,0.2);
        const white=rgb(1,1,1);
        const light=rgb(0.78,0.82,0.86);
        const muted=rgb(0.63,0.71,0.78);

        // ── Pass 1: add all pages to mainPdf, track page ranges ──
        // Structure: [{pageIndex, fileIndex, fileTotal, fileName, carId, evPageNum, evPageTotal}]
        const evidencePageMeta=[];

        for(const q of window._pdfMergeQueue){
          // Divider page
          mainPdf.addPage([595,842]);
          evidencePageMeta.push({pageIndex:mainPdf.getPageCount()-1,isDivider:true,
            fileIndex:q.index,fileTotal:q.total,fileName:q.name,carId:q.carId});

          // Evidence pages
          const evPdf=await PDFDocument.load(q.bytes);
          const evPageCount=evPdf.getPageCount();
          const copied=await mainPdf.copyPages(evPdf,Array.from({length:evPageCount},(_,i)=>i));
          copied.forEach((pg,pi)=>{
            mainPdf.addPage(pg);
            evidencePageMeta.push({pageIndex:mainPdf.getPageCount()-1,isDivider:false,
              fileIndex:q.index,fileTotal:q.total,fileName:q.name,carId:q.carId,
              evPageNum:pi+1,evPageTotal:evPageCount});
          });
        }
        window._pdfMergeQueue=[];

        // ── Pass 2: now we know total page count — stamp every evidence page ──
        const totalPages=mainPdf.getPageCount();
        const pages=mainPdf.getPages();

        evidencePageMeta.forEach(meta=>{
          const pg=pages[meta.pageIndex];
          const {width,height}=pg.getSize();
          const docPageNum=meta.pageIndex+1; // 1-based

          if(meta.isDivider){
            // Full dark divider page
            pg.drawRectangle({x:0,y:0,width,height,color:rgb(0.08,0.11,0.17)});
            // Centre label
            pg.drawRectangle({x:40,y:height/2-30,width:width-80,height:60,color:dark,borderRadius:4});
            pg.drawText("EVIDENCE OF CLOSURE",{x:width/2-100,y:height/2+12,size:16,font:boldFont,color:white});
            pg.drawText(`File ${meta.fileIndex} of ${meta.fileTotal}  —  ${meta.fileName}`,
              {x:width/2-100,y:height/2-4,size:9,font:normFont,color:light,maxWidth:width-80});
            pg.drawText(`CAR: ${meta.carId}`,{x:width/2-100,y:height/2-18,size:8,font:normFont,color:muted});
            // Footer
            pg.drawRectangle({x:0,y:0,width,height:18,color:dark});
            pg.drawText(`EVIDENCE OF CLOSURE  |  File ${meta.fileIndex} of ${meta.fileTotal}  |  ${meta.fileName}`,
              {x:14,y:6,size:6,font:boldFont,color:light,maxWidth:width-80});
            pg.drawText(`Page ${docPageNum} of ${totalPages}`,{x:width-60,y:6,size:6,font:normFont,color:light});
          } else {
            // Evidence content page — stamp header + footer over existing content
            // Header bar
            pg.drawRectangle({x:0,y:height-16,width,height:16,color:dark});
            pg.drawText(`EVIDENCE OF CLOSURE  —  File ${meta.fileIndex} of ${meta.fileTotal}`,
              {x:8,y:height-10,size:8,font:boldFont,color:white});
            // Filename right-aligned (truncate if long)
            const fname=meta.fileName.length>40?meta.fileName.slice(0,37)+"…":meta.fileName;
            pg.drawText(fname,{x:width-8-fname.length*4.2,y:height-10,size:7,font:normFont,color:light});
            pg.drawText(`CAR: ${meta.carId}  |  Evidence page ${meta.evPageNum} of ${meta.evPageTotal}`,
              {x:8,y:height-15,size:5.5,font:normFont,color:muted});
            // Footer bar
            pg.drawRectangle({x:0,y:0,width,height:14,color:dark});
            pg.drawText(`EVIDENCE OF CLOSURE  |  File ${meta.fileIndex} of ${meta.fileTotal}  |  ${meta.fileName}`,
              {x:8,y:5,size:6,font:boldFont,color:light,maxWidth:width-80});
            pg.drawText(`Page ${docPageNum} of ${totalPages}`,{x:width-60,y:5,size:6,font:normFont,color:light});
          }
        });

        const merged=await mainPdf.save();
        const url=URL.createObjectURL(new Blob([merged],{type:"application/pdf"}));
        const a=document.createElement("a"); a.href=url; a.download=`CAPA-Report-${car.id}.pdf`;
        a.click(); URL.revokeObjectURL(url);
        showToast("PDF report with all evidence generated","success");
        return;
      } catch(mergeErr){
        console.warn("PDF merge failed:",mergeErr);
        window._pdfMergeQueue=[];
        // Fall through to doc.save() below
      }
    }

    doc.save(`CAPA-Report-${car.id}.pdf`);
    showToast("PDF report generated","success");
  };

  const generateStatusReport = async() => {
    const{jsPDF}=await import("jspdf");
    const{default:autoTable}=await import("jspdf-autotable");
    const doc=new jsPDF("landscape");

    doc.setDrawColor(1,87,155); doc.setLineWidth(0.8); doc.line(14,30,270,30);
    doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(1,87,155);
    doc.text("CAPA STATUS REPORT",14,38);
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(100,100,100);
    doc.text("Pegasus Flyers (E.A.) Ltd. · "+`Generated: ${new Date().toLocaleDateString("en-GB")}  |  Total CARs: ${data.cars.length}`,14,44);
    doc.setTextColor(0,0,0);
    autoTable(doc,{startY:50,head:[["CAR #","Severity","Status","Department","Raised","Due","Resp. Manager"]],
      body:data.cars.map(c=>[c.id,c.severity,c.status,c.department||"—",fmt(c.date_raised),fmt(c.due_date),c.responsible_manager||"—"]),
      styles:{fontSize:9},headStyles:{fillColor:[1,87,155]},
      alternateRowStyles:{fillColor:[245,248,252]},
    });
    doc.save(`CAPA-Status-Report-${new Date().toISOString().slice(0,10)}.pdf`);
    showToast("Status report generated","success");
  };

  return (
    <div>
      <SectionHeader
        title="Corrective Action Requests"
        subtitle="CARs raised by Quality Manager or Quality Auditor"
        action={
          <div style={{ display:"flex", gap:10 }}>
            <Btn variant="outline" size="sm" onClick={generateStatusReport}>📊 Status Report</Btn>
            {canRaiseCAR&&<Btn size="sm" onClick={()=>{setSelected(null);setModal("car")}}>+ Raise CAR</Btn>}
          </div>
        }
      />
      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        {["all","Open","In Progress","Pending Verification","Closed","Overdue"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:"5px 14px", borderRadius:20, border:`1px solid ${filter===f?T.primary:T.border}`, background:filter===f?T.primary:"#fff", color:filter===f?"#fff":T.muted, fontSize:12, fontWeight:filter===f?600:400, cursor:"pointer" }}>
            {f==="all"?"All":f}
          </button>
        ))}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search CARs…"
          style={{ marginLeft:"auto", background:"#fff", border:`1px solid ${T.border}`, borderRadius:7, padding:"6px 14px", fontSize:12, width:220, color:T.text }} />
      </div>

      {/* Table */}
      <div className="card" style={{ overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f5f8fc" }}>
              {["CAR #","Finding","Clause","Severity","Status","Dept","Due Date","Resp. Manager","Actions"].map(h=>(
                <th key={h} style={{ padding:"10px 14px", textAlign:"left", color:T.muted, fontSize:10, fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length===0
              ? <tr><td colSpan={9} style={{ padding:32, textAlign:"center", color:T.muted }}>No CARs found</td></tr>
              : filtered.map(c=>{
                const od=isOverdue(c.due_date)&&!["Closed","Completed"].includes(c.status); const cap=getCAP(c.id); const verif=getVerif(c.id);
                return (
                  <tr key={c.id} className="row-hover" style={{ borderBottom:`1px solid ${T.border}`, background:od&&c.status!=="Closed"?"#fff8f8":"" }}>
                    <td style={{ padding:"10px 14px", fontFamily:"'Source Code Pro',monospace", color:T.primary, fontSize:11, fontWeight:600 }}>{c.id}</td>
                    <td style={{ padding:"10px 14px", maxWidth:220 }}>
                      <div className="tooltip-wrap">
                        <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:T.text, maxWidth:210 }}>{c.finding_description}</div>
                        <div className="tooltip-box"><strong style={{color:"#90caf9"}}>Finding:</strong><br/>{c.finding_description}</div>
                      </div>
                    </td>
                    <td style={{ padding:"10px 14px", maxWidth:160 }}>
                      <div className="tooltip-wrap">
                        <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontFamily:"'Source Code Pro',monospace", fontSize:11, color:T.muted, maxWidth:150 }}>{c.qms_clause||"—"}</div>
                        {c.qms_clause&&<div className="tooltip-box"><strong style={{color:"#90caf9"}}>QMS Clause:</strong><br/>{c.qms_clause}</div>}
                      </div>
                    </td>
                    <td style={{ padding:"10px 14px" }}><Badge label={c.severity}/></td>
                    <td style={{ padding:"10px 14px" }}><Badge label={c.status}/></td>
                    <td style={{ padding:"10px 14px", color:T.muted, fontSize:12 }}>{c.department||"—"}</td>
                    <td style={{ padding:"10px 14px", color:od?T.red:T.text, fontSize:12, fontWeight:od?600:400 }}>{fmt(c.due_date)}{od?` ⚠`:""}</td>
                    <td style={{ padding:"10px 14px", color:T.muted, fontSize:12 }}>{c.responsible_manager||"—"}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                        {canRaiseCAR&&<Btn size="sm" variant="ghost" onClick={()=>{setSelected(c);setModal("car")}}>Edit</Btn>}
                        <Btn size="sm" variant="outline" onClick={()=>{setSelected(c);setModal("detail")}} style={{color:T.teal,borderColor:T.teal}}>View</Btn>
                        {c.status!=="Closed"&&<Btn size="sm" variant="outline" onClick={()=>{setSelected(c);setModal("cap")}}>CAP</Btn>}
                        {c.status==="Pending Verification"&&["admin","quality_manager"].includes(profile?.role)&&
                          <Btn size="sm" variant="success" onClick={()=>{setSelected(c);setModal("verify")}}>Verify</Btn>}
                        {(cap||verif)&&<Btn size="sm" variant="ghost" onClick={()=>generateReport(c)}>📄 PDF</Btn>}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {modal==="car"&&<CARModal car={selected} managers={managers} onSave={saveCar} onClose={()=>setModal(null)} />}
      {modal==="cap"&&selected&&<CAPModal car={selected} cap={getCAP(selected.id)} onSave={saveCap} onClose={()=>setModal(null)} />}
      {modal==="verify"&&selected&&<VerificationModal car={selected} cap={getCAP(selected.id)} verif={getVerif(selected.id)} onSave={saveVerification} onClose={()=>setModal(null)} />}
      {modal==="detail"&&selected&&<CAPADetailModal car={selected} cap={getCAP(selected.id)} verif={getVerif(selected.id)} onPDF={()=>generateReport(selected)} onClose={()=>setModal(null)} />}
    </div>
  );
};

// ─── Generic Table Page ───────────────────────────────────────
const GenericPage = ({ title, subtitle, table, columns, modalFields, modalTitle, modalDefaults, data, canEdit, canDelete, user, profile, onRefresh, showToast, extraActions }) => {
  const [modal,  setModal]  = useState(false);
  const [editing,setEditing]= useState(null);
  const [search, setSearch] = useState("");
  const rows = (data[table]||[]).filter(r=>!search||JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  const save = async(form) => {
    const isNew = !data[table]?.find(r=>r.id===form.id);
    const payload={...form,updated_at:new Date().toISOString()};
    if(isNew){
      payload.created_by=user.id; payload.updated_by=user.id;
      const{error}=await supabase.from(table).insert(payload);
      if(error){showToast(`Error: ${error.message}`,"error");return;}
      await logChange({user,action:"created",table,recordId:form.id,recordTitle:form.title||form.name||form.id,newData:form});
      showToast("Record created","success");
    } else {
      payload.updated_by=user.id;
      const{error}=await supabase.from(table).update(payload).eq("id",form.id);
      if(error){showToast(`Error: ${error.message}`,"error");return;}
      await logChange({user,action:"updated",table,recordId:form.id,recordTitle:form.title||form.name||form.id,newData:form});
      showToast("Record updated","success");
    }
    setModal(false); setEditing(null); onRefresh();
  };

  const del = async(row) => {
    if(!window.confirm(`Delete ${row.id}?`)) return;
    const{error}=await supabase.from(table).delete().eq("id",row.id);
    if(error){showToast(`Error: ${error.message}`,"error");return;}
    await logChange({user,action:"deleted",table,recordId:row.id,recordTitle:row.title||row.name||row.id,oldData:row});
    showToast("Record deleted","info"); onRefresh();
  };

  return (
    <div>
      <SectionHeader title={title} subtitle={subtitle}
        action={
          <div style={{ display:"flex", gap:10 }}>
            {extraActions}
            {canEdit&&<Btn size="sm" onClick={()=>{setEditing(null);setModal(true)}}>+ Add New</Btn>}
          </div>
        }
      />
      <div style={{ marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`}
          style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:7, padding:"7px 14px", fontSize:12, width:280, color:T.text }} />
      </div>
      <div className="card" style={{ overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f5f8fc" }}>
              {columns.map(c=><th key={c.key} style={{ padding:"10px 14px", textAlign:"left", color:T.muted, fontSize:10, fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap" }}>{c.label}</th>)}
              {(canEdit||canDelete)&&<th style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}`, width:100 }} />}
            </tr>
          </thead>
          <tbody>
            {rows.length===0
              ? <tr><td colSpan={columns.length+1} style={{ padding:32, textAlign:"center", color:T.muted }}>No records found</td></tr>
              : rows.map((row,i)=>{
                const due=row.due_date||row.expiry_date||row.next_audit||row.date;
                const DONE=["Closed","Approved","Completed","Cancelled","Expired"]; const od=isOverdue(due)&&!DONE.includes(row.status);
                return (
                  <tr key={row.id||i} className="row-hover" style={{ borderBottom:`1px solid ${T.border}`, background:od?"#fff8f8":"" }}>
                    {columns.map(c=>(
                      <td key={c.key} style={{ padding:"10px 14px", color:T.text, verticalAlign:"middle" }}>
                        {c.badge ? <Badge label={row[c.key]} /> :
                         c.mono  ? <span style={{ fontFamily:"'Source Code Pro',monospace", color:T.primary, fontSize:11, fontWeight:600 }}>{row[c.key]}</span> :
                         c.due   ? <span style={{ color:od?T.red:(isApproaching(due)&&!DONE.includes(row.status))?T.yellow:T.text, fontWeight:od||(isApproaching(due)&&!DONE.includes(row.status))?600:400 }}>{fmt(row[c.key])}{od?" ⚠":""}</span> :
                         <span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:c.wrap?"normal":"nowrap", maxWidth:240 }}>{row[c.key]||"—"}</span>}
                      </td>
                    ))}
                    {(canEdit||canDelete)&&(
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", gap:5 }}>
                          {canEdit&&<Btn size="sm" variant="ghost" onClick={()=>{setEditing(row);setModal(true)}}>Edit</Btn>}
                          {canDelete&&<Btn size="sm" variant="danger" onClick={()=>del(row)} style={{ padding:"4px 10px", fontSize:11 }}>✕</Btn>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {modal&&(
        <GenericModal title={(editing?"Edit ":"New ")+modalTitle} fields={modalFields} defaults={editing||modalDefaults||{}} onSave={save} onClose={()=>{setModal(false);setEditing(null);}} />
      )}
    </div>
  );
};

// ─── Generic Modal ────────────────────────────────────────────
const GenericModal = ({ title, fields, defaults, onSave, onClose }) => {
  const [form, setForm] = useState(defaults||{});
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  return (
    <ModalShell title={title} onClose={onClose} wide>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
        {fields.map(f=>(
          <div key={f.key} style={{ gridColumn:f.full?"1/-1":"auto" }}>
            {f.type==="select"
              ? <Select label={f.label} value={form[f.key]||""} onChange={e=>set(f.key,e.target.value)}><option value="">Select…</option>{f.options.map(o=><option key={o}>{o}</option>)}</Select>
              : f.type==="textarea"
              ? <Textarea label={f.label} value={form[f.key]||""} onChange={e=>set(f.key,e.target.value)} />
              : <Input label={f.label} type={f.type||"text"} value={form[f.key]||""} onChange={e=>set(f.key,e.target.value)} />
            }
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>{onSave(form);onClose();}}>Save</Btn>
      </div>
    </ModalShell>
  );
};

// ─── Managers Settings Page ───────────────────────────────────
const ManagersPage = ({ managers, onRefresh, showToast, isAdmin }) => {
  const [editing, setEditing] = useState(null);
  const save = async(mgr) => {
    const{error}=await supabase.from(TABLES.managers).update({person_name:mgr.person_name,email:mgr.email,updated_at:new Date().toISOString()}).eq("id",mgr.id);
    if(error){showToast(`Error: ${error.message}`,"error");return;}
    showToast("Manager updated","success"); setEditing(null); onRefresh();
  };
  return (
    <div>
      <SectionHeader title="Responsible Managers" subtitle="Assign names and email addresses to each role" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {managers.map(m=>(
          <Card key={m.id}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:700, fontSize:14, color:T.primaryDk }}>{m.role_title}</div>
                <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{m.department}</div>
              </div>
              {isAdmin&&<Btn size="sm" variant="ghost" onClick={()=>setEditing({...m})}>Edit</Btn>}
            </div>
            <div style={{ marginTop:12, borderTop:`1px solid ${T.border}`, paddingTop:12 }}>
              <div style={{ fontSize:13, color:m.person_name?T.text:T.muted }}>{m.person_name||"— Name not set —"}</div>
              <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>{m.email||"— Email not set —"}</div>
            </div>
          </Card>
        ))}
      </div>
      {editing&&(
        <ModalShell title={`Edit: ${editing.role_title}`} onClose={()=>setEditing(null)}>
          <Input label="Person's Name" value={editing.person_name||""} onChange={e=>setEditing(p=>({...p,person_name:e.target.value}))} placeholder="e.g. John Smith" />
          <Input label="Email Address" type="email" value={editing.email||""} onChange={e=>setEditing(p=>({...p,email:e.target.value}))} placeholder="manager@company.com" />
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setEditing(null)}>Cancel</Btn>
            <Btn onClick={()=>save(editing)}>Save</Btn>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

// ─── About View ───────────────────────────────────────────────
const AboutView = () => {
  const year = new Date().getFullYear();

  const COMPLIANCE_DATA = [
    { std:"AS9100D / ISO 9001:2015", color:"#01579b", bg:"#e3f2fd", items:[
      { clause:"10.2.1", text:"Nonconformity & corrective action — full CAR/CAP workflow", ok:true },
      { clause:"10.2.2", text:"Evidence of corrective action effectiveness", ok:true },
      { clause:"10.2.3", text:"Review of corrective actions and trends", ok:true },
      { clause:"7.5",    text:"Control of documented information", ok:true },
      { clause:"7.5.3",  text:"Audit trail — full change log", ok:true },
      { clause:"8.4",    text:"Control of externally provided processes — contractor register", ok:true },
      { clause:"9.2",    text:"Internal audit programme", ok:true },
      { clause:"6.1",    text:"Actions to address risks and opportunities — Risk Register", ok:true },
      { clause:"9.3",    text:"Management review inputs (dashboard)", ok:"partial" },
      { clause:"4.1",    text:"Context of the organisation", ok:"partial" },
      { clause:"6.2",    text:"Quality objectives register", ok:false },
      { clause:"7.1.5",  text:"Calibration and measurement resources register", ok:false },
    ]},
    { std:"KCAA ATO Regulatory Requirements", color:"#2e7d32", bg:"#e8f5e9", items:[
      { clause:"CAP Tracking",  text:"System for tracking internal and KCAA-issued CAPs", ok:true },
      { clause:"Doc Control",   text:"Quality Manual and associated document control", ok:true },
      { clause:"Cert Tracking", text:"ATO certificate, approvals and regulatory document expiry", ok:true },
      { clause:"Contractors",   text:"Approved maintenance and service provider register", ok:true },
      { clause:"Audit Trail",   text:"Record of all quality-related actions and decisions", ok:true },
      { clause:"QM Amendment",  text:"System referenced in Quality Manual — amendment pending", ok:"partial" },
      { clause:"Training Rec.", text:"Instructor and student training records", ok:"planned" },
      { clause:"Occurrence",    text:"Mandatory occurrence reporting system", ok:"planned" },
      { clause:"Maintenance",   text:"Aircraft maintenance tracking and tech log", ok:"planned" },
    ]},
    { std:"ICAO Annex 19 — SMS Framework", color:"#e65100", bg:"#fff3e0", items:[
      { clause:"2.1", text:"Hazard identification — 7-category risk register", ok:true },
      { clause:"2.2", text:"Safety risk assessment — ICAO 5x5 matrix", ok:true },
      { clause:"2.3", text:"Safety risk mitigation and treatment tracking", ok:true },
      { clause:"3.1", text:"Safety performance monitoring — QMS compliance score", ok:true },
      { clause:"1.1", text:"Safety management commitment and responsibility", ok:"partial" },
      { clause:"1.4", text:"Safety Performance Indicators (SPIs) and targets", ok:false },
      { clause:"3.2", text:"Management of change workflow", ok:false },
      { clause:"4.1", text:"Training and education records", ok:"planned" },
      { clause:"4.2", text:"Safety communication and promotion log", ok:false },
    ]},
  ];

  const si = (ok) => ok===true?{icon:"✓",bg:"#e8f5e9",color:"#2e7d32"}:ok==="partial"?{icon:"~",bg:"#fff8e1",color:"#f57f17"}:ok==="planned"?{icon:"~",bg:"#e8eaf6",color:"#3949ab"}:{icon:"x",bg:"#ffebee",color:"#c62828"};
  const st = (ok) => ok===true?{label:"Compliant",bg:"#e8f5e9",color:"#2e7d32"}:ok==="partial"?{label:"Partial",bg:"#fff8e1",color:"#f57f17"}:ok==="planned"?{label:"Planned",bg:"#e8eaf6",color:"#3949ab"}:{label:"Gap",bg:"#ffebee",color:"#c62828"};

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:900 }}>

      {/* Hero */}
      <div className="card" style={{ background:`linear-gradient(135deg,${T.navy} 0%,#0d3060 100%)`, padding:"32px 36px", borderRadius:12, color:"#fff", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-40,right:-40,width:220,height:220,borderRadius:"50%",background:"rgba(255,255,255,0.03)" }}/>
        <div style={{ position:"absolute",bottom:-60,right:60,width:300,height:300,borderRadius:"50%",background:"rgba(255,255,255,0.02)" }}/>
        <div style={{ position:"relative", display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:20, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:32, fontWeight:800, letterSpacing:0.5, lineHeight:1 }}>
              AeroQualify <span style={{ color:T.sky }}>Pro</span>
            </div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginTop:6, fontWeight:300 }}>Aviation Quality Management System</div>
            <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
              {["AS9100D","ISO 9001:2015","ICAO Annex 19","KCAA ATO"].map(b=>(
                <span key={b} style={{ fontSize:10, fontWeight:700, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:4, padding:"3px 9px", letterSpacing:0.5 }}>{b}</span>
              ))}
            </div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontFamily:"'Source Code Pro',monospace", fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:4 }}>VERSION</div>
            <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:28, fontWeight:800, color:T.sky }}>3.0</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{year}</div>
          </div>
        </div>
      </div>

      {/* Legal Ownership */}
      <div className="card" style={{ padding:"24px 28px", borderLeft:`4px solid ${T.primary}` }}>
        <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:14, fontWeight:700, color:T.primaryDk, marginBottom:16 }}>Legal Ownership &amp; Copyright</div>
        <div style={{ background:T.primaryLt, borderRadius:8, padding:"16px 18px", marginBottom:16, border:`1px solid ${T.border}` }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.primaryDk, marginBottom:8 }}>Copyright Notice</div>
          <div style={{ fontSize:13, color:T.text, lineHeight:1.8 }}>
            Copyright &copy; {year} Kornelius Magita. All rights reserved.
          </div>
          <div style={{ fontSize:12, color:T.muted, marginTop:10, lineHeight:1.8 }}>
            AeroQualify Pro and all associated software, source code, design, documentation, workflows, and data structures — including all current and future versions and editions — are the exclusive intellectual property of Kornelius Magita No part of this software may be reproduced, distributed, modified, sublicensed, sold, or transferred to any third party without the express written consent of Kornelius Magita.
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            { label:"Software Owner",   value:"Kornelius Magita" },
            { label:"Rights",           value:"All rights reserved — full copyright" },
            { label:"Jurisdiction",     value:"Republic of Kenya" },
            { label:"Licence Type",     value:"Proprietary — not open source" },
            { label:"Covers",           value:"This and all future editions" },
            { label:"Unauthorised Use", value:"Strictly prohibited" },
          ].map(r=>(
            <div key={r.label} style={{ background:"#f8fafc", borderRadius:6, padding:"10px 14px", border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:3 }}>{r.label}</div>
              <div style={{ fontSize:13, color:T.text, fontWeight:600 }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="card" style={{ padding:"24px 28px" }}>
        <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:14, fontWeight:700, color:T.primaryDk, marginBottom:16 }}>System Information</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {[
            { label:"Platform",   value:"Web / Cloud (Vercel)" },
            { label:"Database",   value:"Supabase (PostgreSQL)" },
            { label:"Version",    value:"3.0.0" },
            { label:"Framework",  value:"React 18" },
            { label:"Auth",       value:"Supabase Auth (JWT)" },
            { label:"Backup",     value:"Daily — Google Drive" },
          ].map(r=>(
            <div key={r.label} style={{ background:"#f8fafc", borderRadius:6, padding:"10px 14px", border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:3 }}>{r.label}</div>
              <div style={{ fontFamily:"'Source Code Pro',monospace", fontSize:12, color:T.primary, fontWeight:600 }}>{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Checklist */}
      <div className="card" style={{ padding:"24px 28px" }}>
        <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:14, fontWeight:700, color:T.primaryDk, marginBottom:6 }}>Standards Compliance Checklist</div>
        <div style={{ fontSize:12, color:T.muted, marginBottom:16 }}>
          AeroQualify Pro is designed to support compliance with the standards below. This checklist reflects the current state of the system and is updated as new modules are developed.
        </div>
        {/* Legend */}
        <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:20, padding:"10px 14px", background:"#f8fafc", borderRadius:8, border:`1px solid ${T.border}` }}>
          {[{l:"Compliant",c:"#2e7d32"},{l:"Partial",c:"#f57f17"},{l:"Planned",c:"#3949ab"},{l:"Gap",c:"#c62828"}].map(x=>(
            <div key={x.l} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
              <div style={{ width:10,height:10,borderRadius:"50%",background:x.c }}/>
              <span style={{ color:T.muted }}>{x.l}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {COMPLIANCE_DATA.map(std=>(
            <div key={std.std} style={{ border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
              <div style={{ background:std.bg, padding:"12px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${T.border}`, flexWrap:"wrap", gap:8 }}>
                <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:13, fontWeight:700, color:std.color }}>{std.std}</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {[{ok:true,label:"compliant"},{ok:"partial",label:"partial"},{ok:false,label:"gaps"},{ok:"planned",label:"planned"}].map(b=>{
                    const cnt=std.items.filter(i=>i.ok===b.ok).length;
                    if(!cnt) return null;
                    const s=st(b.ok);
                    return <span key={b.label} style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:s.bg,color:s.color }}>{cnt} {b.label}</span>;
                  })}
                </div>
              </div>
              {std.items.map((item,idx)=>{
                const s=si(item.ok); const tag=st(item.ok);
                return (
                  <div key={item.clause} style={{ display:"grid", gridTemplateColumns:"28px 100px 1fr 90px", alignItems:"center", gap:12, padding:"10px 18px", borderBottom:idx<std.items.length-1?`1px solid #f0f3f7`:"none" }}>
                    <div style={{ width:22,height:22,borderRadius:"50%",background:s.bg,color:s.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0 }}>{s.icon}</div>
                    <span style={{ fontFamily:"'Source Code Pro',monospace",fontSize:10,fontWeight:600,color:T.primary,background:"#e3f2fd",padding:"3px 8px",borderRadius:4,whiteSpace:"nowrap" }}>{item.clause}</span>
                    <span style={{ fontSize:12,color:T.text }}>{item.text}</span>
                    <span style={{ fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:10,textAlign:"center",background:tag.bg,color:tag.color,whiteSpace:"nowrap" }}>{tag.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign:"center", fontSize:11, color:T.muted, paddingBottom:8 }}>
        AeroQualify Pro &nbsp;&middot;&nbsp; Copyright &copy; {year} Kornelius Magita. All rights reserved. &nbsp;&middot;&nbsp; v3.0.0
      </div>
    </div>
  );
};

// ─── Change Log View ──────────────────────────────────────────
const ChangeLogView = ({ logs }) => (
  <div>
    <SectionHeader title="Change Log" subtitle="Full audit trail of all system changes" />
    <Card>
      <div style={{ overflowY:"auto", maxHeight:"calc(100vh - 240px)" }}>
        {logs.length===0
          ? <div style={{ textAlign:"center", color:T.muted, padding:32 }}>No changes recorded yet</div>
          : logs.map((log,i)=>(
            <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.border}`, alignItems:"flex-start" }}>
              <div style={{ width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${T.primary},${T.sky})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0 }}>
                {(log.user_name||"?")[0].toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:T.text }}>
                  <span style={{ color:T.primary, fontWeight:600 }}>{log.user_name}</span>
                  {" "}<span style={{ color:log.action?.includes("delet")?T.red:log.action?.includes("creat")?T.green:T.yellow, fontWeight:500 }}>{log.action}</span>
                  {" "}<span style={{ fontFamily:"'Source Code Pro',monospace", color:T.muted, fontSize:11 }}>{log.table_name}/{log.record_id}</span>
                </div>
                {log.record_title&&<div style={{ fontSize:12, color:T.muted, marginTop:1 }}>{log.record_title}</div>}
                <div style={{ fontSize:11, color:T.light, marginTop:1 }}>{new Date(log.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
      </div>
    </Card>
  </div>
);

// ─── Column configs ───────────────────────────────────────────
const DOC_COLS = [
  {key:"id",label:"ID",mono:true},{key:"title",label:"Title",wrap:true},{key:"rev",label:"Rev"},{key:"doc_section",label:"Section"},
  {key:"category",label:"Category"},{key:"status",label:"Status",badge:true},{key:"owner",label:"Owner"},
  {key:"date",label:"Date"},{key:"expiry_date",label:"Expiry",due:true},{key:"approved_by",label:"Approved By"},
];
const FLIGHT_DOC_COLS = [
  {key:"id",label:"ID",mono:true},{key:"title",label:"Title",wrap:true},{key:"doc_type",label:"Type",badge:true},
  {key:"issuing_body",label:"Issuing Body"},{key:"issue_date",label:"Issue Date"},{key:"expiry_date",label:"Expiry",due:true},{key:"status",label:"Status",badge:true},
];
const AUDIT_COLS = [
  {key:"id",label:"ID",mono:true},{key:"title",label:"Title",wrap:true},{key:"type",label:"Type",badge:true},
  {key:"status",label:"Status",badge:true},{key:"lead",label:"Lead"},{key:"scope",label:"Scope"},
  {key:"date",label:"Date",due:true},{key:"findings",label:"Findings"},{key:"obs",label:"Obs."},
];
const CONTRACTOR_COLS = [
  {key:"id",label:"ID",mono:true},{key:"name",label:"Contractor"},{key:"category",label:"Category"},
  {key:"status",label:"Status",badge:true},{key:"rating",label:"Rating",badge:true},
  {key:"contact",label:"Contact"},{key:"country",label:"Country"},
  {key:"last_audit",label:"Last Audit"},{key:"next_audit",label:"Next Audit",due:true},
];

const DOC_FIELDS = [
  {key:"id",label:"Document ID"},{key:"title",label:"Title",full:true},
  {key:"rev",label:"Revision"},{key:"status",label:"Status",type:"select",options:["Draft","In Review","Approved","Obsolete"]},
  {key:"doc_section",label:"Section",type:"select",options:["Operations Manual","Training Manual","Safety Manual","Maintenance Manual","Quality Manual","SOPs","Checklists","Forms","Policies","Other"]},
  {key:"category",label:"Category",type:"select",options:["Core QMS","Engineering","Procurement","Equipment","Audit","Risk","HR","Production","Training","Safety","Maintenance"]},
  {key:"owner",label:"Owner"},{key:"date",label:"Date",type:"date"},{key:"expiry_date",label:"Expiry Date",type:"date"},{key:"approved_by",label:"Approved By"},
];
const FLIGHT_DOC_FIELDS = [
  {key:"id",label:"Document ID"},{key:"title",label:"Title",full:true},
  {key:"doc_type",label:"Type",type:"select",options:["Air Operator Certificate","Approved Training Organisation","Aircraft Registration","Certificate of Airworthiness","Radio License","Insurance Certificate","Aerodrome Approval","Air Traffic Service Agreement","Dangerous Goods Approval","Other Approval","Other Certificate"]},
  {key:"issuing_body",label:"Issuing Authority"},{key:"issue_date",label:"Issue Date",type:"date"},
  {key:"expiry_date",label:"Expiry Date",type:"date"},
  {key:"status",label:"Status",type:"select",options:["Valid","Expired","Pending Renewal","Suspended"]},
  {key:"notes",label:"Notes",full:true,type:"textarea"},
];
const AUDIT_FIELDS = [
  {key:"id",label:"Audit ID"},{key:"title",label:"Title",full:true},
  {key:"type",label:"Type",type:"select",options:["Internal","Supplier","External","Regulatory","Surveillance"]},
  {key:"status",label:"Status",type:"select",options:["Scheduled","In Progress","Completed"]},
  {key:"lead",label:"Lead Auditor"},{key:"scope",label:"Scope"},{key:"date",label:"Date",type:"date"},
  {key:"findings",label:"Findings #",type:"number"},{key:"obs",label:"Observations #",type:"number"},
];
const CONTRACTOR_FIELDS = [
  {key:"id",label:"Contractor ID"},{key:"name",label:"Company Name",full:true},
  {key:"category",label:"Category",type:"select",options:["Aircraft Maintenance Organisation (AMO)","Avionics & Instruments","Fuel Supplier","Ground Handling","Aircraft Parts & Supplies","Simulator Provider","Medical Examiner (AME)","Meteorological Services","Air Traffic Services","Insurance Provider","Catering & Facilities","IT & Software Services","Training Device Maintenance","Security Services"]},
  {key:"status",label:"Status",type:"select",options:["Approved","Conditional","Probation","Disqualified"]},
  {key:"rating",label:"Rating",type:"select",options:["A+","A","B","C","F"]},
  {key:"contact",label:"Contact Email"},{key:"country",label:"Country"},
  {key:"last_audit",label:"Last Audit Date",type:"date"},{key:"next_audit",label:"Next Audit Date",type:"date"},
];


// ─── Risk Register ────────────────────────────────────────────
// ICAO SMS Annex 19 — 5×5 Risk Matrix
// Severity: Catastrophic(5) / Hazardous(4) / Major(3) / Minor(2) / Negligible(1)
// Likelihood: Frequent(5) / Occasional(4) / Remote(3) / Improbable(2) / Extremely Improbable(1)
// Risk Index = Severity × Likelihood
// Critical ≥15 | High 10–14 | Medium 5–9 | Low ≤4

const RISK_SEVERITY = [
  {value:5,label:"Catastrophic",desc:"Hull loss, multiple fatalities"},
  {value:4,label:"Hazardous",   desc:"Serious injury, major damage"},
  {value:3,label:"Major",       desc:"Serious incident, injury"},
  {value:2,label:"Minor",       desc:"Incident, minor injury"},
  {value:1,label:"Negligible",  desc:"Nuisance, little consequence"},
];
const RISK_LIKELIHOOD = [
  {value:5,label:"Frequent",              desc:"Likely to occur many times"},
  {value:4,label:"Occasional",            desc:"Likely to occur sometimes"},
  {value:3,label:"Remote",                desc:"Unlikely but possible"},
  {value:2,label:"Improbable",            desc:"Very unlikely to occur"},
  {value:1,label:"Extremely Improbable",  desc:"Almost inconceivable"},
];
const RISK_CATEGORIES = ["Flight Operations","Ground Operations","Training","Maintenance","Security","Environmental","Organisational"];

const riskRating=(s,l)=>{
  const idx=s*l;
  if(idx>=15) return {label:"Critical",color:"#b71c1c",bg:"#ffebee"};
  if(idx>=10) return {label:"High",    color:"#e65100",bg:"#fff3e0"};
  if(idx>=5)  return {label:"Medium",  color:"#f57f17",bg:"#fffde7"};
  return              {label:"Low",    color:"#2e7d32",bg:"#e8f5e9"};
};

const RiskMatrix = ({ severity, likelihood, onSelect }) => {
  const sev=[5,4,3,2,1]; const lik=[1,2,3,4,5];
  const cellColor=(s,l)=>{
    const r=riskRating(s,l);
    const isSelected=s===severity&&l===likelihood;
    return {background:isSelected?r.color:r.bg, color:isSelected?"#fff":r.color,
      border:isSelected?`2px solid ${r.color}`:`1px solid ${r.color}33`,
      fontWeight:isSelected?700:400, transform:isSelected?"scale(1.08)":"scale(1)", transition:"all 0.15s"};
  };
  return (
    <div style={{ overflowX:"auto", marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 }}>
        Risk Matrix — click to select Severity × Likelihood
      </div>
      <table style={{ borderCollapse:"collapse", fontSize:11 }}>
        <thead>
          <tr>
            <th style={{ padding:"6px 10px", background:"#f5f8fc", border:`1px solid ${T.border}`, fontSize:10, color:T.muted, whiteSpace:"nowrap" }}>Severity ↓ / Likelihood →</th>
            {lik.map(l=><th key={l} style={{ padding:"6px 10px", background:"#f5f8fc", border:`1px solid ${T.border}`, textAlign:"center", minWidth:70, fontSize:10, color:T.muted }}>
              {RISK_LIKELIHOOD.find(x=>x.value===l)?.label}
            </th>)}
          </tr>
        </thead>
        <tbody>
          {sev.map(s=>(
            <tr key={s}>
              <td style={{ padding:"6px 10px", background:"#f5f8fc", border:`1px solid ${T.border}`, fontWeight:600, fontSize:11, color:T.text, whiteSpace:"nowrap" }}>
                {RISK_SEVERITY.find(x=>x.value===s)?.label}
              </td>
              {lik.map(l=>{
                const r=riskRating(s,l); const cs=cellColor(s,l);
                return (
                  <td key={l} onClick={()=>onSelect&&onSelect(s,l)}
                    style={{ padding:"8px 6px", border:`1px solid ${T.border}`, textAlign:"center", cursor:onSelect?"pointer":"default", ...cs, userSelect:"none", borderRadius:4 }}>
                    <div style={{ fontSize:12, fontWeight:cs.fontWeight }}>{s*l}</div>
                    <div style={{ fontSize:9, marginTop:1 }}>{r.label}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display:"flex", gap:12, marginTop:8, flexWrap:"wrap" }}>
        {[{label:"Critical",color:"#b71c1c"},{label:"High",color:"#e65100"},{label:"Medium",color:"#f57f17"},{label:"Low",color:"#2e7d32"}].map(r=>(
          <div key={r.label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11 }}>
            <div style={{ width:12,height:12,borderRadius:2,background:r.color }}/>
            <span style={{ color:T.muted }}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const RiskModal = ({ risk, cars, onSave, onClose }) => {
  const genId=()=>`RSK-${String(Date.now()).slice(-6)}`;
  const [form, setForm] = useState(risk || { id:genId(), status:"Open", severity:3, likelihood:3 });
  const [showMatrix, setShowMatrix] = useState(false);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  const inherentRating = riskRating(Number(form.severity)||1, Number(form.likelihood)||1);
  const residualRating = riskRating(Number(form.residual_severity||form.severity)||1, Number(form.residual_likelihood||form.likelihood)||1);

  return (
    <ModalShell title={(risk?"Edit":"New")+" Hazard / Risk"} onClose={onClose} wide>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 20px" }}>
        {/* Identification */}
        <div style={{ gridColumn:"1/-1", fontSize:11, fontWeight:700, color:T.primary, letterSpacing:1, textTransform:"uppercase", marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${T.border}` }}>1. Hazard Identification</div>
        <div style={{ gridColumn:"1/-1" }}>
          <Input label="Hazard ID" value={form.id} onChange={e=>set("id",e.target.value)} />
        </div>
        <Select label="Category" value={form.category||""} onChange={e=>set("category",e.target.value)}>
          <option value="">Select…</option>
          {RISK_CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </Select>
        <Input label="Date Identified" type="date" value={form.date_identified||""} onChange={e=>set("date_identified",e.target.value)} />
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Hazard Description" value={form.hazard_description||""} onChange={e=>set("hazard_description",e.target.value)} rows={2}/>
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Potential Consequence" value={form.consequence||""} onChange={e=>set("consequence",e.target.value)} rows={2}/>
        </div>
        <Input label="Identified By" value={form.identified_by||""} onChange={e=>set("identified_by",e.target.value)} />
        <Select label="Linked CAR (optional)" value={form.linked_car_id||""} onChange={e=>set("linked_car_id",e.target.value)}>
          <option value="">None</option>
          {cars.map(c=><option key={c.id} value={c.id}>{c.id}</option>)}
        </Select>

        {/* Inherent Risk */}
        <div style={{ gridColumn:"1/-1", fontSize:11, fontWeight:700, color:T.yellow, letterSpacing:1, textTransform:"uppercase", marginTop:8, marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${T.border}` }}>2. Inherent Risk (Before Controls)</div>
        <div style={{ gridColumn:"1/-1" }}>
          <button onClick={()=>setShowMatrix(p=>!p)} style={{ background:T.primaryLt, border:`1px solid ${T.border}`, borderRadius:6, padding:"6px 14px", fontSize:12, color:T.primary, cursor:"pointer", marginBottom:8 }}>
            {showMatrix?"Hide":"Show"} 5×5 Risk Matrix
          </button>
          {showMatrix&&<RiskMatrix severity={Number(form.severity)} likelihood={Number(form.likelihood)} onSelect={(s,l)=>{set("severity",s);set("likelihood",l);}} />}
        </div>
        <Select label="Severity" value={String(form.severity||3)} onChange={e=>set("severity",Number(e.target.value))}>
          {RISK_SEVERITY.map(s=><option key={s.value} value={s.value}>{s.value} — {s.label}</option>)}
        </Select>
        <Select label="Likelihood" value={String(form.likelihood||3)} onChange={e=>set("likelihood",Number(e.target.value))}>
          {RISK_LIKELIHOOD.map(l=><option key={l.value} value={l.value}>{l.value} — {l.label}</option>)}
        </Select>
        <div style={{ gridColumn:"1/-1", background:inherentRating.bg, border:`1px solid ${inherentRating.color}44`, borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontWeight:700, color:inherentRating.color, fontSize:22, fontFamily:"'Oxanium',sans-serif" }}>{(Number(form.severity)||1)*(Number(form.likelihood)||1)}</div>
          <div>
            <div style={{ fontWeight:700, color:inherentRating.color, fontSize:13 }}>Inherent Risk: {inherentRating.label}</div>
            <div style={{ fontSize:11, color:T.muted }}>Severity {form.severity} × Likelihood {form.likelihood}</div>
          </div>
        </div>

        {/* Controls & Treatment */}
        <div style={{ gridColumn:"1/-1", fontSize:11, fontWeight:700, color:T.teal, letterSpacing:1, textTransform:"uppercase", marginTop:8, marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${T.border}` }}>3. Risk Controls & Treatment</div>
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Existing Controls" value={form.existing_controls||""} onChange={e=>set("existing_controls",e.target.value)} rows={2}/>
        </div>
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Treatment Action" value={form.treatment_action||""} onChange={e=>set("treatment_action",e.target.value)} rows={2}/>
        </div>
        <Input label="Responsible Person" value={form.responsible_person||""} onChange={e=>set("responsible_person",e.target.value)} />
        <Input label="Target Date" type="date" value={form.target_date||""} onChange={e=>set("target_date",e.target.value)} />

        {/* Residual Risk */}
        <div style={{ gridColumn:"1/-1", fontSize:11, fontWeight:700, color:T.green, letterSpacing:1, textTransform:"uppercase", marginTop:8, marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${T.border}` }}>4. Residual Risk (After Controls)</div>
        <Select label="Residual Severity" value={String(form.residual_severity||form.severity||3)} onChange={e=>set("residual_severity",Number(e.target.value))}>
          {RISK_SEVERITY.map(s=><option key={s.value} value={s.value}>{s.value} — {s.label}</option>)}
        </Select>
        <Select label="Residual Likelihood" value={String(form.residual_likelihood||form.likelihood||3)} onChange={e=>set("residual_likelihood",Number(e.target.value))}>
          {RISK_LIKELIHOOD.map(l=><option key={l.value} value={l.value}>{l.value} — {l.label}</option>)}
        </Select>
        <div style={{ gridColumn:"1/-1", background:residualRating.bg, border:`1px solid ${residualRating.color}44`, borderRadius:8, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontWeight:700, color:residualRating.color, fontSize:22, fontFamily:"'Oxanium',sans-serif" }}>{(Number(form.residual_severity||form.severity)||1)*(Number(form.residual_likelihood||form.likelihood)||1)}</div>
          <div>
            <div style={{ fontWeight:700, color:residualRating.color, fontSize:13 }}>Residual Risk: {residualRating.label}</div>
            <div style={{ fontSize:11, color:T.muted }}>After controls applied</div>
          </div>
        </div>

        {/* Status */}
        <div style={{ gridColumn:"1/-1", fontSize:11, fontWeight:700, color:T.muted, letterSpacing:1, textTransform:"uppercase", marginTop:8, marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${T.border}` }}>5. Review & Status</div>
        <Select label="Status" value={form.status||"Open"} onChange={e=>set("status",e.target.value)}>
          {["Open","Under Treatment","Monitoring","Closed"].map(s=><option key={s}>{s}</option>)}
        </Select>
        <Input label="Review Date" type="date" value={form.review_date||""} onChange={e=>set("review_date",e.target.value)} />
        <div style={{ gridColumn:"1/-1" }}>
          <Textarea label="Review Notes" value={form.review_notes||""} onChange={e=>set("review_notes",e.target.value)} rows={2}/>
        </div>
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:12 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>{
          const rs=Number(form.residual_severity||form.severity)||1;
          const rl=Number(form.residual_likelihood||form.likelihood)||1;
          const is=Number(form.severity)||1; const il=Number(form.likelihood)||1;
          onSave({...form,
            inherent_index:is*il, inherent_rating:riskRating(is,il).label,
            residual_index:rs*rl, residual_rating:riskRating(rs,rl).label,
          });
          onClose();
        }}>Save Risk</Btn>
      </div>
    </ModalShell>
  );
};

const RiskRegisterView = ({ data, user, profile, managers, onRefresh, showToast }) => {
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter]   = useState("all");
  const [catFilter, setCat]   = useState("all");
  const [search, setSearch]   = useState("");
  const [showMatrix, setShowMatrix] = useState(false);

  const canEdit   = ["admin","quality_manager","quality_auditor"].includes(profile?.role);
  const isAdmin   = profile?.role==="admin";

  const risks = (data.risks||[])
    .filter(r=>filter==="all"||r.residual_rating===filter)
    .filter(r=>catFilter==="all"||r.category===catFilter)
    .filter(r=>!search||JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total:    (data.risks||[]).length,
    critical: (data.risks||[]).filter(r=>r.residual_rating==="Critical"&&r.status!=="Closed").length,
    high:     (data.risks||[]).filter(r=>r.residual_rating==="High"&&r.status!=="Closed").length,
    open:     (data.risks||[]).filter(r=>r.status==="Open").length,
    closed:   (data.risks||[]).filter(r=>r.status==="Closed").length,
  };

  const save = async(form) => {
    const isNew=!(data.risks||[]).find(r=>r.id===form.id);
    const payload={...form, updated_at:new Date().toISOString()};
    if(isNew) payload.created_at=new Date().toISOString();
    const{error}=await supabase.from(TABLES.risks).upsert(payload);
    if(error){showToast(`Error: ${error.message}`,"error");return;}
    await logChange({user,action:isNew?"created risk":"updated risk",table:"risk_register",recordId:form.id,recordTitle:form.hazard_description?.slice(0,60)||form.id,newData:form});
    showToast(isNew?"Risk added":"Risk updated","success");
    onRefresh();
  };

  const del = async(r) => {
    if(!window.confirm(`Delete risk ${r.id}?`)) return;
    await supabase.from(TABLES.risks).delete().eq("id",r.id);
    showToast("Risk deleted","success"); onRefresh();
  };

  const ratingColors={Critical:"#b71c1c",High:"#e65100",Medium:"#f57f17",Low:"#2e7d32"};

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

      {/* KPI strip */}
      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        {[
          {label:"Total Hazards",  value:stats.total,    color:T.primary, icon:"⚠️"},
          {label:"Critical Risks", value:stats.critical, color:"#b71c1c",  icon:"🔴"},
          {label:"High Risks",     value:stats.high,     color:"#e65100",  icon:"🟠"},
          {label:"Open",           value:stats.open,     color:T.yellow,   icon:"📋"},
          {label:"Closed",         value:stats.closed,   color:T.green,    icon:"✅"},
        ].map(k=>(
          <div key={k.label} className="card" style={{ flex:1, minWidth:120, padding:"16px 18px", borderTop:`3px solid ${k.color}` }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:28, fontFamily:"'Oxanium',sans-serif", fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:11, color:T.text, fontWeight:600, marginTop:4 }}>{k.label}</div>
              </div>
              <span style={{ fontSize:20, opacity:0.6 }}>{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 5×5 Matrix toggle */}
      <div className="card" style={{ padding:"14px 18px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:showMatrix?14:0 }}>
          <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:700, fontSize:14, color:T.primaryDk }}>ICAO SMS 5×5 Risk Matrix</div>
          <Btn size="sm" variant="ghost" onClick={()=>setShowMatrix(p=>!p)}>{showMatrix?"Hide Matrix":"Show Matrix"}</Btn>
        </div>
        {showMatrix&&<RiskMatrix />}
      </div>

      {/* Toolbar */}
      <SectionHeader title="Hazard & Risk Register" subtitle="ICAO SMS Annex 19 — Identify, assess and treat operational hazards"
        action={canEdit&&<Btn size="sm" onClick={()=>{setEditing(null);setModal(true)}}>+ Add Hazard</Btn>}
      />
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:4 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search risks…"
          style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:7, padding:"7px 14px", fontSize:12, width:220, color:T.text }} />
        <select value={filter} onChange={e=>setFilter(e.target.value)}
          style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:7, padding:"7px 12px", fontSize:12, color:T.text }}>
          <option value="all">All Ratings</option>
          {["Critical","High","Medium","Low"].map(r=><option key={r}>{r}</option>)}
        </select>
        <select value={catFilter} onChange={e=>setCat(e.target.value)}
          style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:7, padding:"7px 12px", fontSize:12, color:T.text }}>
          <option value="all">All Categories</option>
          {RISK_CATEGORIES.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Risk table */}
      <div className="card" style={{ overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f5f8fc" }}>
              {[["Risk ID","mono"],["Category",""],["Hazard Description","wrap"],["Inherent",""],["Residual",""],["Status",""],["Responsible",""],["Target Date","due"],["Linked CAR",""]].map(([label])=>(
                <th key={label} style={{ padding:"10px 14px", textAlign:"left", color:T.muted, fontSize:10, fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap" }}>{label}</th>
              ))}
              {(canEdit||isAdmin)&&<th style={{ padding:"10px 14px", borderBottom:`1px solid ${T.border}`, width:100 }}/>}
            </tr>
          </thead>
          <tbody>
            {risks.length===0
              ? <tr><td colSpan={10} style={{ padding:32, textAlign:"center", color:T.muted }}>No risks found — click "+ Add Hazard" to begin</td></tr>
              : risks.map(r=>{
                const ir=riskRating(r.inherent_index?Math.round(Math.sqrt(r.inherent_index)):Number(r.severity)||1, r.inherent_index?Math.round(r.inherent_index/(Math.round(Math.sqrt(r.inherent_index))||1)):Number(r.likelihood)||1);
                const rr={label:r.residual_rating||"Low",color:ratingColors[r.residual_rating]||T.green,bg:(riskRating(Number(r.residual_severity||r.severity)||1,Number(r.residual_likelihood||r.likelihood)||1)).bg};
                const od=r.target_date&&!["Closed","Monitoring","Completed"].includes(r.status)&&isOverdue(r.target_date);
                return (
                  <tr key={r.id} className="row-hover" style={{ borderBottom:`1px solid ${T.border}`, background:od?"#fff8f8":"" }}>
                    <td style={{ padding:"10px 14px" }}><span style={{ fontFamily:"'Source Code Pro',monospace", color:T.primary, fontSize:11, fontWeight:600 }}>{r.id}</span></td>
                    <td style={{ padding:"10px 14px", fontSize:12, color:T.muted }}>{r.category||"—"}</td>
                    <td style={{ padding:"10px 14px", maxWidth:220 }}><span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={r.hazard_description}>{r.hazard_description||"—"}</span></td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ background:(riskRating(Number(r.severity)||1,Number(r.likelihood)||1)).bg, color:(riskRating(Number(r.severity)||1,Number(r.likelihood)||1)).color, padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:600 }}>
                        {r.inherent_index||((Number(r.severity)||1)*(Number(r.likelihood)||1))} — {r.inherent_rating||(riskRating(Number(r.severity)||1,Number(r.likelihood)||1)).label}
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px" }}>
                      <span style={{ background:rr.bg, color:rr.color, padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:600 }}>
                        {r.residual_index||((Number(r.residual_severity||r.severity)||1)*(Number(r.residual_likelihood||r.likelihood)||1))} — {r.residual_rating||"—"}
                      </span>
                    </td>
                    <td style={{ padding:"10px 14px" }}><Badge label={r.status||"Open"}/></td>
                    <td style={{ padding:"10px 14px", fontSize:12, color:T.muted }}>{r.responsible_person||"—"}</td>
                    <td style={{ padding:"10px 14px" }}><span style={{ color:od?T.red:T.muted, fontWeight:od?600:400, fontSize:12 }}>{fmt(r.target_date)}{od?" ⚠":""}</span></td>
                    <td style={{ padding:"10px 14px" }}>
                      {r.linked_car_id
                        ? <span style={{ fontFamily:"'Source Code Pro',monospace", color:T.primary, fontSize:11 }}>{r.linked_car_id}</span>
                        : <span style={{ color:T.light, fontSize:11 }}>—</span>}
                    </td>
                    {(canEdit||isAdmin)&&(
                      <td style={{ padding:"10px 14px" }}>
                        <div style={{ display:"flex", gap:5 }}>
                          {canEdit&&<Btn size="sm" variant="ghost" onClick={()=>{setEditing(r);setModal(true)}}>Edit</Btn>}
                          {isAdmin&&<Btn size="sm" variant="danger" onClick={()=>del(r)} style={{ padding:"4px 10px", fontSize:11 }}>✕</Btn>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {modal&&<RiskModal risk={editing} cars={data.cars||[]} onSave={save} onClose={()=>{setModal(false);setEditing(null);}}/>}
    </div>
  );
};

// ─── TABS ─────────────────────────────────────────────────────
const TABS = [
  {id:"dashboard",    label:"Dashboard",       icon:"▦",  group:"main"},
  {id:"cars",         label:"CARs",            icon:"📋", group:"main"},
  {id:"documents",    label:"Documents",       icon:"📄", group:"main"},
  {id:"flightdocs",   label:"Flight School Docs",icon:"🏫",group:"main"},
  {id:"audits",       label:"Audits",          icon:"🔍", group:"main"},
  {id:"contractors",  label:"Contractors",     icon:"🔧", group:"main"},
  {id:"risks",        label:"Risk Register",   icon:"⚠️", group:"main"},
  {id:"managers",     label:"Managers",        icon:"👥", group:"settings"},
  {id:"changelog",    label:"Change Log",      icon:"📋", group:"settings"},
  {id:"about",        label:"About",           icon:"(i)", group:"settings"},
];

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [user,setUser]         = useState(null);
  const [profile,setProfile]   = useState(null);
  const [managers,setManagers] = useState([]);
  const [data,setData]         = useState({cars:[],caps:[],verifications:[],documents:[],flightDocs:[],audits:[],contractors:[],changeLog:[],risks:[]});
  const [activeTab,setTab]     = useState("dashboard");
  const [toast,setToast]       = useState(null);
  const [loading,setLoading]   = useState(true);
  const subs                   = useRef([]);

  const showToast = useCallback((msg,type="success")=>setToast({message:msg,type}),[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session?.user)setUser(session.user); else setLoading(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,session)=>{
      setUser(session?.user||null); if(!session?.user){setLoading(false);setProfile(null);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  const loadAll = useCallback(async()=>{
    if(!user)return;
    try{
      const [cars,caps,verifs,docs,fdocs,audits,contractors,logs,mgrs,prof]=await Promise.all([
        supabase.from(TABLES.cars).select("*").order("created_at",{ascending:false}),
        supabase.from(TABLES.caps).select("*"),
        supabase.from(TABLES.verifications).select("*"),
        supabase.from(TABLES.documents).select("*").order("created_at",{ascending:false}),
        supabase.from(TABLES.flightDocs).select("*").order("expiry_date",{ascending:true}),
        supabase.from(TABLES.audits).select("*").order("date",{ascending:true}),
        supabase.from(TABLES.contractors).select("*").order("name",{ascending:true}),
        supabase.from(TABLES.changeLog).select("*").order("created_at",{ascending:false}).limit(200),
        supabase.from(TABLES.managers).select("*").order("id"),
        supabase.from(TABLES.profiles).select("*").eq("id",user.id).single(),
      ]);
      // Risk register loaded separately — gracefully handles missing table
      const risksRes = await supabase.from(TABLES.risks).select("*").order("created_at",{ascending:false});
      setData({
        cars:cars.data||[],caps:caps.data||[],verifications:verifs.data||[],
        documents:docs.data||[],flightDocs:fdocs.data||[],audits:audits.data||[],
        contractors:contractors.data||[],changeLog:logs.data||[],
        risks:risksRes.error?[]:risksRes.data||[],
      });
      setManagers(mgrs.data||[]);
      setProfile(prof.data);
    } catch(err){
      console.error("loadAll error:",err);
    } finally {
      setLoading(false);
    }
  },[user]);

  useEffect(()=>{ loadAll(); },[loadAll]);

  useEffect(()=>{
    if(!user||loading)return;
    const tables=["cars","caps","capa_verifications","documents","flight_school_docs","audits","contractors","change_log","risk_register"];
    subs.current=tables.map(t=>
      supabase.channel(`rt-${t}`).on("postgres_changes",{event:"*",schema:"public",table:t},()=>loadAll()).subscribe()
    );
    return()=>{subs.current.forEach(s=>s.unsubscribe());};
  },[user,loading,loadAll]);

  const isAdmin  = profile?.role==="admin";
  const isQM     = ["admin","quality_manager"].includes(profile?.role);
  const canEdit  = ["admin","quality_manager","quality_auditor","manager"].includes(profile?.role);

  const alertItems = [
    ...data.cars.filter(c=>!["Closed","Completed"].includes(c.status)&&(isOverdue(c.due_date)||isApproaching(c.due_date))).map(c=>({id:c.id,due:c.due_date})),
    ...data.flightDocs.filter(d=>!["Expired","Approved"].includes(d.status)&&(isOverdue(d.expiry_date)||isApproaching(d.expiry_date))).map(d=>({id:d.id,due:d.expiry_date})),
    ...data.audits.filter(a=>a.status==="Scheduled"&&isOverdue(a.date)).map(a=>({id:a.id,due:a.date})),
    ...(data.risks||[]).filter(r=>!["Closed","Monitoring"].includes(r.status)&&isOverdue(r.target_date)).map(r=>({id:r.id,due:r.target_date})),
  ];

  const counts = {
    cars:      data.cars.filter(c=>["Open","In Progress"].includes(c.status)).length,
    flightdocs:data.flightDocs.filter(d=>!["Expired","Approved"].includes(d.status)&&(isApproaching(d.expiry_date)||isOverdue(d.expiry_date))).length,
    audits:    data.audits.filter(a=>a.status==="Scheduled"&&isOverdue(a.date)).length,
  };

  if(!user) return <LoginScreen onLogin={setUser}/>;
  if(loading) return (
    <div style={{ height:"100vh", background:"#eef2f7", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14 }}>
      <GlobalStyle/>
      <div style={{ fontFamily:"'Oxanium',sans-serif", fontSize:28, fontWeight:800, color:T.primary }}>AeroQualify Pro</div>
      <div style={{ color:T.muted, fontSize:13 }}>Connecting to database…</div>
      <div style={{ width:32, height:32, border:`3px solid ${T.border}`, borderTop:`3px solid ${T.primary}`, borderRadius:"50%", animation:"spin 1s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, overflow:"hidden" }}>
      <GlobalStyle/>
      {/* Top stripe */}
      <div style={{ position:"fixed", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${T.primary},${T.sky},${T.teal})`, zIndex:200 }} />

      {/* ── Sidebar ──────────────────────────────── */}
      <aside style={{ width:220, flexShrink:0, background:"#fff", borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", marginTop:3, boxShadow:"2px 0 8px rgba(0,0,0,0.04)" }}>
        {/* Logo */}
        <div style={{ padding:"20px 16px 16px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${T.primary},${T.sky})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,boxShadow:"0 2px 8px rgba(1,87,155,0.25)" }}>✈</div>
            <div>
              <div style={{ fontFamily:"'Oxanium',sans-serif", fontWeight:800, fontSize:17, color:T.primaryDk, lineHeight:1 }}>AeroQualify</div>
              <div style={{ fontSize:9, color:T.muted, letterSpacing:1.5, textTransform:"uppercase" }}>Pro · QMS</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"10px 8px", overflowY:"auto" }}>
          <div style={{ fontSize:9, color:T.light, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", padding:"6px 8px 4px", marginBottom:2 }}>Main</div>
          {TABS.filter(t=>t.group==="main").map(t=>{
            const cnt=counts[t.id]; const active=activeTab===t.id;
            return (
              <button key={t.id} className={`nav-item${active?" active":""}`} onClick={()=>setTab(t.id)}
                style={{ width:"100%",textAlign:"left",background:"transparent",border:"none",borderLeft:"3px solid transparent",borderRadius:"0 7px 7px 0",padding:"9px 12px",color:active?T.primary:T.muted,fontWeight:active?600:400,fontSize:13,display:"flex",alignItems:"center",gap:9,marginBottom:1,transition:"all 0.15s" }}>
                <span style={{ fontSize:15,width:20,textAlign:"center" }}>{t.icon}</span>
                <span style={{ flex:1 }}>{t.label}</span>
                {cnt?<span style={{ background:T.red,color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:700 }}>{cnt}</span>:null}
              </button>
            );
          })}
          <div style={{ fontSize:9, color:T.light, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", padding:"14px 8px 4px", marginBottom:2 }}>Settings</div>
          {TABS.filter(t=>t.group==="settings").map(t=>{
            const active=activeTab===t.id;
            return (
              <button key={t.id} className={`nav-item${active?" active":""}`} onClick={()=>setTab(t.id)}
                style={{ width:"100%",textAlign:"left",background:"transparent",border:"none",borderLeft:"3px solid transparent",borderRadius:"0 7px 7px 0",padding:"9px 12px",color:active?T.primary:T.muted,fontWeight:active?600:400,fontSize:13,display:"flex",alignItems:"center",gap:9,marginBottom:1,transition:"all 0.15s" }}>
                <span style={{ fontSize:15,width:20,textAlign:"center" }}>{t.icon}</span>
                <span style={{ flex:1 }}>{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding:"12px 14px", borderTop:`1px solid ${T.border}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:10 }}>
            <div style={{ width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${T.primary},${T.sky})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0 }}>
              {(profile?.full_name||user.email)[0].toUpperCase()}
            </div>
            <div style={{ flex:1,overflow:"hidden" }}>
              <div style={{ fontSize:12,color:T.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{profile?.full_name||user.email}</div>
              <div style={{ marginTop:2 }}><Badge label={profile?.role||"viewer"}/></div>
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={()=>supabase.auth.signOut()} style={{ width:"100%",textAlign:"center" }}>Sign Out</Btn>
          <div style={{ fontSize:10,color:T.green,marginTop:8,display:"flex",alignItems:"center",gap:5 }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:T.green,display:"inline-block",animation:"pulse 2s infinite" }}/>
            Live sync active
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────── */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",marginTop:3 }}>
        <AlertBanner items={alertItems}/>

        {/* Header */}
        <header style={{ background:"#fff",borderBottom:`1px solid ${T.border}`,padding:"12px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <div>
            <div style={{ fontFamily:"'Oxanium',sans-serif",fontSize:20,fontWeight:700,color:T.primaryDk }}>
              {TABS.find(t=>t.id===activeTab)?.label}
            </div>
            <div style={{ fontSize:11,color:T.muted }}>{new Date().toLocaleDateString("en-GB",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ fontSize:11,color:T.muted,textAlign:"right" }}>
              <div>{profile?.role?.replace("_"," ").replace(/\b\w/g,l=>l.toUpperCase())}</div>
              <div style={{ color:T.light }}>AS9100D · ISO 9001:2015</div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex:1,overflowY:"auto",padding:24 }}>
          {activeTab==="dashboard" && <Dashboard data={data}/>}
          {activeTab==="cars" && <CARsView data={data} user={user} profile={profile} managers={managers} onRefresh={loadAll} showToast={showToast}/>}
          {activeTab==="documents" && <GenericPage title="Documents" subtitle="QMS documents with revision control" table="documents" columns={DOC_COLS} modalFields={DOC_FIELDS} modalTitle="Document" modalDefaults={{status:"Draft",rev:"Rev 1",date:today()}} data={data} canEdit={canEdit} canDelete={isAdmin} user={user} profile={profile} onRefresh={loadAll} showToast={showToast}/>}
          {activeTab==="flightdocs" && <GenericPage title="Flight School Documents" subtitle="Approvals, certificates and regulatory documents" table="flight_school_docs" columns={FLIGHT_DOC_COLS} modalFields={FLIGHT_DOC_FIELDS} modalTitle="Flight School Document" modalDefaults={{status:"Valid",issue_date:today()}} data={{flight_school_docs:data.flightDocs}} canEdit={isQM} canDelete={isAdmin} user={user} profile={profile} onRefresh={loadAll} showToast={showToast}/>}
          {activeTab==="audits" && <GenericPage title="Audits" subtitle="Internal, external and supplier audits" table="audits" columns={AUDIT_COLS} modalFields={AUDIT_FIELDS} modalTitle="Audit" modalDefaults={{status:"Scheduled",findings:0,obs:0}} data={data} canEdit={isQM} canDelete={isAdmin} user={user} profile={profile} onRefresh={loadAll} showToast={showToast}/>}
          {activeTab==="contractors" && <GenericPage title="Contractors" subtitle="Approved contractor register" table="contractors" columns={CONTRACTOR_COLS} modalFields={CONTRACTOR_FIELDS} modalTitle="Contractor" modalDefaults={{status:"Approved",rating:"A"}} data={data} canEdit={isAdmin} canDelete={isAdmin} user={user} profile={profile} onRefresh={loadAll} showToast={showToast}/>}
          {activeTab==="risks"    && <RiskRegisterView data={data} user={user} profile={profile} managers={managers} onRefresh={loadAll} showToast={showToast}/>}
          {activeTab==="managers" && <ManagersPage managers={managers} onRefresh={loadAll} showToast={showToast} isAdmin={isAdmin}/>}
          {activeTab==="changelog" && <ChangeLogView logs={data.changeLog}/>}
          {activeTab==="about"     && <AboutView />}
        </div>
      </div>

      {toast&&<Toast message={toast.message} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}
