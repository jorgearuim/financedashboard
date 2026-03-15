import { useState, useEffect, useRef } from "react";

const CATEGORIES = {
  income: { label: "Ingreso", color: "#34d399", icon: "↑" },
  expense: { label: "Gasto", color: "#f87171", icon: "↓" },
  investment: { label: "Inversión", color: "#818cf8", icon: "◆" },
  savings: { label: "Ahorro", color: "#fbbf24", icon: "●" },
};

const SUBCATEGORIES = {
  income: ["Salario", "Freelance", "Dividendos", "Alquiler", "Otro"],
  expense: ["Vivienda", "Comida", "Transporte", "Entretenimiento", "Salud", "Educación", "Suscripciones", "Otro"],
  investment: ["Acciones", "Cripto", "Fondos", "Inmuebles", "Bonos", "ETFs", "Otro"],
  savings: ["Emergencia", "Vacaciones", "Jubilación", "Meta personal", "Otro"],
};

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const formatMoney = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n < 0 ? "-" : "") + (abs / 1e6).toFixed(1) + "M";
  if (abs >= 1e3) return (n < 0 ? "-" : "") + (abs / 1e3).toFixed(1) + "K";
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const uuid = () => Math.random().toString(36).slice(2, 11) + Date.now().toString(36);

// ─── Storage helper (localStorage) ───
const storage = {
  get(key) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

// ─── Animated Number ───
function AnimNum({ value, prefix = "€" }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    let start = display;
    let end = value;
    if (start === end) return;
    let raf;
    const duration = 500;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(start + (end - start) * ease);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>{prefix}{formatMoney(display)}</span>;
}

// ─── Micro bar chart ───
function MiniBar({ data, color, height = 48 }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            minHeight: 2,
            background: v > 0 ? color : "rgba(255,255,255,0.06)",
            borderRadius: 2,
            transition: "height 0.4s cubic-bezier(.4,0,.2,1)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Donut Chart ───
function Donut({ segments, size = 140 }) {
  const total = segments.reduce((s, g) => s + g.value, 0) || 1;
  let cum = 0;
  const r = 52, cx = 70, cy = 70, stroke = 14;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const offset = circumference * (1 - pct);
        const rotation = (cum / total) * 360 - 90;
        cum += seg.value;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${cx} ${cy})`}
            style={{ transition: "all 0.6s cubic-bezier(.4,0,.2,1)", opacity: 0.85 }}
          />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="inherit">Total</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#fff" fontSize="16" fontWeight="600" fontFamily="inherit">€{formatMoney(total)}</text>
    </svg>
  );
}

// ─── Area Sparkline ───
function AreaSparkline({ data, color, width = 280, height = 60 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1 || 1)) * width,
    height - ((v - min) / range) * (height - 4) - 2
  ]);
  const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = line + ` L${width},${height} L0,${height} Z`;
  const gradId = `g_${color.replace("#", "")}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Modal ───
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn .2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: 28, width: "min(440px, 92vw)",
          animation: "slideUp .3s cubic-bezier(.4,0,.2,1)",
          maxHeight: "85vh", overflowY: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Input ───
function Input({ label, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</label>}
      <input
        {...props}
        style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14,
          outline: "none", transition: "border-color .2s",
          ...(props.style || {}),
        }}
        onFocus={(e) => { e.target.style.borderColor = "rgba(129,140,248,0.5)"; props.onFocus?.(e); }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; props.onBlur?.(e); }}
      />
    </div>
  );
}

