import React, { useEffect, useState } from "react";
import "./App.css";

// ----- USERS ARRAY -----
const USERS = [
  { id: "316358514", name: "Alaa", phone: "+972502631406", password: "AlaaFa10" },
  { id: "205797673", name: "Jolian", phone: "+972523717287", password: "jolyass" },
  { id: "123", name: "yassmine", phone: "+972545317545", password: "123" },
];

const STORAGE_KEY = "expenses_v1";
const LAST_SENT_KEY = "last_sent_month";
const USER_PHONE_KEY = "user_phone";
const FIXED_WHATSAPP_MESSAGE_PREFIX = "סיכום הוצאות לחודש";

export default function App() {
  // ----- LOGIN STATES -----
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // ----- EXPENSE STATES -----
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(monthKeyFromDate());
  const [showMonthlyReminder, setShowMonthlyReminder] = useState(false);
  const [phone, setPhone] = useState("");

  // ---------- LOGIN FUNCTIONS ----------
  function handleLogin(e) {
    e.preventDefault();
    const user = USERS.find(
      (u) => u.id === username && u.password === password
    );
    if (!user) {
      setLoginError("שם משתמש או סיסמה שגויים");
      return;
    }

    setCurrentUser(user);

    // Load user-specific expenses
    const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (stored) setExpenses(JSON.parse(stored));

    // Load user phone
    const storedPhone = localStorage.getItem(`${USER_PHONE_KEY}_${user.id}`);
    setPhone(storedPhone || user.phone);
  }

  function handleLogout() {
    setCurrentUser(null);
    setUsername("");
    setPassword("");
    setExpenses([]);
    setPhone("");
  }

  // ---------- EXPENSE FUNCTIONS ----------
  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(`${STORAGE_KEY}_${currentUser.id}`, JSON.stringify(expenses));
  }, [expenses, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(`${USER_PHONE_KEY}_${currentUser.id}`, phone);
  }, [phone, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const lastSent = localStorage.getItem(`${LAST_SENT_KEY}_${currentUser.id}`);
    const nowMonth = monthKeyFromDate();
    setShowMonthlyReminder(lastSent && lastSent !== nowMonth);
    setSelectedMonth(nowMonth);
  }, [currentUser]);

  function addExpense(e) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || !reason.trim()) return alert("אנא הכנס סכום וסיבה");
    const item = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      amount: amt,
      reason: reason.trim(),
      notes: notes.trim(),
      dateISO: new Date().toISOString(),
    };
    setExpenses([item, ...expenses]);
    setAmount("");
    setReason("");
    setNotes("");
    setSelectedMonth(monthKeyFromDate());
  }

  function removeExpense(id) {
    if (!confirm("למחוק הוצאה זו?")) return;
    setExpenses(expenses.filter((x) => x.id !== id));
  }

  function expensesForMonth(monthKey) {
    return expenses.filter((x) => x.dateISO.startsWith(monthKey));
  }

  function totalForMonth(monthKey) {
    return expensesForMonth(monthKey).reduce(
      (s, it) => s + Number(it.amount || 0),
      0
    );
  }

  function handleSendMonthly(monthToSend = null) {
    if (!phone.trim()) return alert("לא הוזן מספר לשליחה");
    const cleanedPhone = phone.replace(/[^0-9]/g, "");
    const m = monthToSend || selectedMonth;
    const total = totalForMonth(m);
    const [yr, mon] = m.split("-");
    const humanMonth = `${mon}/${yr}`;
    const body = `${FIXED_WHATSAPP_MESSAGE_PREFIX} ${humanMonth}\nסה"כ הוצאות: ${total}\n(נשלח מהאתר)`;
    const encoded = encodeURIComponent(body);
    const url = `https://wa.me/${cleanedPhone}?text=${encoded}`;
    window.open(url, "_blank");
    localStorage.setItem(`${LAST_SENT_KEY}_${currentUser.id}`, m);
    setShowMonthlyReminder(false);
  }

  function groupedExpensesForMonth(monthKey) {
    const list = expensesForMonth(monthKey).slice();
    list.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
    return list;
  }

  function buildMonthOptions() {
    const opts = [];
    const now = new Date();
    for (let i = -6; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = monthKeyFromDate(d);
      const label = d.toLocaleString("default", { month: "short", year: "numeric" });
      opts.push({ key, label });
    }
    if (!opts.find((o) => o.key === selectedMonth)) opts.push({ key: selectedMonth, label: selectedMonth });
    return opts;
  }

  // ---------- RENDER ----------
  if (!currentUser) {
    return (
      <div className="login-screen" dir="rtl">
        <h2>כניסה למערכת</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="ID משתמש"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">כניסה</button>
          {loginError && <p className="error">{loginError}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="app-expense" dir="rtl">
      <header className="header-expense">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <img src="/logo.jpg" alt="Logo" className="logo" />
          <h1>Expense Tracker - {currentUser.name}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="מספר לשליחת WhatsApp"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button onClick={handleLogout}>התנתק</button>
        </div>
      </header>

      <main className="main-expense">
        {showMonthlyReminder && (
          <div className="reminder">
            <p>חודש חדש — לשלוח סיכום הוצאות לחודש הקודם?</p>
            <div className="reminder-actions">
              <button
                onClick={() =>
                  handleSendMonthly(
                    prompt("הכנס YYYY-MM או השאר ריק לשליחת החודש האחרון") || undefined
                  )
                }
              >
                שלח עכשיו
              </button>
              <button onClick={() => setShowMonthlyReminder(false)}>הסר התראה</button>
            </div>
          </div>
        )}

        <section className="form-section card">
          <h2>הזן הוצאה חדשה</h2>
          <form onSubmit={addExpense} className="expense-form">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="סכום"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              type="text"
              placeholder="סיבת ההוצאה"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <input
              type="text"
              placeholder="הערות (אופציונלי)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn-primary">הוסף</button>
              <button type="button" className="btn-secondary"
                onClick={() => { setAmount(""); setReason(""); setNotes(""); }}
              >
                נקה
              </button>
            </div>
          </form>
        </section>

        <section className="report-section card">
          <div className="report-header">
            <h2>דוח חודשי</h2>
            <div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {buildMonthOptions().map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
              <button
                className="btn-send"
                onClick={() => handleSendMonthly(selectedMonth)}
              >
                שלח סיכום ל-WhatsApp
              </button>
            </div>
          </div>

          <div className="total">
            סה"כ הוצאות: ₪ {totalForMonth(selectedMonth)}
          </div>

          <div className="list">
            {groupedExpensesForMonth(selectedMonth).length === 0 && <p>אין הוצאות לחודש זה.</p>}
            {groupedExpensesForMonth(selectedMonth).map((it) => (
              <div className="expense-item" key={it.id}>
                <div className="left">
                  <div className="amount">₪ {it.amount}</div>
                  <div className="reason">{it.reason}</div>
                  <div className="notes">{it.notes}</div>
                </div>
                <div className="right">
                  <div className="date">{new Date(it.dateISO).toLocaleString()}</div>
                  <button className="delete" onClick={() => removeExpense(it.id)}>מחק</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer-expense">
        <div>Created by <strong>Deligh-Tech</strong></div>
      </footer>
    </div>
  );
}

// ------------------- HELPERS -------------------
function monthKeyFromDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
