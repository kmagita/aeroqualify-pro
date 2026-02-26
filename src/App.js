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
  const [file, setFile] = useState(null);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const allFilled = form.immediate_action&&form.root_cause_analysis&&form.corrective_action&&form.preventive_action&&(form.evidence_url||file);
  return (
    <ModalShell title={`CAP Form – ${car?.id}`} onClose={onClose} wide>
      <div style={{ background:T.primaryLt, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:T.primaryDk }}>
        <strong>Finding:</strong> {car?.finding_description} &nbsp;|&nbsp; <strong>Clause:</strong> {car?.qms_clause}
      </div>
      <Textarea label="Immediate Corrective Action" rows={3} value={form.immediate_action||""} onChange={e=>set("immediate_action",e.target.value)} />
      <Textarea label="Root Cause Analysis" rows={4} value={form.root_cause_analysis||""} onChange={e=>set("root_cause_analysis",e.target.value)} />
      <Textarea label="Corrective Action" rows={3} value={form.corrective_action||""} onChange={e=>set("corrective_action",e.target.value)} />
      <Textarea label="Preventive Action" rows={3} value={form.preventive_action||""} onChange={e=>set("preventive_action",e.target.value)} />
      <div style={{ marginBottom:14 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:600, color:T.muted, letterSpacing:0.8, textTransform:"uppercase", marginBottom:4 }}>Evidence of Closure</label>
        <input type="file" onChange={e=>setFile(e.target.files[0])} style={{ fontSize:13, color:T.text }} />
        {form.evidence_filename&&<div style={{ fontSize:12, color:T.green, marginTop:4 }}>✓ {form.evidence_filename} already uploaded</div>}
      </div>
      {allFilled&&<div style={{ background:T.greenLt, borderRadius:8, padding:"10px 14px", fontSize:12, color:T.green, marginBottom:14 }}>✓ All fields complete — CAR will be set to <strong>Pending Verification</strong> upon save.</div>}
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>onSave(form, file)}>Submit CAP</Btn>
      </div>
    </ModalShell>
  );
};