function Select({ label, options, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</label>}
      <select
        {...props}
        style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14,
          outline: "none", appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='rgba(255,255,255,0.4)' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#1a1a2e" }}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Main App ───
export default function FinanceDashboard() {
  const [entries, setEntries] = useState([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [filterCat, setFilterCat] = useState("all");
  const [loaded, setLoaded] = useState(false);

  const [form, setForm] = useState({ type: "expense", amount: "", description: "", subcategory: "", date: new Date().toISOString().slice(0, 10) });

  // Load from localStorage
  useEffect(() => {
    const saved = storage.get("finance-entries");
    if (saved) setEntries(saved);
    setLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!loaded) return;
    storage.set("finance-entries", entries);
  }, [entries, loaded]);

  const openNew = () => {
    setForm({ type: "expense", amount: "", description: "", subcategory: "", date: new Date().toISOString().slice(0, 10) });
    setEditId(null);
    setModal(true);
  };

  const openEdit = (entry) => {
    setForm({ type: entry.type, amount: String(entry.amount), description: entry.description, subcategory: entry.subcategory || "", date: entry.date });
    setEditId(entry.id);
    setModal(true);
  };

  const save = () => {
    if (!form.amount || isNaN(Number(form.amount))) return;
    const entry = { ...form, amount: Number(form.amount), id: editId || uuid() };
    if (editId) {
      setEntries((prev) => prev.map((e) => (e.id === editId ? entry : e)));
    } else {
      setEntries((prev) => [...prev, entry]);
    }
    setModal(false);
  };

  const remove = (id) => setEntries((prev) => prev.filter((e) => e.id !== id));

  // ── Calculations ──
  const now = new Date();
  const thisMonth = entries.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalIncome = thisMonth.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpense = thisMonth.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
  const totalInvest = thisMonth.filter((e) => e.type === "investment").reduce((s, e) => s + e.amount, 0);
  const totalSavings = thisMonth.filter((e) => e.type === "savings").reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense - totalInvest - totalSavings;

  // Monthly trend (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const m = entries.filter((e) => {
      const ed = new Date(e.date);
      return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
    });
    return {
      label: MONTHS[d.getMonth()],
      income: m.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0),
      expense: m.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0),
      investment: m.filter((e) => e.type === "investment").reduce((s, e) => s + e.amount, 0),
      savings: m.filter((e) => e.type === "savings").reduce((s, e) => s + e.amount, 0),
    };
  });

  // Donut segments
  const expBySub = {};
  thisMonth.filter((e) => e.type === "expense").forEach((e) => {
    const k = e.subcategory || "Otro";
    expBySub[k] = (expBySub[k] || 0) + e.amount;
  });
  const expSegments = Object.entries(expBySub).map(([k, v], i) => ({
    label: k, value: v,
    color: ["#f87171", "#fb923c", "#fbbf24", "#34d399", "#818cf8", "#c084fc", "#f472b6", "#67e8f9"][i % 8],
  }));

  const invBySub = {};
  entries.filter((e) => e.type === "investment").forEach((e) => {
    const k = e.subcategory || "Otro";
    invBySub[k] = (invBySub[k] || 0) + e.amount;
  });
  const invSegments = Object.entries(invBySub).map(([k, v], i) => ({
    label: k, value: v,
    color: ["#818cf8", "#6366f1", "#a78bfa", "#c084fc", "#34d399", "#fbbf24"][i % 6],
  }));

  const filtered = (filterCat === "all" ? entries : entries.filter((e) => e.type === filterCat))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const cardStyle = {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 20,
  };

  const pillStyle = (active) => ({
    padding: "7px 16px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    background: active ? "rgba(129,140,248,0.15)" : "transparent",
    color: active ? "#818cf8" : "rgba(255,255,255,0.4)",
    transition: "all .2s",
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d1a",
      color: "#fff",
      fontFamily: "'DM Sans', 'Satoshi', system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; }
        option { background: #1a1a2e; }
      `}</style>

      {/* ─── Header ─── */}
      <header style={{
        padding: "20px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(13,13,26,0.8)",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #818cf8, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700,
          }}>₿</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>Finanzas</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{MONTHS[now.getMonth()]} {now.getFullYear()}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { key: "dashboard", label: "Dashboard" },
            { key: "transactions", label: "Movimientos" },
            { key: "investments", label: "Inversiones" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={pillStyle(tab === t.key)}>{t.label}</button>
          ))}
        </div>
        <button
          onClick={openNew}
          style={{
            background: "linear-gradient(135deg, #818cf8, #6366f1)",
            border: "none", borderRadius: 10, padding: "9px 20px",
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
            transition: "transform .15s, box-shadow .15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(99,102,241,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.3)"; }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Nuevo
        </button>
      </header>

      <main style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ══════ DASHBOARD ══════ */}
        {tab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeIn .4s ease" }}>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {[
                { label: "Balance", value: balance, color: balance >= 0 ? "#34d399" : "#f87171", sub: "Este mes" },
                { label: "Ingresos", value: totalIncome, color: "#34d399", data: monthlyData.map((d) => d.income) },
                { label: "Gastos", value: totalExpense, color: "#f87171", data: monthlyData.map((d) => d.expense) },
                { label: "Inversiones", value: totalInvest, color: "#818cf8", data: monthlyData.map((d) => d.investment) },
                { label: "Ahorros", value: totalSavings, color: "#fbbf24", data: monthlyData.map((d) => d.savings) },
              ].map((kpi, i) => (
                <div key={i} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{kpi.label}</span>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: kpi.color, opacity: 0.6 }} />
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", fontFamily: "'JetBrains Mono', monospace", color: kpi.color }}>
                    <AnimNum value={kpi.value} prefix="€" />
                  </div>
                  {kpi.data ? <MiniBar data={kpi.data} color={kpi.color} /> : (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{kpi.sub}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
              <div style={cardStyle}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Tendencia 6 meses</div>
                <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                  {["income", "expense", "investment"].map((t) => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                      <span style={{ width: 8, height: 3, borderRadius: 2, background: CATEGORIES[t].color }} />
                      {CATEGORIES[t].label}
                    </div>
                  ))}
                </div>
                <AreaSparkline data={monthlyData.map((d) => d.income)} color="#34d399" height={50} />
                <div style={{ marginTop: -10 }}>
                  <AreaSparkline data={monthlyData.map((d) => d.expense)} color="#f87171" height={50} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  {monthlyData.map((d, i) => (
                    <span key={i} style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{d.label}</span>
                  ))}
                </div>
              </div>

              <div style={{ ...cardStyle, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", alignSelf: "flex-start" }}>Gastos por categoría</div>
                {expSegments.length > 0 ? (
                  <>
                    <Donut segments={expSegments} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                      {expSegments.map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
                          {s.label}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", color: "rgba(255,255,255,0.15)", fontSize: 13 }}>Sin datos</div>
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Últimos movimientos</span>
                <button onClick={() => setTab("transactions")} style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, cursor: "pointer" }}>Ver todos →</button>
              </div>
              {entries.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.15)" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                  <div style={{ fontSize: 13 }}>Añade tu primer movimiento</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {entries.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map((e) => (
                    <div
                      key={e.id}
                      onClick={() => openEdit(e)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                        borderRadius: 10, cursor: "pointer", transition: "background .15s",
                      }}
                      onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                      onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: `${CATEGORIES[e.type].color}15`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, color: CATEGORIES[e.type].color,
                      }}>{CATEGORIES[e.type].icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{e.description || e.subcategory || CATEGORIES[e.type].label}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{e.subcategory} · {e.date}</div>
                      </div>
                      <div style={{
                        fontSize: 14, fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: e.type === "income" ? "#34d399" : "rgba(255,255,255,0.7)",
                      }}>
                        {e.type === "income" ? "+" : "-"}€{formatMoney(e.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════ TRANSACTIONS ══════ */}
        {tab === "transactions" && (
          <div style={{ animation: "fadeIn .4s ease" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              {[{ key: "all", label: "Todos" }, ...Object.entries(CATEGORIES).map(([k, v]) => ({ key: k, label: v.label }))].map((f) => (
                <button key={f.key} onClick={() => setFilterCat(f.key)} style={pillStyle(filterCat === f.key)}>{f.label}</button>
              ))}
            </div>
            {filtered.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: 60, color: "rgba(255,255,255,0.15)" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
                <div>No hay movimientos</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {filtered.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      ...cardStyle, padding: "14px 16px",
                      display: "flex", alignItems: "center", gap: 14,
                      cursor: "pointer", transition: "background .15s",
                      borderRadius: 12, marginBottom: 2,
                    }}
                    onMouseEnter={(ev) => ev.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                    onMouseLeave={(ev) => ev.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: `${CATEGORIES[e.type].color}12`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, color: CATEGORIES[e.type].color,
                    }}>{CATEGORIES[e.type].icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{e.description || CATEGORIES[e.type].label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                        {e.subcategory && <span style={{ background: `${CATEGORIES[e.type].color}15`, color: CATEGORIES[e.type].color, padding: "2px 8px", borderRadius: 6, fontSize: 10, marginRight: 8 }}>{e.subcategory}</span>}
                        {e.date}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 15, fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: e.type === "income" ? "#34d399" : "rgba(255,255,255,0.7)",
                    }}>
                      {e.type === "income" ? "+" : "-"}€{formatMoney(e.amount)}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                        style={{ background: "rgba(255,255,255,0.04)", border: "none", borderRadius: 8, width: 32, height: 32, color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 13 }}
                      >✎</button>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); remove(e.id); }}
                        style={{ background: "rgba(248,113,113,0.08)", border: "none", borderRadius: 8, width: 32, height: 32, color: "#f87171", cursor: "pointer", fontSize: 13 }}
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════ INVESTMENTS ══════ */}
        {tab === "investments" && (
          <div style={{ animation: "fadeIn .4s ease", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ ...cardStyle, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", alignSelf: "flex-start" }}>Portfolio</div>
                {invSegments.length > 0 ? (
                  <>
                    <Donut segments={invSegments} size={160} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                      {invSegments.map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                          {s.label}: €{formatMoney(s.value)}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", color: "rgba(255,255,255,0.15)", fontSize: 13, padding: 40 }}>Sin inversiones registradas</div>
                )}
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>Evolución inversiones</div>
                <AreaSparkline data={monthlyData.map((d) => d.investment)} color="#818cf8" height={120} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  {monthlyData.map((d, i) => (
                    <span key={i} style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{d.label}</span>
                  ))}
                </div>
                <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(129,140,248,0.06)", borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>TOTAL INVERTIDO</div>
                  <div style={{ fontSize: 24, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: "#818cf8" }}>
                    €{formatMoney(entries.filter((e) => e.type === "investment").reduce((s, e) => s + e.amount, 0))}
                  </div>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>Historial de inversiones</div>
              {entries.filter((e) => e.type === "investment").length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.15)", fontSize: 13 }}>Registra tu primera inversión</div>
              ) : (
                entries.filter((e) => e.type === "investment").sort((a, b) => new Date(b.date) - new Date(a.date)).map((e) => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8" }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13 }}>{e.description || e.subcategory}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginLeft: 8 }}>{e.date}</span>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 500, color: "#818cf8" }}>€{formatMoney(e.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── Modal ─── */}
      <Modal open={modal} onClose={() => setModal(false)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>{editId ? "Editar" : "Nuevo movimiento"}</h3>
          <button onClick={() => setModal(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setForm((f) => ({ ...f, type: k, subcategory: "" }))}
                style={{
                  padding: "10px 8px", borderRadius: 10, border: "1px solid",
                  borderColor: form.type === k ? v.color : "rgba(255,255,255,0.06)",
                  background: form.type === k ? `${v.color}12` : "transparent",
                  color: form.type === k ? v.color : "rgba(255,255,255,0.4)",
                  fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all .2s",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}
              >
                <span style={{ fontSize: 16 }}>{v.icon}</span>
                {v.label}
              </button>
            ))}
          </div>

          <Input label="Cantidad (€)" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />

          <Select
            label="Categoría"
            value={form.subcategory}
            onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
            options={[{ value: "", label: "Seleccionar..." }, ...SUBCATEGORIES[form.type].map((s) => ({ value: s, label: s }))]}
          />

          <Input label="Descripción" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Descripción opcional..." />

          <Input label="Fecha" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            {editId && (
              <button
                onClick={() => { remove(editId); setModal(false); }}
                style={{
                  flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(248,113,113,0.2)",
                  background: "rgba(248,113,113,0.06)", color: "#f87171",
                  fontSize: 14, fontWeight: 500, cursor: "pointer",
                }}
              >Eliminar</button>
            )}
            <button
              onClick={save}
              style={{
                flex: 2, padding: "12px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, #818cf8, #6366f1)",
                color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 4px 16px rgba(99,102,241,0.3)",
              }}
            >{editId ? "Guardar cambios" : "Añadir"}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
