import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { pranaApi } from "./services/pranaApi";

const ROLES = ["ASHA / ANM Worker", "PHC Staff", "PHC Doctor", "Admin"];

const ROLE_NAV = {
  "ASHA / ANM Worker": [
    ["dashboard", "Dashboard"], ["patients", "Patients"], ["screening", "Health Screening"],
    ["referrals", "Referrals / Teleconsultation"], ["history", "Patient History"]
  ],
  "PHC Staff": [
    ["dashboard", "Dashboard"], ["patients", "Patients"], ["screening", "Health Screening"],
    ["referrals", "Referrals / Teleconsultation"], ["history", "Patient History"]
  ],
  "PHC Doctor": [
    ["dashboard", "Dashboard"], ["referrals", "Consultation Requests"], ["history", "Patient History"]
  ],
  Admin: [["dashboard", "Dashboard"], ["users", "Users & Roles"]]
};

const diseaseFields = [
  ["Diabetes", "diabetes"], ["Cardiovascular Disease", "cardiovascular"],
  ["Hypertension", "hypertension"], ["Anaemia", "anaemia"]
];

function RiskTag({ value }) {
  return <span className={"risk-tag " + String(value || "NOT AVAILABLE").toLowerCase().replaceAll(" ", "-")}>{value || "NOT AVAILABLE"}</span>;
}

function Topbar({ role, onLogout }) {
  return <header className="topbar">
    <div className="mobile-title">PRANA</div>
    <div className="topbar-right">
      <span className="secure-label">Secure session</span>
      <div className="account">
        <div className="avatar">{role.split(" ").map(x => x[0]).slice(0, 2).join("")}</div>
        <div><strong>{role}</strong><span>Role-based access</span></div>
      </div>
      <button className="logout-btn" onClick={onLogout}>Sign out</button>
    </div>
  </header>;
}

function Layout({ role, active, setActive, onLogout, children }) {
  const nav = ROLE_NAV[role] || ROLE_NAV["ASHA / ANM Worker"];
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">P</div>
        <div><strong>PRANA</strong><span>Rural Health Risk Assessment Platform</span></div>
      </div>
      <div className="role-label">SIGNED IN AS</div>
      <div className="role-pill">{role}</div>
      <nav>{nav.map(([id, label]) =>
        <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}>
          <span className="nav-line" />{label}
        </button>
      )}</nav>
      <div className="sidebar-foot">Patient information is accessible only to authorized users.</div>
    </aside>
    <main className="main"><Topbar role={role} onLogout={onLogout}/>{children}</main>
  </div>;
}

function PageHeader({ eyebrow, title, text, action }) {
  return <div className="page-header">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{text && <p>{text}</p>}</div>
    {action}
  </div>;
}

function Dashboard({ role, setActive }) {
  if (role === "PHC Doctor") return <DoctorDashboard setActive={setActive}/>;
  if (role === "Admin") return <AdminDashboard setActive={setActive}/>;
  return <WorkerDashboard setActive={setActive}/>;
}

function WorkerDashboard({ setActive }) {
  return <>
    <PageHeader eyebrow="PRANA" title="Dashboard" text="Patient screening and referral workspace."/>
    <section className="notice">
      <strong>Screening workflow</strong>
      <span>Register or search a patient, enter or extract health data, verify the values, then run the applicable disease assessments.</span>
    </section>
    <div className="dashboard-grid">
      <ActionCard title="Register / Search Patient" text="Create a new patient record or retrieve an existing one." onClick={() => setActive("patients")}/>
      <ActionCard title="Enter Health Data" text="Record available clinical parameters for a selected patient." onClick={() => setActive("screening")}/>
      <ActionCard title="Medical Report" text="Upload or capture a report and verify OCR-extracted values." onClick={() => setActive("screening")}/>
      <ActionCard title="Referrals / Teleconsultation" text="Review referral requests and consultation status." onClick={() => setActive("referrals")}/>
    </div>
    <section className="two-column">
      <Panel title="Disease assessments">
        <div className="assessment-list">{diseaseFields.map(([name]) => <div key={name}><span>{name}</span><RiskTag value="Not available"/></div>)}</div>
        <p className="muted">Results appear only when the required patient data is available.</p>
      </Panel>
      <Panel title="Connectivity">
        <div className="offline-box"><strong>Offline-first records</strong><p>Screening records captured without connectivity are retained for synchronization when the connection returns.</p><span>Synchronization status will appear here.</span></div>
      </Panel>
    </section>
  </>;
}

