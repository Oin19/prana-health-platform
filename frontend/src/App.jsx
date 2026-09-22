import { useMemo, useState } from "react";

const nav = [
  ["overview", "▦", "Dashboard"],
  ["patients", "♙", "Patients"],
  ["screening", "＋", "New Screening"],
  ["alerts", "♧", "Alerts & Referrals"],
  ["analytics", "◫", "PHC Analytics"],
  ["chatbot", "◌", "Regional Chatbot"],
  ["settings", "⚙", "Settings"],
];

const patients = [
  { id:"PRA-1024", name:"Anita Devi", age:54, gender:"Female", location:"Ward 12", risk:"HIGH", condition:"Hypertension", status:"Referred", phone:"+91 98XXXXXX21", last:"21 Sep 2026", score:82 },
  { id:"PRA-1023", name:"Ramesh Kumar", age:47, gender:"Male", location:"Ward 8", risk:"HIGH", condition:"Diabetes", status:"Pending", phone:"+91 97XXXXXX48", last:"21 Sep 2026", score:76 },
  { id:"PRA-1022", name:"Sunita Sharma", age:61, gender:"Female", location:"Ward 4", risk:"MEDIUM", condition:"Cardiovascular", status:"Monitoring", phone:"+91 99XXXXXX13", last:"20 Sep 2026", score:58 },
  { id:"PRA-1021", name:"Mohan Lal", age:39, gender:"Male", location:"Ward 16", risk:"LOW", condition:"General", status:"Complete", phone:"+91 96XXXXXX77", last:"20 Sep 2026", score:21 },
  { id:"PRA-1020", name:"Kamla Devi", age:66, gender:"Female", location:"Ward 3", risk:"HIGH", condition:"Diabetes", status:"Referred", phone:"+91 95XXXXXX09", last:"19 Sep 2026", score:88 },
  { id:"PRA-1019", name:"Vijay Singh", age:52, gender:"Male", location:"Ward 9", risk:"MEDIUM", condition:"Hypertension", status:"Monitoring", phone:"+91 94XXXXXX32", last:"19 Sep 2026", score:49 },
  { id:"PRA-1018", name:"Meena Joshi", age:44, gender:"Female", location:"Ward 6", risk:"LOW", condition:"General", status:"Complete", phone:"+91 93XXXXXX64", last:"18 Sep 2026", score:17 },
  { id:"PRA-1017", name:"Arjun Mehta", age:58, gender:"Male", location:"Ward 14", risk:"HIGH", condition:"Cardiovascular", status:"Pending", phone:"+91 92XXXXXX51", last:"18 Sep 2026", score:71 },
];

const trend = [
  { month:"Jan", screened:45, high:12 }, { month:"Feb", screened:52, high:15 },
  { month:"Mar", screened:48, high:10 }, { month:"Apr", screened:61, high:18 },
  { month:"May", screened:59, high:14 }, { month:"Jun", screened:67, high:22 },
];

function RiskBadge({risk}){ return <span className={"risk "+risk.toLowerCase()}>{risk}</span>; }

function Topbar(){
  return <header className="topbar"><div className="mobile-brand">PRANA</div><div className="top-actions"><button className="icon-btn">⌕</button><button className="icon-btn">♧</button><div className="user"><div className="avatar">PS</div><div><strong>Priya Sharma</strong><span>ASHA / ANM</span></div><span className="chevron">⌄</span></div></div></header>;
}

function Dashboard(){
  const max=70;
  return <>
    <Topbar/>
    <div className="page-head"><div><div className="eyebrow">PHC COMMAND CENTER</div><h1>District Overview</h1><p>Population health metrics for Jaipur District</p></div><div className="head-controls"><span className="live-dot">● Live data</span><select defaultValue="30"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></div></div>
    <section className="metric-grid">
      <Metric icon="♙" label="Patients Screened" value="1,284" change="+12.5%" note="vs previous period"/>
      <Metric icon="!" label="High-Risk Cases" value="186" change="+8.2%" note="requiring attention" danger/>
      <Metric icon="↗" label="Referrals" value="74" change="+6.4%" note="this period"/>
      <Metric icon="✓" label="Completed Assessments" value="1,098" change="+14.1%" note="85.5% completion"/>
    </section>
    <section className="chart-grid">
      <Card title="Prevalence by Disease Condition" subtitle="Flagged cases from completed screenings"><div className="donut-wrap"><div className="donut"><div><strong>1,284</strong><span>screened</span></div></div><div className="legend"><Legend color="blue" name="Cardiovascular" value="31%"/><Legend color="orange" name="Diabetes" value="24%"/><Legend color="red" name="Hypertension" value="35%"/><Legend color="purple" name="Anemia" value="10%"/></div></div></Card>
      <Card title="Screening Trends & High Risk Detection" subtitle="Monthly screening activity"><div className="bar-chart">{trend.map(item=><div className="bar-group" key={item.month}><div className="bars"><div className="bar screened" style={{height:(item.screened/max)*150}}/><div className="bar high" style={{height:(item.high/max)*150}}/></div><span>{item.month}</span></div>)}</div><div className="chart-key"><span><i className="key screened"/>Total Screened</span><span><i className="key high"/>High Risk</span></div></Card>
    </section>
    <section className="table-card"><div className="section-head"><div><h2>Recent District High-Risk Referrals</h2><p>Patients requiring follow-up or specialist care</p></div><button className="text-btn">View all →</button></div><PatientTable rows={patients.filter(p=>p.risk!=="LOW").slice(0,4)}/></section>
  </>;
}

