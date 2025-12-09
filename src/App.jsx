import React, { useEffect, useState } from "react";
import "./App.css";

/**
 * Expense tracker with:
 * - User-defined WhatsApp phone number saved to localStorage.
 * - Monthly expense summary sent through WhatsApp.
 * - No fixed number — user enters their own.
 */

const STORAGE_KEY = "my_expenses_v1";
const LAST_SENT_KEY = "my_expenses_last_sent_month";
const USER_PHONE_KEY = "my_expenses_user_phone"; // <-- new

const FIXED_WHATSAPP_MESSAGE_PREFIX = "סיכום הוצאות לחודש";

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
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function App() {
  const [expenses, setExpenses] = useState(loadExpenses());
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(monthKeyFromDate());
  const [showMonthlyReminder, setShowMonthlyReminder] = useState(false);

  // NEW — user phone state
  const [phone, setPhone] = useState(localStorage.getItem(USER_PHONE_KEY) || "");

  // save phone when changed
  useEffect(() => {
    localStorage.setItem(USER_PHONE_KEY, phone);
  }, [phone]);

  // persist whenever expenses change
  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  // check month rollover on load
  useEffect(() => {
    const lastSent = localStorage.getItem(LAST_SENT_KEY);
    const nowMonth = monthKeyFromDate();

    if (lastSent && lastSent !== nowMonth) {
      setShowMonthlyReminder(true);
    } else {
      setShowMonthlyReminder(false);
    }

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
    if (!phone.trim()) {
      alert("לא הוזן מספר טלפון לשליחה. אנא הזן מספר.");
      return;
    }

    const cleanedPhone = phone.replace(/[^0-9]/g, "");

    const m = monthToSend || selectedMonth;
    const total = totalForMonth(m);
    const [yr, mon] = m.split("-");
    const humanMonth = `${mon}/${yr}`;

    const body = `${FIXED_WHATSAPP_MESSAGE_PREFIX} ${humanMonth}\nסה\"כ הוצאות: ${formatCurrency(total)}\n(נשלח מהאתר)`;
    const encoded = encodeURIComponent(body);

    const url = `https://wa.me/${cleanedPhone}?text=${encoded}`;
    window.open(url, "_blank");

    localStorage.setItem(LAST_SENT_KEY, monthKeyFromDate());
    setShowMonthlyReminder(false);

    alert("נפתח חלון WhatsApp לשליחה. אנא אשר ושלח בתוך WhatsApp.");
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
      const label = d.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      opts.push({ key, label });
    }

    if (!opts.find((o) => o.key === selectedMonth)) {
      const d = new Date(selectedMonth + "-01");
      opts.push({
        key: selectedMonth,
        label: d.toLocaleString("default", {
          month: "short",
          year: "numeric",
        }),
      });
    }

    return opts;
  }

  return (
    <div className="app-expense">
      <header className="header-expense">
        <h1>Expense Tracker</h1>

        {/* NEW - phone input */}
        <div className="phone-settings">
          <input
            type="text"
            placeholder="הכנס מספר טלפון לשליחת דוחות WhatsApp"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </header>

      <main className="main-expense">
        {showMonthlyReminder && (
          <div className="reminder">
            <p>
              זיהינו חודש חדש — האם לשלוח את סיכום ההוצאות של החודש הקודם ל-WhatsApp?
            </p>
            <div className="reminder-actions">
              <button
                onClick={() =>
                  handleSendMonthly(
                    prompt(
                      "איזה חודש לשלוח? הזן בפורמט YYYY-MM או השאר ריק לשליחת החודש האחרון"
                    ) || undefined
                  )
                }
              >
                שלח עכשיו
              </button>

              <button onClick={() => setShowMonthlyReminder(false)}>
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
              <button type="submit" className="btn-primary">
                הוסף
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setAmount("");
                  setReason("");
                  setNotes("");
                }}
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
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>

              <button
                className="btn-send"
                onClick={() => handleSendMonthly(selectedMonth)}
              >
                שלח סיכום לחודש זה ל-WhatsApp
              </button>
            </div>
          </div>

          <div className="total">
            סה"כ הוצאות: ₪ {formatCurrency(totalForMonth(selectedMonth))}
          </div>

          <div className="list">
            {groupedExpensesForMonth(selectedMonth).length === 0 && (
              <p>לא נמצאו הוצאות בחודש זה.</p>
            )}

            {groupedExpensesForMonth(selectedMonth).map((it) => (
              <div className="expense-item" key={it.id}>
                <div className="left">
                  <div className="amount">₪ {formatCurrency(it.amount)}</div>
                  <div className="reason">{it.reason}</div>
                  <div className="notes">{it.notes}</div>
                </div>

                <div className="right">
                  <div className="date">
                    {new Date(it.dateISO).toLocaleString()}
                  </div>
                  <button className="delete" onClick={() => removeExpense(it.id)}>
                    מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer-expense">
        <div>
          Created by <strong>Deligh-Tech</strong>
        </div>
      </footer>
    </div>
  );
}