function DoctorDashboard({ setActive }) {
  return <>
    <PageHeader eyebrow="PHC DOCTOR" title="Consultation Dashboard" text="Review referred patients and provide consultation advice."/>
    <section className="notice"><strong>Consultation requests</strong><span>Referral requests include relevant patient and screening information for review.</span></section>
    <div className="dashboard-grid">
      <ActionCard title="Consultation Requests" text="Review high-risk referral requests sent by authorized health workers." onClick={() => setActive("referrals")}/>
      <ActionCard title="Patient History" text="Access screening history for patients assigned to your consultation workflow." onClick={() => setActive("history")}/>
    </div>
  </>;
}

function AdminDashboard({ setActive }) {
  return <>
    <PageHeader eyebrow="ADMINISTRATION" title="Administration" text="Manage authorized PRANA users and assigned roles."/>
    <section className="notice"><strong>Role-based access</strong><span>Users and patient information are exposed according to the role assigned to the account.</span></section>
    <div className="dashboard-grid"><ActionCard title="Users & Roles" text="Review user accounts and role assignments." onClick={() => setActive("users")}/></div>
  </>;
}

function ActionCard({ title, text, onClick }) {
  return <button className="action-card" onClick={onClick}><span className="action-arrow">→</span><h2>{title}</h2><p>{text}</p></button>;
}

function Panel({ title, children }) { return <section className="panel"><div className="panel-head"><h2>{title}</h2></div>{children}</section>; }

function Patients({ setActive }) {
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    pranaApi.searchPatients().then(data => setPatients(data.patients || [])).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  const search = async value => {
    setQuery(value);
    try { const data = await pranaApi.searchPatients(value); setPatients(data.patients || []); setError(""); }
    catch (e) { setError(e.message); }
  };
  const filtered = patients;
  return <>
    <PageHeader eyebrow="PATIENT MANAGEMENT" title="Register / Search Patient" text="Register a new patient or retrieve an existing patient record."
      action={<button className="primary-btn" onClick={() => setShowForm(true)}>Register Patient</button>}/>
    <section className="panel">
      <div className="search-row"><input value={query} onChange={e => search(e.target.value)} placeholder="Search patient name, patient ID or other registered details"/><span>{filtered.length} record{filtered.length === 1 ? "" : "s"}</span></div>
      {loading ? <Empty title="Loading patient records" text="Retrieving authorized patient records."/> : filtered.length ? <PatientRows patients={filtered} setActive={setActive}/> : <Empty title="No patient records found" text="Register a patient to create the first record or change the search term."/>}
      {error && <div className="error-box">{error}</div>}
    </section>
    {showForm && <PatientForm onClose={() => setShowForm(false)} onSave={async p => {
        try { const saved = await pranaApi.createPatient(p); setPatients(x => [...x, saved]); setShowForm(false); setError(""); }
        catch (e) { setError(e.message); }
      }}/>}
  </>;
}

function PatientRows({ patients, setActive }) {
  return <div className="table-wrap"><table><thead><tr><th>Patient ID</th><th>Name</th><th>Age</th><th>Gender</th><th>Contact</th><th></th></tr></thead><tbody>{patients.map(p =>
    <tr key={p.patient_id || p.id}><td>{p.patient_id || p.id}</td><td><strong>{p.name}</strong></td><td>{p.age || "—"}</td><td>{p.gender || "—"}</td><td>{p.contact || "—"}</td><td><button className="link-btn" onClick={() => setActive("history")}>View history</button></td></tr>
  )}</tbody></table></div>;
}

function PatientForm({ onClose, onSave }) {
  const [form, setForm] = useState({name:"", age:"", gender:"", contact:"", address:""});
  const [saving,setSaving] = useState(false);
  const set = (k,v) => setForm({...form,[k]:v});
  return <Modal title="Register Patient" onClose={onClose}>
    <div className="form-grid">
      <Field label="Patient name" required value={form.name} onChange={v => set("name",v)}/>
      <Field label="Age" type="number" value={form.age} onChange={v => set("age",v)}/>
      <SelectField label="Gender" value={form.gender} options={["Female","Male","Other"]} onChange={v => set("gender",v)}/>
      <Field label="Contact" value={form.contact} onChange={v => set("contact",v)}/>
      <Field label="Address / village" value={form.address} onChange={v => set("address",v)}/>
    </div>
    <div className="modal-actions"><button className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={!form.name.trim()} onClick={async () => {setSaving(true); await onSave(form); setSaving(false)}}>{saving ? "Saving..." : "Save patient"}</button></div>
  </Modal>;
}

