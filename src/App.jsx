import React, { useEffect, useState } from "react";
import "./App.css";

/**
 * Expense tracker single-file app using localStorage.
 * - Stores expenses: { id, amount, reason, notes, dateISO }
 * - Detects month rollover and shows a prompt to send monthly summary via WhatsApp.
 *
 * Replace ADMIN_PHONE with your target number in international format (no +).
 */

const STORAGE_KEY = "my_expenses_v1";
const LAST_SENT_KEY = "my_expenses_last_sent_month"; // e.g. "2025-09" format
const ADMIN_PHONE = "972545317545"; // <-- change to the phone you want the summary sent to (E.164 without +)
const FIXED_WHATSAPP_MESSAGE_PREFIX = "סיכום הוצאות לחודש"; // will be completed with month & total

function loadExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse expenses from storage", e);
    return [];
  }
}

function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function monthKeyFromDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatCurrency(n) {
  // format as local currency (you can change locale if you want)
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function App() {
  const [expenses, setExpenses] = useState(loadExpenses());
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(monthKeyFromDate());
  const [showMonthlyReminder, setShowMonthlyReminder] = useState(false);

  // persist whenever expenses change
  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  // check month rollover on load
  useEffect(() => {
    const lastSent = localStorage.getItem(LAST_SENT_KEY); // e.g. "2025-08"
    const nowMonth = monthKeyFromDate();
    if (lastSent && lastSent !== nowMonth) {
      // last sent was a previous month — show a reminder to send the previous month's summary
      setShowMonthlyReminder(true);
    } else {
      setShowMonthlyReminder(false);
    }
    // Also set selectedMonth to current month
    setSelectedMonth(nowMonth);
  }, []);

  function addExpense(e) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || !reason.trim()) {
      alert("אנא הכנס סכום תקין וסיבת הוצאה");
      return;
    }
    const item = {
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      amount: amt,
      reason: reason.trim(),
      notes: notes.trim(),
      dateISO: new Date().toISOString(),
    };
    const next = [item, ...expenses];
    setExpenses(next);
    setAmount("");
    setReason("");
    setNotes("");
    // keep selectedMonth in current month
    setSelectedMonth(monthKeyFromDate());
  }

  function removeExpense(id) {
    if (!confirm("למחוק הוצאה זו?")) return;
    setExpenses(expenses.filter((x) => x.id !== id));
  }

  function expensesForMonth(monthKey) {
    // monthKey format "YYYY-MM"
    return expenses.filter((x) => x.dateISO.startsWith(monthKey));
  }

  function totalForMonth(monthKey) {
    const arr = expensesForMonth(monthKey);
    return arr.reduce((s, it) => s + Number(it.amount || 0), 0);
  }

  function handleSendMonthly(monthToSend = null) {
    // monthToSend format "YYYY-MM"
    const m = monthToSend || selectedMonth;
    const total = totalForMonth(m);
    const [yr, mon] = m.split("-");
    const humanMonth = `${mon}/${yr}`; // e.g. "09/2025"
    const body = `${FIXED_WHATSAPP_MESSAGE_PREFIX} ${humanMonth}\nסה\"כ הוצאות: ${formatCurrency(total)}\n(נשלח מהאתר)`;
    const encoded = encodeURIComponent(body);
    const url = `https://wa.me/${ADMIN_PHONE}?text=${encoded}`;
    // open wa.me — user will need to confirm/send inside WhatsApp
    window.open(url, "_blank");
    // mark as "sent" for that month so we don't nag again — store the sent month as the month we just sent
    localStorage.setItem(LAST_SENT_KEY, monthKeyFromDate()); // mark current month as last sent (prevents repost nags)
    setShowMonthlyReminder(false);
    alert("נפתח חלון WhatsApp לשליחה. אנא אשר ושלח בתוך WhatsApp.");
  }

  // helper to get list grouped by date for display
  function groupedExpensesForMonth(monthKey) {
    const list = expensesForMonth(monthKey).slice(); // copy
    list.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
    return list;
  }

  // month selector helper (previous, current, next)
  function buildMonthOptions() {
    const opts = [];
    const now = new Date();
    for (let i = -6; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = monthKeyFromDate(d);
      const label = d.toLocaleString("default", { month: "short", year: "numeric" });
      opts.push({ key, label });
    }
    // ensure selectedMonth included
    if (!opts.find((o) => o.key === selectedMonth)) {
      const d = new Date(selectedMonth + "-01");
      opts.push({ key: selectedMonth, label: d.toLocaleString("default", { month: "short", year: "numeric" }) });
    }
    return opts;
  }

  return (
    <div className="app-expense">
      <header className="header-expense">
        <h1>Expense Tracker</h1>
        <div className="header-contacts">
          <a className="phone-link" href={`tel:${ADMIN_PHONE}`}>📞 {ADMIN_PHONE}</a>
        </div>
      </header>

      <main className="main-expense">
        {showMonthlyReminder && (
          <div className="reminder">
            <p>
              זיהינו חודש חדש — האם לשלוח את סיכום ההוצאות של החודש הקודם ל-WhatsApp?
            </p>
            <div className="reminder-actions">
              <button onClick={() => handleSendMonthly(prompt("איזה חודש לשלוח? הזן בפורמט YYYY-MM או השאר ריק לשליחת החודש האחרון") || undefined)}>
                שלח עכשיו
              </button>
              <button onClick={() => {
                // dismiss for now but do not mark as sent
                setShowMonthlyReminder(false);
              }}>
                הסר התראה
              </button>
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
              <button type="button" className="btn-secondary" onClick={() => {
                setAmount(""); setReason(""); setNotes("");
              }}>נקה</button>
            </div>
          </form>
        </section>

        <section className="report-section card">
          <div className="report-header">
            <h2>דוח חודשי</h2>
            <div>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {buildMonthOptions().map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <button className="btn-send" onClick={() => handleSendMonthly(selectedMonth)}>שלח סיכום לחודש זה ל-WhatsApp</button>
            </div>
          </div>

          <div className="total">
            סה"כ הוצאות: ₪ {formatCurrency(totalForMonth(selectedMonth))}
          </div>

          <div className="list">
            {groupedExpensesForMonth(selectedMonth).length === 0 && <p>לא נמצאו הוצאות בחודש זה.</p>}
            {groupedExpensesForMonth(selectedMonth).map(it => (
              <div className="expense-item" key={it.id}>
                <div className="left">
                  <div className="amount">₪ {formatCurrency(it.amount)}</div>
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
        <div>Created by <strong>Yassmine Machour</strong></div>
      </footer>
    </div>
  );
}