// ─── Verification Form Modal ──────────────────────────────────
const VerificationModal = ({ car, cap, verif, onSave, onClose }) => {
  const [form, setForm] = useState(verif || {
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
          {cap.evidence_filename&&<div style={{ marginTop:4, color:T.green }}><strong>Evidence:</strong> {cap.evidence_filename}</div>}
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
                <div style={{ background:"#f5f8fc",borderRadius:8,padding:"12px 14px" }}>
                  <div style={{ fontSize:10,fontWeight:700,color:T.muted,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6 }}>Evidence of Closure</div>
                  {cap.evidence_filename
                    ? <div style={{ fontSize:13,color:T.green,fontWeight:600 }}>✓ {cap.evidence_filename}</div>
                    : <div style={{ fontSize:13,color:T.muted }}>— No evidence uploaded</div>}
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

  const saveCap = async(form, file) => {
    let evidence_url=form.evidence_url, evidence_filename=form.evidence_filename;
    if(file){
      const path=`evidence/${selected.id}/${file.name}`;
      const{data:up,error:ue}=await supabase.storage.from("capa-evidence").upload(path,file,{upsert:true});
      if(!ue){
        const{data:url}=supabase.storage.from("capa-evidence").getPublicUrl(path);
        evidence_url=url.publicUrl; evidence_filename=file.name;
      }
    }
    const allFilled = form.immediate_action&&form.root_cause_analysis&&form.corrective_action&&form.preventive_action&&(evidence_url||file);
    const capPayload={...form,evidence_url,evidence_filename,submitted_by:user.id,submitted_by_name:profile?.full_name||user.email,submitted_at:new Date().toISOString(),status:allFilled?"Complete":"Pending"};
    const{error}=await supabase.from(TABLES.caps).upsert(capPayload);
    if(error){showToast(`Error: ${error.message}`,"error");return;}
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
    const doc=new jsPDF(); const cap=getCAP(car.id); const verif=getVerif(car.id);
    // Pegasus letterhead (logo omitted in PDF — add manually if needed)
    doc.setDrawColor(1,87,155); doc.setLineWidth(0.8); doc.line(14,30,196,30);
    doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(1,87,155);
    doc.text("CORRECTIVE ACTION REQUEST — CAPA REPORT",14,38);
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(100,100,100);
    doc.text("Pegasus Flyers (E.A.) Ltd. · P.O Box 3341-00100 Wilson Airport, Nairobi Kenya · Tel: +254206001467/8",14,44);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")}`,160,44);
    doc.setTextColor(0,0,0);
    autoTable(doc,{startY:35,head:[["Field","Details"]],body:[
      ["CAR Number",car.id],["Status",car.status],["Severity",car.severity],
      ["Date Raised",fmt(car.date_raised)],["Due Date",fmt(car.due_date)],
      ["QMS Clause",car.qms_clause||"—"],["Department",car.department||"—"],
      ["Responsible Manager",car.responsible_manager||"—"],
      ["Finding",car.finding_description||"—"],
    ],styles:{fontSize:10},headStyles:{fillColor:[1,87,155]}});
    if(cap){
      const y=doc.lastAutoTable.finalY+8;
      doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.text("Corrective Action Plan",14,y);
      autoTable(doc,{startY:y+5,head:[["Field","Details"]],body:[
        ["Immediate Action",cap.immediate_action||"—"],
        ["Root Cause",cap.root_cause_analysis||"—"],
        ["Corrective Action",cap.corrective_action||"—"],
        ["Preventive Action",cap.preventive_action||"—"],
        ["Evidence",cap.evidence_filename||"—"],
      ],styles:{fontSize:10},headStyles:{fillColor:[1,87,155]}});
    }
    if(verif){
      const y=doc.lastAutoTable.finalY+8;
      doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.text("Verification",14,y);
      autoTable(doc,{startY:y+5,head:[["Check","Result"]],body:[
        ["Immediate Action","    "+(verif.immediate_action_ok?"✓ Yes":"✗ No")],
        ["Root Cause","    "+(verif.root_cause_ok?"✓ Yes":"✗ No")],
        ["Corrective Action","    "+(verif.corrective_action_ok?"✓ Yes":"✗ No")],
        ["Preventive Action","    "+(verif.preventive_action_ok?"✓ Yes":"✗ No")],
        ["Evidence","    "+(verif.evidence_ok?"✓ Yes":"✗ No")],
        ["Effectiveness",verif.effectiveness_rating||"—"],
        ["Comments",verif.verifier_comments||"—"],
      ],styles:{fontSize:10},headStyles:{fillColor:[46,125,50]}});
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
    autoTable(doc,{startY:50,head:[["CAR #","Finding","Clause","Severity","Status","Raised","Due","Resp. Manager"]],
      body:data.cars.map(c=>[c.id,c.finding_description?.slice(0,40)||"—",c.qms_clause||"—",c.severity,c.status,fmt(c.date_raised),fmt(c.due_date),c.responsible_manager||"—"]),
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
                const od=isOverdue(c.due_date); const cap=getCAP(c.id); const verif=getVerif(c.id);
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
                const od=isOverdue(due)&&row.status!=="Closed"&&row.status!=="Approved";
                return (
                  <tr key={row.id||i} className="row-hover" style={{ borderBottom:`1px solid ${T.border}`, background:od?"#fff8f8":"" }}>
                    {columns.map(c=>(
                      <td key={c.key} style={{ padding:"10px 14px", color:T.text, verticalAlign:"middle" }}>
                        {c.badge ? <Badge label={row[c.key]} /> :
                         c.mono  ? <span style={{ fontFamily:"'Source Code Pro',monospace", color:T.primary, fontSize:11, fontWeight:600 }}>{row[c.key]}</span> :
                         c.due   ? <span style={{ color:od?T.red:isApproaching(due)?T.yellow:T.text, fontWeight:od||isApproaching(due)?600:400 }}>{fmt(row[c.key])}{od?" ⚠":""}</span> :
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

// ─── TABS ─────────────────────────────────────────────────────
const TABS = [
  {id:"dashboard",    label:"Dashboard",       icon:"▦",  group:"main"},
  {id:"cars",         label:"CARs",            icon:"📋", group:"main"},
  {id:"documents",    label:"Documents",       icon:"📄", group:"main"},
  {id:"flightdocs",   label:"Flight School Docs",icon:"🏫",group:"main"},
  {id:"audits",       label:"Audits",          icon:"🔍", group:"main"},
  {id:"contractors",  label:"Contractors",     icon:"🔧", group:"main"},
  {id:"managers",     label:"Managers",        icon:"👥", group:"settings"},
  {id:"changelog",    label:"Change Log",      icon:"📋", group:"settings"},
];

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [user,setUser]         = useState(null);
  const [profile,setProfile]   = useState(null);
  const [managers,setManagers] = useState([]);
  const [data,setData]         = useState({cars:[],caps:[],verifications:[],documents:[],flightDocs:[],audits:[],contractors:[],changeLog:[]});
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
    setData({
      cars:cars.data||[],caps:caps.data||[],verifications:verifs.data||[],
      documents:docs.data||[],flightDocs:fdocs.data||[],audits:audits.data||[],
      contractors:contractors.data||[],changeLog:logs.data||[],
    });
    setManagers(mgrs.data||[]);
    setProfile(prof.data);
    setLoading(false);
  },[user]);

  useEffect(()=>{ loadAll(); },[loadAll]);

  useEffect(()=>{
    if(!user||loading)return;
    const tables=["cars","caps","capa_verifications","documents","flight_school_docs","audits","contractors","change_log"];
    subs.current=tables.map(t=>
      supabase.channel(`rt-${t}`).on("postgres_changes",{event:"*",schema:"public",table:t},()=>loadAll()).subscribe()
    );
    return()=>{subs.current.forEach(s=>s.unsubscribe());};
  },[user,loading,loadAll]);

  const isAdmin  = profile?.role==="admin";
  const isQM     = ["admin","quality_manager"].includes(profile?.role);
  const canEdit  = ["admin","quality_manager","quality_auditor","manager"].includes(profile?.role);

  const alertItems = [
    ...data.cars.filter(c=>c.status!=="Closed"&&(isOverdue(c.due_date)||isApproaching(c.due_date))).map(c=>({id:c.id,due:c.due_date})),
    ...data.flightDocs.filter(d=>d.status!=="Expired"&&(isOverdue(d.expiry_date)||isApproaching(d.expiry_date))).map(d=>({id:d.id,due:d.expiry_date})),
    ...data.audits.filter(a=>a.status==="Scheduled"&&isApproaching(a.date)).map(a=>({id:a.id,due:a.date})),
  ];

  const counts = {
    cars:      data.cars.filter(c=>["Open","In Progress"].includes(c.status)).length,
    flightdocs:data.flightDocs.filter(d=>isApproaching(d.expiry_date)||isOverdue(d.expiry_date)).length,
    audits:    data.audits.filter(a=>a.status==="Scheduled"&&isApproaching(a.date)).length,
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
          {activeTab==="managers" && <ManagersPage managers={managers} onRefresh={loadAll} showToast={showToast} isAdmin={isAdmin}/>}
          {activeTab==="changelog" && <ChangeLogView logs={data.changeLog}/>}
        </div>
      </div>

      {toast&&<Toast message={toast.message} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}