function PatientsPage(){
  const [query,setQuery]=useState(""); const [risk,setRisk]=useState("ALL"); const [condition,setCondition]=useState("ALL"); const [selected,setSelected]=useState(null);
  const filtered=useMemo(()=>patients.filter(p=>(risk==="ALL"||p.risk===risk)&&(condition==="ALL"||p.condition===condition)&&Object.values(p).join(" ").toLowerCase().includes(query.toLowerCase())),[query,risk,condition]);
  return <>
    <Topbar/>
    <div className="page-head patients-head"><div><div className="eyebrow">PATIENT REGISTRY</div><h1>Patients</h1><p>View and manage patients registered through PHC screenings.</p></div><button className="primary-btn">＋ New Patient</button></div>
    <div className="patient-summary"><Summary label="Total Patients" value="1,284"/><Summary label="High Risk" value="186" danger/><Summary label="Pending Follow-up" value="74"/><Summary label="Completed" value="1,098"/></div>
    <section className="table-card patient-card">
      <div className="filter-row"><div className="search-box"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by patient name, ID, ward..."/></div><select value={risk} onChange={e=>setRisk(e.target.value)}><option value="ALL">All risk levels</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select><select value={condition} onChange={e=>setCondition(e.target.value)}><option value="ALL">All conditions</option><option>Diabetes</option><option>Hypertension</option><option>Cardiovascular</option><option>General</option></select><span className="result-count">{filtered.length} patients</span></div>
      <PatientTable rows={filtered} onSelect={setSelected}/>
    </section>
    {selected&&<PatientModal patient={selected} onClose={()=>setSelected(null)}/>}
  </>;
}

function PatientTable({rows,onSelect}){ return <div className="table-wrap"><table><thead><tr><th>PATIENT</th><th>ID</th><th>AGE / GENDER</th><th>LOCATION</th><th>PRIMARY RISK</th><th>RISK</th><th>STATUS</th><th></th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><strong>{p.name}</strong></td><td>{p.id}</td><td>{p.age} / {p.gender[0]}</td><td>{p.location}</td><td>{p.condition}</td><td><RiskBadge risk={p.risk}/></td><td><span className="status">{p.status}</span></td><td><button className="row-btn" onClick={()=>onSelect?.(p)}>View</button></td></tr>)}</tbody></table>{rows.length===0&&<div className="empty-state">No patients match the selected filters.</div>}</div>; }

function PatientModal({patient,onClose}){ return <div className="modal-backdrop" onClick={onClose}><div className="patient-modal" onClick={e=>e.stopPropagation()}><button className="close-btn" onClick={onClose}>×</button><div className="profile-head"><div className="profile-avatar">{patient.name.split(" ").map(x=>x[0]).join("")}</div><div><div className="eyebrow">PATIENT PROFILE · {patient.id}</div><h2>{patient.name}</h2><p>{patient.age} years · {patient.gender} · {patient.location}</p></div><RiskBadge risk={patient.risk}/></div><div className="detail-grid"><Detail label="Primary condition" value={patient.condition}/><Detail label="Risk score" value={patient.score+"/100"}/><Detail label="Last screening" value={patient.last}/><Detail label="Contact" value={patient.phone}/><Detail label="Referral status" value={patient.status}/><Detail label="Assigned area" value={patient.location}/></div><div className="profile-note"><strong>Risk assessment</strong><p>This profile is based on the latest recorded screening. Clinical decisions should be made by qualified healthcare professionals.</p></div><div className="modal-actions"><button className="secondary-btn" onClick={onClose}>Close</button><button className="primary-btn">Open screening history</button></div></div></div>; }

function Detail({label,value}){return <div><span>{label}</span><strong>{value}</strong></div>}
function Summary({label,value,danger}){return <div className="summary-card"><span>{label}</span><strong className={danger?"summary-danger":""}>{value}</strong></div>}
function Metric({icon,label,value,change,note,danger}){return <div className="metric-card"><div className={"metric-icon "+(danger?"danger":"")}>{icon}</div><div className="metric-copy"><span>{label}</span><strong>{value}</strong><small><b className={danger?"down":""}>{change}</b> {note}</small></div></div>}
function Legend({color,name,value}){return <div className="legend-row"><span><i className={"legend-dot "+color}/>{name}</span><strong>{value}</strong></div>}
function Card({title,subtitle,children}){return <div className="chart-card"><div className="card-title"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="dots">•••</button></div>{children}</div>}
function Placeholder({title,text}){return <div className="placeholder"><div className="placeholder-icon">◫</div><h2>{title}</h2><p>{text}</p><span>Module ready for the next build step</span></div>}

export default function App(){
  const [active,setActive]=useState("overview");
  const label=nav.find(([id])=>id===active)?.[2]||"Dashboard";
  return <div className="shell"><aside className="sidebar"><div className="logo"><div className="logo-mark">♡</div><div><strong>PRANA</strong><span>Health Risk Platform</span></div></div><nav>{nav.map(([id,icon,text])=><button key={id} className={active===id?"active":""} onClick={()=>setActive(id)}><span className="nav-icon">{icon}</span>{text}</button>)}</nav><div className="sidebar-bottom"><div className="help">?</div><span>Help & Support</span></div></aside><main className="main">{active==="overview"?<Dashboard/>:active==="patients"?<PatientsPage/>:<><Topbar/><div className="page-head"><div><div className="eyebrow">PRANA WORKSPACE</div><h1>{label}</h1><p>Manage the {label.toLowerCase()} workflow from one place.</p></div></div><Placeholder title={label} text={"The "+label.toLowerCase()+" module is scaffolded and ready to connect to live data."}/></>}</main></div>;
}
