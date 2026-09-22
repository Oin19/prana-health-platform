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
  { name: "Anita Devi", age: 54, gender: "F", location: "Ward 12", risk: "HIGH", condition: "Hypertension", status: "Referred" },
  { name: "Ramesh Kumar", age: 47, gender: "M", location: "Ward 8", risk: "HIGH", condition: "Diabetes", status: "Pending" },
  { name: "Sunita Sharma", age: 61, gender: "F", location: "Ward 4", risk: "MEDIUM", condition: "Cardiovascular", status: "Monitoring" },
  { name: "Mohan Lal", age: 39, gender: "M", location: "Ward 16", risk: "LOW", condition: "General", status: "Complete" },
];

const trend = [
  { month: "Jan", screened: 45, high: 12 },
  { month: "Feb", screened: 52, high: 15 },
  { month: "Mar", screened: 48, high: 10 },
  { month: "Apr", screened: 61, high: 18 },
  { month: "May", screened: 59, high: 14 },
  { month: "Jun", screened: 67, high: 22 },
];

function RiskBadge({ risk }) {
  return <span className={"risk " + risk.toLowerCase()}>{risk}</span>;
}

function Dashboard() {
  const max = 70;
  return (
    <>
      <header className="topbar">
        <div className="mobile-brand">PRANA</div>
        <div className="top-actions">
          <button className="icon-btn">⌕</button>
          <button className="icon-btn">♧</button>
          <div className="user">
            <div className="avatar">PS</div>
            <div><strong>Priya Sharma</strong><span>ASHA / ANM</span></div>
            <span className="chevron">⌄</span>
          </div>
        </div>
      </header>

      <div className="page-head">
        <div>
          <div className="eyebrow">PHC COMMAND CENTER</div>
          <h1>District Overview</h1>
          <p>Population health metrics for Jaipur District</p>
        </div>
        <div className="head-controls">
          <span className="live-dot">● Live data</span>
          <select defaultValue="30"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>
        </div>
      </div>

      <section className="metric-grid">
        <Metric icon="♙" label="Patients Screened" value="1,284" change="+12.5%" note="vs previous period" />
        <Metric icon="!" label="High-Risk Cases" value="186" change="+8.2%" note="requiring attention" danger />
        <Metric icon="↗" label="Referrals" value="74" change="+6.4%" note="this period" />
        <Metric icon="✓" label="Completed Assessments" value="1,098" change="+14.1%" note="85.5% completion" />
      </section>

      <section className="chart-grid">
        <Card title="Prevalence by Disease Condition" subtitle="Flagged cases from completed screenings">
          <div className="donut-wrap">
            <div className="donut"><div><strong>1,284</strong><span>screened</span></div></div>
            <div className="legend">
              <Legend color="blue" name="Cardiovascular" value="31%" />
              <Legend color="orange" name="Diabetes" value="24%" />
              <Legend color="red" name="Hypertension" value="35%" />
              <Legend color="purple" name="Anemia" value="10%" />
            </div>
          </div>
        </Card>

        <Card title="Screening Trends & High Risk Detection" subtitle="Monthly screening activity">
          <div className="bar-chart">
            {trend.map((item) => (
              <div className="bar-group" key={item.month}>
                <div className="bars">
                  <div className="bar screened" style={{height: (item.screened / max) * 150}} title={item.screened + " screened"} />
                  <div className="bar high" style={{height: (item.high / max) * 150}} title={item.high + " high risk"} />
                </div>
                <span>{item.month}</span>
              </div>
            ))}
          </div>
          <div className="chart-key"><span><i className="key screened" />Total Screened</span><span><i className="key high" />High Risk</span></div>
        </Card>
      </section>

      <section className="table-card">
        <div className="section-head"><div><h2>Recent District High-Risk Referrals</h2><p>Patients requiring follow-up or specialist care</p></div><button className="text-btn">View all →</button></div>
        <div className="table-wrap">
          <table><thead><tr><th>PATIENT</th><th>AGE / GENDER</th><th>LOCATION</th><th>PRIMARY RISK</th><th>RISK</th><th>STATUS</th></tr></thead>
            <tbody>{patients.filter(p => p.risk !== "LOW").map(p => <tr key={p.name}><td><strong>{p.name}</strong></td><td>{p.age} / {p.gender}</td><td>{p.location}</td><td>{p.condition}</td><td><RiskBadge risk={p.risk}/></td><td><span className="status">{p.status}</span></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Metric({ icon, label, value, change, note, danger }) {
  return <div className="metric-card"><div className={"metric-icon " + (danger ? "danger" : "")}>{icon}</div><div className="metric-copy"><span>{label}</span><strong>{value}</strong><small><b className={danger ? "down" : ""}>{change}</b> {note}</small></div></div>;
}

function Legend({ color, name, value }) {
  return <div className="legend-row"><span><i className={"legend-dot " + color}/>{name}</span><strong>{value}</strong></div>;
}

function Card({ title, subtitle, children }) {
  return <div className="chart-card"><div className="card-title"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="dots">•••</button></div>{children}</div>;
}

function Placeholder({ title, text }) {
  return <div className="placeholder"><div className="placeholder-icon">◫</div><h2>{title}</h2><p>{text}</p><span>Module ready for the next build step</span></div>;
}

export default function App() {
  const [active, setActive] = useState("overview");
  const activeLabel = useMemo(() => nav.find(([id]) => id === active)?.[2] || "Dashboard", [active]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo"><div className="logo-mark">♡</div><div><strong>PRANA</strong><span>Health Risk Platform</span></div></div>
        <nav>{nav.map(([id, icon, label]) => <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}><span className="nav-icon">{icon}</span>{label}</button>)}</nav>
        <div className="sidebar-bottom"><div className="help">?</div><span>Help & Support</span></div>
      </aside>
      <main className="main">
        {active === "overview" ? <Dashboard /> : <><header className="topbar"><div className="mobile-brand">PRANA</div><div className="top-actions"><div className="user"><div className="avatar">PS</div><div><strong>Priya Sharma</strong><span>ASHA / ANM</span></div></div></div></header><div className="page-head"><div><div className="eyebrow">PRANA WORKSPACE</div><h1>{activeLabel}</h1><p>Manage the {activeLabel.toLowerCase()} workflow from one place.</p></div></div><Placeholder title={activeLabel} text={"The " + activeLabel.toLowerCase() + " module is scaffolded and ready to connect to live data."} /></>}
      </main>
    </div>
  );
}