function Screening({ setActive }) {
  const [patient, setPatient] = useState("");
  const [report, setReport] = useState(null);
  const [verified, setVerified] = useState(false);
  const [data, setData] = useState({systolic:"",diastolic:"",glucose:"",haemoglobin:"",bmi:"",symptoms:""});
  const set = (k,v) => setData({...data,[k]:v});
  const [results, setResults] = useState(null);
  const [assessmentError,setAssessmentError] = useState("");
  const [assessing,setAssessing] = useState(false);
  const runAssessment = async () => {
    if (!patient.trim()) { setAssessmentError("A patient must be identified before screening."); return; }
    setAssessing(true); setAssessmentError("");
    try {
      const payload = {
        patient_id: patient,
        systolic_bp: data.systolic ? Number(data.systolic) : null,
        diastolic_bp: data.diastolic ? Number(data.diastolic) : null,
        blood_glucose: data.glucose ? Number(data.glucose) : null,
        haemoglobin: data.haemoglobin ? Number(data.haemoglobin) : null,
        bmi: data.bmi ? Number(data.bmi) : null,
        symptoms: data.symptoms || null
      };
      const saved = await pranaApi.saveHealthData(payload);
      const assessed = await pranaApi.assess(payload);
      setResults(assessed.results);
    } catch (e) { setAssessmentError(e.message); }
    finally { setAssessing(false); }
  };
  return <>
    <PageHeader eyebrow="HEALTH SCREENING" title="Screening & Risk Assessment" text="Enter health data or process a medical report, verify the values, then run applicable assessments."/>
    <section className="panel">
      <div className="workflow-title"><span className="workflow-active">1</span><b>Patient</b><i/> <span>2</span><b>Health data</b><i/> <span>3</span><b>Assessments</b></div>
      <div className="form-grid">
        <Field label="Patient ID / selected patient" required value={patient} onChange={setPatient}/>
      </div>
    </section>
    <section className="two-column">
      <Panel title="Manual health data">
        <div className="form-grid">
          <Field label="Systolic BP (mmHg)" type="number" value={data.systolic} onChange={v=>set("systolic",v)}/>
          <Field label="Diastolic BP (mmHg)" type="number" value={data.diastolic} onChange={v=>set("diastolic",v)}/>
          <Field label="Blood glucose" type="number" value={data.glucose} onChange={v=>set("glucose",v)}/>
          <Field label="Haemoglobin" type="number" value={data.haemoglobin} onChange={v=>set("haemoglobin",v)}/>
          <Field label="BMI" type="number" value={data.bmi} onChange={v=>set("bmi",v)}/>
          <Field label="Symptoms / notes" value={data.symptoms} onChange={v=>set("symptoms",v)}/>
        </div>
      </Panel>
      <Panel title="Medical report processing">
        <label className="upload-box"><input type="file" accept="image/*,.pdf" onChange={e=>setReport(e.target.files?.[0] || null)}/><strong>{report ? report.name : "Upload or capture a medical report"}</strong><span>OCR extraction is performed by the backend service.</span></label>
        {report && <div className="ocr-state"><strong>Report selected</strong><p>Send this report to OCR, then verify or correct extracted values before screening.</p><button className="secondary-btn" onClick={()=>setVerified(true)}>Mark extracted values as verified</button>{verified&&<span className="verified">Verified for screening</span>}</div>}
      </Panel>
    </section>
    <section className="panel">
      <div className="panel-head"><div><h2>Disease risk assessment</h2><p className="muted">Assessments with missing required values must be skipped and the reason displayed.</p></div><button className="primary-btn" onClick={runAssessment} disabled={assessing}>{assessing ? "Assessing..." : "Run applicable assessments"}</button></div>
      {assessmentError && <div className="error-box">{assessmentError}</div>}
      {results ? <div className="assessment-grid">{diseaseFields.map(([name,key]) => {
        const result = results[key] || {status:"skipped",reason:"Assessment unavailable"};
        return <div className="assessment-result" key={key}><strong>{name}</strong><RiskTag value={result.status === "ready" ? "Ready" : "Skipped"}/><p>{result.status === "skipped" ? result.reason : "The validated screening service will return the risk result and SHAP-based explanation here."}</p></div>;
      })}</div> : <Empty title="No screening results yet" text="Provide sufficient verified data before starting the assessment."/>}
    </section>
    <div className="clinical-note">Screening results support early identification and referral. They are not a diagnosis. Clinical decisions remain with qualified healthcare professionals.</div>
    <button className="link-btn back-action" onClick={()=>setActive("patients")}>← Return to patient management</button>
  </>;
}

function Referrals({ role }) {
  const doctor = role === "PHC Doctor";
  return <>
    <PageHeader eyebrow={doctor ? "PHC DOCTOR" : "REFERRAL / TELECONSULTATION"} title={doctor ? "Consultation Requests" : "Referrals & Teleconsultation"} text={doctor ? "Review consultation requests and provide advice." : "Send and track referrals for patients requiring further evaluation."}/>
    <section className="panel">
      <Empty title={doctor ? "No consultation requests in this session" : "No referral records in this session"} text="Referral and consultation records will appear here when connected to the backend workflow."/>
    </section>
  </>;
}

