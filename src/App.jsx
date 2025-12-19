
import { useEffect, useMemo, useState } from "react";
import { requestNotificationPermission } from './firebase.js';

/**
 * Office Attendance Tracker (React + Vite)
 * - LocalStorage persistence
 * - Quarterly counter (default target = 24)
 * - Click a date to mark In Office / Not in Office / Clear
 * - Month navigation: Prev / Next / Today
 * - CSV export for the current quarter
 * - Pace indicator (ahead/behind based on business days)
 */

/* ----------------- Date helpers ----------------- */
function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function toISO(date) {
  // Normalize to local midnight to avoid TZ shifts
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return d.toISOString().slice(0, 10);
}
function fromISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function getQuarter(date = new Date()) {
  return Math.floor(date.getMonth() / 3) + 1; // 1..4
}
function getQuarterRange(year, quarter) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return { start, end };
}
function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isBusinessDay(d) {
  const day = d.getDay(); // 0=Sun..6=Sat
  return day >= 1 && day <= 5; // Mon..Fri
}
function businessDaysBetweenInclusive(start, end) {
  // Count Mon-Fri inclusive between start and end
  let count = 0;
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (e < s) return 0;
  for (let d = s; d <= e; d.setDate(d.getDate() + 1)) {
    if (isBusinessDay(d)) count++;
  }
  return count;
}

