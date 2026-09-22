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

function ScreeningPage(){
  const [step,setStep]=useState(1);
  const [patient,setPatient]=useState("");
  const [form,setForm]=useState({age:"",bp:"",glucose:"",bmi:"",smoking:"No",diabetes:"No",hypertension:"No",chestPain:"No",breathlessness:"No",fatigue:"No"});
  const [submitted,setSubmitted]=useState(false);
  const update=(k,v)=>setForm(x=>({...x,[k]:v}));
  const score=useMemo(()=>{let n=0;if(Number(form.bp)>=140)n+=25;if(Number(form.glucose)>=126)n+=25;if(Number(form.bmi)>=30)n+=10;if(form.smoking==="Yes")n+=10;if(form.diabetes==="Yes")n+=10;if(form.hypertension==="Yes")n+=10;if(form.chestPain==="Yes")n+=5;if(form.breathlessness==="Yes")n+=5;if(form.fatigue==="Yes")n+=3;return Math.min(100,n)},[form]);
  const risk=score>=60?"HIGH":score>=30?"MEDIUM":"LOW";
  const next=()=>{if(step===1&&!patient)return;setStep(Math.min(3,step+1))};
  return <><Topbar/><div className="page-head"><div><div className="eyebrow">SCREENING WORKFLOW</div><h1>New Health Screening</h1><p>Record a screening assessment and generate a preliminary risk profile.</p></div><span className="screening-id">Draft · PRANA-SCR-{new Date().getTime().toString().slice(-6)}</span></div>
    <div className="stepper"><div className={step>=1?"step active":"step"}><b>1</b><span>Patient</span></div><i/><div className={step>=2?"step active":"step"}><b>2</b><span>Assessment</span></div><i/><div className={step>=3?"step active":"step"}><b>3</b><span>Review</span></div></div>
    {submitted?<section className="success-card"><div className="success-icon">✓</div><div className="eyebrow">SCREENING RECORDED</div><h2>Assessment completed</h2><p>The preliminary risk profile has been generated for <strong>{patients.find(p=>p.id===patient)?.name||"the patient"}</strong>.</p><div className={"result-risk "+risk.toLowerCase()}>{risk} RISK · {score}/100</div><div className="modal-actions"><button className="secondary-btn" onClick={()=>{setSubmitted(false);setStep(1);setPatient("");setForm({age:"",bp:"",glucose:"",bmi:"",smoking:"No",diabetes:"No",hypertension:"No",chestPain:"No",breathlessness:"No",fatigue:"No"})}}>Start another screening</button><button className="primary-btn">Open patient profile</button></div></section>:
    <section className="screening-card">
      {step===1&&<><div className="form-title"><h2>Select patient</h2><p>Choose an existing patient or enter a new patient reference.</p></div><label>Patient <span>*</span><select value={patient} onChange={e=>{setPatient(e.target.value);const p=patients.find(x=>x.id===e.target.value);if(p)update("age",String(p.age))}}><option value="">Select patient...</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name} · {p.id} · {p.location}</option>)}</select></label><div className="selected-patient">{patient?<><div className="profile-avatar small">{patients.find(p=>p.id===patient)?.name.split(" ").map(x=>x[0]).join("")}</div><div><strong>{patients.find(p=>p.id===patient)?.name}</strong><span>{patients.find(p=>p.id===patient)?.age} years · {patients.find(p=>p.id===patient)?.gender} · {patients.find(p=>p.id===patient)?.location}</span></div></>:<span>Select a patient to continue.</span>}</div></>}
      {step===2&&<><div className="form-title"><h2>Clinical assessment</h2><p>Enter the latest screening observations and health history.</p></div><div className="form-grid"><Field label="Age" value={form.age} onChange={v=>update("age",v)} type="number" suffix="years"/><Field label="Systolic BP" value={form.bp} onChange={v=>update("bp",v)} type="number" suffix="mmHg"/><Field label="Blood glucose" value={form.glucose} onChange={v=>update("glucose",v)} type="number" suffix="mg/dL"/><Field label="BMI" value={form.bmi} onChange={v=>update("bmi",v)} type="number"/><Choice label="Smoking" value={form.smoking} onChange={v=>update("smoking",v)}/><Choice label="Known diabetes" value={form.diabetes} onChange={v=>update("diabetes",v)}/><Choice label="Known hypertension" value={form.hypertension} onChange={v=>update("hypertension",v)}/><Choice label="Chest pain" value={form.chestPain} onChange={v=>update("chestPain",v)}/><Choice label="Breathlessness" value={form.breathlessness} onChange={v=>update("breathlessness",v)}/><Choice label="Persistent fatigue" value={form.fatigue} onChange={v=>update("fatigue",v)}/></div></>}
      {step===3&&<><div className="form-title"><h2>Review assessment</h2><p>Check the recorded information before completing the screening.</p></div><div className="review-grid"><Review label="Patient" value={patients.find(p=>p.id===patient)?.name||"—"}/><Review label="Age" value={(form.age||"—")+" years"}/><Review label="Blood pressure" value={(form.bp||"—")+" mmHg"}/><Review label="Glucose" value={(form.glucose||"—")+" mg/dL"}/><Review label="BMI" value={form.bmi||"—"}/><Review label="Smoking" value={form.smoking}/><Review label="Diabetes" value={form.diabetes}/><Review label="Hypertension" value={form.hypertension}/><Review label="Chest pain" value={form.chestPain}/><Review label="Breathlessness" value={form.breathlessness}/></div><div className="risk-preview"><div><span>Preliminary risk</span><strong>{risk}</strong></div><div className="score-bar"><i style={{width:score+"%"}}/></div><b>{score}/100</b></div><div className="clinical-warning">This score is a screening aid, not a diagnosis. Clinical decisions and referrals should be made by qualified healthcare professionals.</div></>}
      <div className="form-actions">{step>1&&<button className="secondary-btn" onClick={()=>setStep(step-1)}>← Back</button>}<span/>{step<3?<button className="primary-btn" disabled={step===1&&!patient} onClick={next}>Continue →</button>:<button className="primary-btn" onClick={()=>setSubmitted(true)}>Complete screening ✓</button>}</div>
    </section>}
  </>;
}
function Field({label,value,onChange,type="text",suffix}){return <label>{label}<div className="input-wrap"><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder="Enter value"/>{suffix&&<span>{suffix}</span>}</div></label>}
function Choice({label,value,onChange}){return <label>{label}<select value={value} onChange={e=>onChange(e.target.value)}><option>No</option><option>Yes</option></select></label>}
function Review({label,value}){return <div><span>{label}</span><strong>{value}</strong></div>}

export default function App(){
  const [active,setActive]=useState("overview");
  const label=nav.find(([id])=>id===active)?.[2]||"Dashboard";
  return <div className="shell"><aside className="sidebar"><div className="logo"><div className="logo-mark">♡</div><div><strong>PRANA</strong><span>Health Risk Platform</span></div></div><nav>{nav.map(([id,icon,text])=><button key={id} className={active===id?"active":""} onClick={()=>setActive(id)}><span className="nav-icon">{icon}</span>{text}</button>)}</nav><div className="sidebar-bottom"><div className="help">?</div><span>Help & Support</span></div></aside><main className="main">{active==="overview"?<Dashboard/>:active==="patients"?<PatientsPage/>:active==="screening"?<ScreeningPage/>:<><Topbar/><div className="page-head"><div><div className="eyebrow">PRANA WORKSPACE</div><h1>{label}</h1><p>Manage the {label.toLowerCase()} workflow from one place.</p></div></div><Placeholder title={label} text={"The "+label.toLowerCase()+" module is scaffolded and ready to connect to live data."}/></>}</main></div>;
}