function History() {
  return <><PageHeader eyebrow="PATIENT HISTORY" title="Patient History" text="Review stored health, screening and referral records for an authorized patient."/><section className="panel"><Empty title="Select a patient to view history" text="Historical records are retrieved from the secured patient record store." /></section></>;
}

function Users() {
  return <><PageHeader eyebrow="ADMIN" title="Users & Roles" text="Manage authorized users and assigned PRANA roles."/><section className="panel"><Empty title="No user records in this session" text="User and role management will use the authentication and database service." /></section></>;
}

function Modal({title,onClose,children}) { return <div className="modal-backdrop"><div className="modal"><button className="close-btn" onClick={onClose}>×</button><h2>{title}</h2>{children}</div></div>; }
function Field({label,value,onChange,type="text",required}) { return <label className="field">{label}{required&&<em>*</em>}<input type={type} value={value} onChange={e=>onChange(e.target.value)}/></label>; }
function SelectField({label,value,options,onChange}) { return <label className="field">{label}<select value={value} onChange={e=>onChange(e.target.value)}><option value="">Select</option>{options.map(x=><option key={x}>{x}</option>)}</select></label>; }
function Empty({title,text}) { return <div className="empty"><div className="empty-mark">—</div><h3>{title}</h3><p>{text}</p></div>; }

function Login({onLogin}) {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [devRole,setDevRole] = useState(ROLES[0]);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError(""); setLoading(true);
    try {
      if (!supabaseConfigured) {
        onLogin({ role: devRole, user: null, developmentMode: true });
        return;
      }
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      const { data: profile, error: profileError } = await supabase.from("user_profiles").select("full_name,role").eq("id", data.user.id).single();
      if (profileError) throw profileError;
      const roleMap = { asha_anm:"ASHA / ANM Worker", phc_staff:"PHC Staff", phc_doctor:"PHC Doctor", admin:"Admin" };
      onLogin({ role: roleMap[profile.role] || profile.role, user: data.user, developmentMode: false });
    } catch (e) {
      setError(e.message || "Unable to sign in.");
    } finally { setLoading(false); }
  };

  return <div className="login-page">
    <form className="login-card" onSubmit={submit}>
      <div className="brand login-brand"><div className="brand-mark">P</div><div><strong>PRANA</strong><span>Rural Health Risk Assessment Platform</span></div></div>
      <div className="eyebrow">SECURE ACCESS</div><h1>Sign in to PRANA</h1>
      <p className="login-copy">Access is provided according to the role assigned to your account.</p>
      {!supabaseConfigured && <div className="dev-banner"><strong>Local development mode</strong><span>Supabase credentials are not configured, so a local role preview is enabled. Production authentication uses Supabase.</span></div>}
      {supabaseConfigured ? <>
        <label className="field">Email / user ID<input value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" placeholder="Enter your account email"/></label>
        <label className="field">Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password"/></label>
      </> : <label className="field">Preview role<select value={devRole} onChange={e=>setDevRole(e.target.value)}>{ROLES.map(r=><option key={r}>{r}</option>)}</select></label>}
      {error && <div className="error-box">{error}</div>}
      <button className="primary-btn login-btn" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      <p className="login-foot">Patient information is protected by authenticated, role-based access in the production configuration.</p>
    </form>
  </div>;
}

export default function App() {
  const [sessionUser,setSessionUser] = useState(null);
  const [role,setRole] = useState(null);
  const [active,setActive] = useState("dashboard");
  const [developmentMode,setDevelopmentMode] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSessionUser(data.session?.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSessionUser(session?.user || null));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!role) return <Login onLogin={({role,user,developmentMode}) => {setRole(role);setSessionUser(user);setDevelopmentMode(developmentMode);setActive("dashboard")}}/>;

  const signOut = async () => {
    if (supabaseConfigured && !developmentMode) await supabase.auth.signOut();
    setRole(null); setSessionUser(null);
  };

  const content = active === "dashboard" ? <Dashboard role={role} setActive={setActive}/>
    : active === "patients" ? <Patients setActive={setActive}/>
    : active === "screening" ? <Screening setActive={setActive}/>
    : active === "referrals" ? <Referrals role={role}/>
    : active === "history" ? <History/>
    : <Users/>;

  return <Layout role={role} active={active} setActive={setActive} onLogout={signOut}>
    {developmentMode && <div className="dev-strip">Local development preview — configure Supabase before handling real patient information.</div>}
    {content}
  </Layout>;
}