/* ----------------- Storage ----------------- */
const STORAGE_KEY = "officeTracker_v1";
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw)
      return {
        days: {}, // Record<string, { dateISO, status: 'in'|'out'|undefined, notes?: string }>
        targetPerQuarter: 24,
      };
    const parsed = JSON.parse(raw);
    return {
      days: parsed.days || {},
      targetPerQuarter:
        typeof parsed.targetPerQuarter === "number" ? parsed.targetPerQuarter : 24,
    };
  } catch {
    return { days: {}, targetPerQuarter: 24 };
  }
}
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ----------------- Main Component ----------------- */
export default function App() {
  const [state, setState] = useState(loadState());
  const [viewDate, setViewDate] = useState(new Date()); // month being viewed
  const [selectedISO, setSelectedISO] = useState(toISO(new Date()));
  const selectedDate = fromISO(selectedISO);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);

  // Build calendar grid (weeks x days)
  const weeks = useMemo(() => {
    const startWeekDay = monthStart.getDay(); // 0=Sun..6=Sat
    const totalDays = monthEnd.getDate();
    const cells = [];
    for (let i = 0; i < startWeekDay; i++) cells.push(null); // leading blanks
    for (let day = 1; day <= totalDays; day++) {
      cells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
    }
    while (cells.length % 7 !== 0) cells.push(null); // pad to full weeks
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [viewDate, monthStart, monthEnd]);

  // Quarter math for the currently viewed month’s quarter
  const currentQuarter = getQuarter(viewDate);
  const currentYear = viewDate.getFullYear();
  const { start: qStart, end: qEnd } = getQuarterRange(currentYear, currentQuarter);
  const qStartISO = toISO(qStart);
  const qEndISO = toISO(qEnd);

  const inOfficeCount = useMemo(() => {
    return Object.values(state.days).filter(
      (d) => d.status === "in" && d.dateISO >= qStartISO && d.dateISO <= qEndISO
    ).length;
  }, [state.days, qStartISO, qEndISO]);

  // Pace indicator based on today's date within the quarter
  const today = new Date();
  const clampToday =
    today < qStart ? qStart : today > qEnd ? qEnd : today; // clamp into quarter
  const totalBiz = businessDaysBetweenInclusive(qStart, qEnd);
  const elapsedBiz = businessDaysBetweenInclusive(qStart, clampToday);
  const remainingBiz = Math.max(0, totalBiz - elapsedBiz);
  const target = state.targetPerQuarter;
  const expectedByToday = Math.round((target * elapsedBiz) / totalBiz); // linear pace over biz days
  const aheadBehind = inOfficeCount - expectedByToday;
  const neededToHitTarget = Math.max(0, target - inOfficeCount);
  const neededPerBizDay =
    remainingBiz > 0 ? (neededToHitTarget / remainingBiz) : neededToHitTarget;

  // Handlers
  function setStatus(iso, status) {
    setState((prev) => {
      const existing = prev.days[iso] || { dateISO: iso, status: undefined, notes: "" };
      const updated = { ...existing, status };
      const days = { ...prev.days, [iso]: updated };
      if (!status) delete days[iso]; // clean up when cleared
      return { ...prev, days };
    });
  }
  function addNote(iso, note) {
    setState((prev) => {
      const existing = prev.days[iso] || { dateISO: iso, status: undefined, notes: "" };
      const updated = { ...existing, notes: note };
      return { ...prev, days: { ...prev.days, [iso]: updated } };
    });
  }
  function goPrevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function goNextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }
  function goToday() {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedISO(toISO(today));
  }

  // UI helpers
  function tileStatus(date) {
    if (!date) return undefined;
    const iso = toISO(date);
    const d = state.days[iso];
    return d?.status; // 'in' | 'out' | undefined
  }

  function DayTile({ date }) {
    if (!date) return <td className="day blank"></td>;
    const iso = toISO(date);
    const status = tileStatus(date);
    const isToday = isSameDay(date, new Date());
    const isSelected = selectedISO === iso;
    return (
      <td
        className={[
          "day",
          status === "in" ? "in" : "",
          status === "out" ? "out" : "",
          isToday ? "today" : "",
          isSelected ? "selected" : "",
        ].join(" ")}
        onClick={() => setSelectedISO(iso)}
        title={state.days[iso]?.notes || ""}
      >
        <div className="date">{date.getDate()}</div>
      </td>
    );
  }

  const selectedStatus = state.days[selectedISO]?.status;
  const selectedNotes = state.days[selectedISO]?.notes || "";

  /* ----------------- CSV Export ----------------- */
  function exportQuarterCSV() {
    // Collect only quarter entries with a set status
    const rows = [["Date", "Status", "Notes"]];
    Object.values(state.days)
      .filter((d) => d.dateISO >= qStartISO && d.dateISO <= qEndISO && d.status)
      .sort((a, b) => (a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0))
      .forEach((d) => {
        rows.push([d.dateISO, d.status === "in" ? "In Office" : "Not in Office", (d.notes || "").replace(/\r?\n/g, " ")]);
      });

    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            // Escape quotes and wrap if contains comma
            const escaped = s.replace(/"/g, '""');
            return /[,"\n]/.test(s) ? `"${escaped}"` : escaped;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `office_tracker_Q${currentQuarter}_${currentYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container">
      <header className="topbar">
        <h1>Office Attendance Tracker</h1>
        <div className="actions">
          
          <div className="goal">
            Quarter {currentQuarter} {currentYear} • Target:{" "}
            <input
              type="number"
              min={1}
              max={90}
              value={state.targetPerQuarter}
              onChange={(e) =>
                setState((s) => ({ ...s, targetPerQuarter: Number(e.target.value) }))
              }
            />
            {"  "}
            In Office: <b>{inOfficeCount}</b>
            {"  "}
            <button className="export" onClick={exportQuarterCSV}>Export Quarter CSV</button>
          </div>
        </div>
      </header>

      {/* Pace indicator */}
      <section className="pace">
        <div>
          <strong>Pace:</strong>{" "}
          {aheadBehind > 0 ? (
            <span className="ahead">
              Ahead by {aheadBehind} {aheadBehind === 1 ? "day" : "days"} ✅
            </span>
          ) : aheadBehind < 0 ? (
            <span className="behind">
              Behind by {Math.abs(aheadBehind)} {Math.abs(aheadBehind) === 1 ? "day" : "days"} ⚠️
            </span>
          ) : (
            <span className="onpace">On pace 🎯</span>
          )}
        </div>
        <div className="pace-detail">
          Remaining business days in quarter: <b>{remainingBiz}</b> • Need <b>{neededToHitTarget}</b> more{" "}
          {neededToHitTarget === 1 ? "day" : "days"} • Avg required per business day:{" "}
          <b>{neededPerBizDay.toFixed(2)}</b>
        </div>
        <div className="pace-note">
          <em>Note:</em> Business days count Mon–Fri and does not exclude holidays. We can add holiday calendars later.
        </div>
      </section>

      <section className="calendar-controls">
        <button onClick={goPrevMonth}>◀ Prev</button>
        <div className="month-label">
          {viewDate.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </div>
        <button onClick={goNextMonth}>Next ▶</button>
        <button className="today" onClick={goToday}>
          Today
        </button>
      </section>

      <section className="calendar">
        <table>
          <thead>
            <tr>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, i) => (
              <tr key={i}>
                {week.map((date, j) => (
                  <DayTile key={j} date={date} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="details">
        <h2>Selected Day</h2>
        <div className="selected-row">
          <div>
            <div className="selected-date">
              {selectedDate.toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              ({selectedISO})
            </div>
            <div className="status-row">
              Status:&nbsp;
              <button
                className={selectedStatus === "in" ? "primary" : ""}
                onClick={() => setStatus(selectedISO, "in")}
              >
                In Office
              </button>
              <button
                className={selectedStatus === "out" ? "warning" : ""}
                onClick={() => setStatus(selectedISO, "out")}
              >
                Not in Office
              </button>
              <button onClick={() => setStatus(selectedISO, undefined)}>Clear</button>
            </div>
          </div>
          <div className="notes">
            <label>
              Notes:
              <textarea
                rows={3}
                placeholder="Optional (e.g., reason, shift, location)"
                value={selectedNotes}
                onChange={(e) => addNote(selectedISO, e.target.value)}
              />
            </label>
          </div>
        </div>
      </section>

      {/* Styles */}
      <style>{`
        :root {
          --bg: #0f172a;          /* slate-900 */
          --card: #111827;       /* gray-900 */
          --text: #e5e7eb;       /* gray-200 */
          --muted: #9ca3af;      /* gray-400 */
          --accent: #60a5fa;     /* blue-400 */
          --green: #22c55e;      /* green-500 */
          --red: #ef4444;        /* red-500 */
          --yellow: #f59e0b;     /* amber-500 */
          --border: #1f2937;     /* gray-800 */
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
        .container { max-width: 980px; margin: 24px auto; padding: 16px; }
        .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .actions { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
        .notifications { padding: 8px 12px; background: var(--card); color: var(--text); border: 1px solid var(--accent); border-radius: 6px; cursor: pointer; }
        h1 { margin: 0; font-size: 1.5rem; }
        .goal { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .goal input { width: 72px; padding: 6px 8px; background: var(--card); color: var(--text); border: 1px solid var(--border); border-radius: 6px; }
        .goal .export { padding: 8px 12px; background: var(--card); color: var(--text); border: 1px solid var(--accent); border-radius: 6px; cursor: pointer; }

        .pace { margin-top: 12px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
        .ahead { color: #bbf7d0; }           /* green-200 */
        .behind { color: #fecaca; }          /* red-200 */
        .onpace { color: var(--muted); }
        .pace-detail { margin-top: 6px; color: var(--muted); }
        .pace-note { margin-top: 4px; color: var(--muted); font-size: 0.9rem; }

        .calendar-controls { display: flex; align-items: center; gap: 10px; margin: 16px 0; }
        .calendar-controls button { padding: 8px 12px; background: var(--card); color: var(--text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; }
        .calendar-controls .today { border-color: var(--accent); }
        .month-label { flex: 1; text-align: center; font-weight: 600; }

        .calendar table { width: 100%; border-collapse: collapse; background: var(--card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        thead th { padding: 10px; border-bottom: 1px solid var(--border); color: var(--muted); font-weight: 600; }
        tbody td.day { height: 72px; border: 1px solid var(--border); position: relative; cursor: pointer; transition: background 0.15s ease; }
        tbody td.day:hover { background: #0b1222; }
        tbody td.blank { background: #0b0f1a; border: 1px solid var(--border); }
        .date { position: absolute; top: 6px; right: 8px; font-size: 0.9rem; color: var(--muted); }
        .day.in { background: rgba(34, 197, 94, 0.18); outline: 2px solid rgba(34,197,94,0.3); }
        .day.out { background: rgba(239, 68, 68, 0.18); outline: 2px solid rgba(239,68,68,0.3); }
        .day.today { box-shadow: inset 0 0 0 2px var(--accent); }
        .day.selected { outline: 2px solid var(--yellow); }

        .details { margin-top: 18px; background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
        .selected-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .selected-date { font-weight: 600; }
        .status-row { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
        .status-row button { padding: 8px 12px; background: var(--card); color: var(--text); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; }
        .status-row button.primary { border-color: var(--green); color: #bbf7d0; }
        .status-row button.warning { border-color: var(--red); color: #fecaca; }
        .notes textarea { width: 100%; margin-top: 6px; padding: 8px; background: #0b0f1a; color: var(--text); border: 1px solid var(--border); border-radius: 6px; resize: vertical; }
        @media (max-width: 720px) {
          .selected-row { grid-template-columns: 1fr; }
          tbody td.day { height: 64px; }
        }
      `}</style>
    </div>
   );
}