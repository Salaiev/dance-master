// src/components/dance-master/DanceMasterHome.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLessons, getNotes } from "./dmApi";

/* ─── helpers ─────────────────────────────────────────────── */
function formatMinutes(mins) {
  return `${Number(mins || 0)} min`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ─── style constants ─────────────────────────────────────── */
const PURPLE = "#7c3aed";
const PURPLE_LIGHT = "#ede9fe";
const PURPLE_DARK = "#5b21b6";
const SURFACE = "#ffffff";
const BG = "#f5f3ff";
const BORDER = "#e8e3f8";
const TEXT = "#1e1b4b";
const MUTED = "#6b7280";
const GREEN = "#059669";
const GREEN_LIGHT = "#d1fae5";
const BLUE_LIGHT = "#dbeafe";
const BLUE = "#1d4ed8";

const FONT_HEADING = "'DM Serif Display', 'Georgia', serif";
const FONT_BODY = "'DM Sans', 'Segoe UI', sans-serif";

const STYLE_TAG = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');

.dm-home * { box-sizing: border-box; }

.dm-card {
  background: ${SURFACE};
  border: 1px solid ${BORDER};
  border-radius: 18px;
  transition: box-shadow 0.18s, transform 0.18s;
}
.dm-card:hover {
  box-shadow: 0 8px 28px rgba(124,58,237,0.10);
}
.dm-card-click {
  cursor: pointer;
}
.dm-card-click:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 32px rgba(124,58,237,0.13);
}

.dm-lesson-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.dm-lesson-row:hover {
  background: ${BG};
}

.dm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 10px;
  font-family: ${FONT_BODY};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
}
.dm-btn-primary {
  background: ${PURPLE};
  color: #fff;
}
.dm-btn-primary:hover {
  background: ${PURPLE_DARK};
}
.dm-btn-ghost {
  background: transparent;
  color: ${PURPLE};
  border: 1.5px solid ${PURPLE};
}
.dm-btn-ghost:hover {
  background: ${PURPLE_LIGHT};
}
.dm-btn-outline {
  background: #fff;
  color: ${TEXT};
  border: 1.5px solid ${BORDER};
  width: 100%;
  justify-content: center;
}
.dm-btn-outline:hover {
  background: ${BG};
  border-color: ${PURPLE};
  color: ${PURPLE};
}

.dm-quick-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  border-radius: 18px;
  cursor: pointer;
  border: 1.5px solid ${BORDER};
  background: ${SURFACE};
  transition: all 0.18s;
  text-align: left;
}
.dm-quick-card:hover {
  border-color: ${PURPLE};
  box-shadow: 0 6px 20px rgba(124,58,237,0.12);
  transform: translateY(-2px);
}

.dm-stat-card {
  padding: 18px 20px;
  border-radius: 16px;
  border: 1.5px solid ${BORDER};
  background: ${SURFACE};
}

.dm-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.dm-fadein { animation: fadeUp 0.35s ease both; }
.dm-fadein-1 { animation-delay: 0.05s; }
.dm-fadein-2 { animation-delay: 0.10s; }
.dm-fadein-3 { animation-delay: 0.15s; }
.dm-fadein-4 { animation-delay: 0.20s; }
`;

/* ─── sub-components ──────────────────────────────────────── */

function StyleInjector() {
  useEffect(() => {
    if (document.getElementById("dm-home-styles")) return;
    const el = document.createElement("style");
    el.id = "dm-home-styles";
    el.textContent = STYLE_TAG;
    document.head.appendChild(el);
  }, []);
  return null;
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="dm-stat-card dm-fadein" style={{ borderLeft: `4px solid ${accent || PURPLE}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: FONT_BODY }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: TEXT, fontFamily: FONT_BODY }}>{value}</div>
    </div>
  );
}

function QuickCard({ icon, title, desc, onClick, accent }) {
  return (
    <button className="dm-quick-card" onClick={onClick}>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: accent || PURPLE_LIGHT,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, fontFamily: FONT_BODY }}>{title}</div>
      <div style={{ fontSize: 13, color: MUTED, fontFamily: FONT_BODY }}>{desc}</div>
    </button>
  );
}

function StyleBadge({ style, difficulty }) {
  const styleColors = {
    HIPHOP: { bg: "#fef3c7", color: "#b45309" },
    HIP_HOP: { bg: "#fef3c7", color: "#b45309" },
    JAZZ: { bg: "#dbeafe", color: "#1d4ed8" },
    SALSA: { bg: "#fce7f3", color: "#9d174d" },
    BALLET: { bg: "#ede9fe", color: "#5b21b6" },
    CONTEMPORARY: { bg: "#d1fae5", color: "#065f46" },
  };
  const colors = styleColors[style?.toUpperCase()] || { bg: PURPLE_LIGHT, color: PURPLE_DARK };
  return (
    <span className="dm-badge" style={{ background: colors.bg, color: colors.color }}>
      {style}
    </span>
  );
}

/* ─── main component ──────────────────────────────────────── */

export default function DanceMasterHome() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [recentCompleted, setRecentCompleted] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setError("");
      setLoading(true);

      try {
        const userId =
          localStorage.getItem("userId") ||
          localStorage.getItem("user_id") ||
          "";

        const lessonRes = await getLessons();
        const lessonItems = lessonRes.items || lessonRes || [];

        if (!mounted) return;
        setLessons(lessonItems);

        const top = lessonItems.slice(0, 3);
        const noteResults = await Promise.all(
          top.map(async (lesson) => {
            const lessonId = lesson.lesson_id || lesson.id;
            const res = await getNotes(lessonId);
            const items = res.items || [];
            return items.map((n) => ({
              ...n,
              lesson_id: lessonId,
              lesson_title: lesson.title,
            }));
          })
        );

        const flatNotes = noteResults
          .flat()
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 5);

        if (!mounted) return;
        setRecentNotes(flatNotes);

        // ✅ BUG FIX: Check res.ok BEFORE calling .json()
        // Previously, .json() was called on an HTML error page which threw:
        // "Unexpected token '<', "<!DOCTYPE..." is not valid JSON"
        if (userId) {
          const summaryRes = await fetch(`/api/progress/summary?user_id=${userId}`);

          if (!summaryRes.ok) {
            // Gracefully degrade — don't crash the whole page
            console.warn("Progress summary unavailable:", summaryRes.status);
            if (mounted) {
              setSummary(null);
              setRecentCompleted([]);
            }
          } else {
            const summaryData = await summaryRes.json();
            if (!mounted) return;
            setSummary(summaryData.summary || null);
            setRecentCompleted(summaryData.recent_completed || []);
          }
        } else {
          if (mounted) {
            setSummary(null);
            setRecentCompleted([]);
          }
        }
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Failed to load home data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  const totalLessons = lessons.length;
  const completedLessons = summary?.completed_lessons ?? 0;
  const inProgressLessons = summary?.in_progress_lessons ?? 0;
  const todayMinutes = summary?.today_time_spent_min ?? 0;
  const weekMinutes = summary?.week_time_spent_min ?? 0;

  return (
    <div
      className="dm-home"
      style={{
        minHeight: "100vh",
        background: BG,
        fontFamily: FONT_BODY,
        padding: "32px 24px 60px",
      }}
    >
      <StyleInjector />

      <div style={{ maxWidth: 1180, margin: "0 auto" }}>

        {/* ── HERO HEADER ─────────────────────────────────── */}
        <div
          className="dm-fadein"
          style={{
            background: `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)`,
            borderRadius: 24,
            padding: "32px 36px",
            marginBottom: 28,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* decorative circles */}
          <div style={{
            position: "absolute", top: -40, right: -40,
            width: 180, height: 180, borderRadius: "50%",
            background: "rgba(255,255,255,0.07)", pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: -60, right: 80,
            width: 240, height: 240, borderRadius: "50%",
            background: "rgba(255,255,255,0.05)", pointerEvents: "none",
          }} />

          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>
              {getGreeting()} 👋
            </div>
            <h1 style={{ fontFamily: FONT_HEADING, fontSize: 36, fontWeight: 400, margin: 0, lineHeight: 1.2 }}>
              Welcome back to<br />Dance Master
            </h1>
            <p style={{ marginTop: 10, opacity: 0.82, fontSize: 15, margin: "10px 0 0" }}>
              Keep the rhythm going — your lessons are waiting.
            </p>
          </div>

          <div style={{
            display: "flex", gap: 14, flexWrap: "wrap", position: "relative",
          }}>
            <button className="dm-btn" style={{ background: "#fff", color: PURPLE, fontWeight: 700 }}
              onClick={() => navigate("/dance-master/lessons")}>
              🎵 Browse Lessons
            </button>
            <button className="dm-btn" style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)" }}
              onClick={() => navigate("/dance-master/progress")}>
              📊 My Progress
            </button>
          </div>
        </div>

        {/* ── STATS ROW ───────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}>
          <StatCard icon="📚" label="Lessons" value={loading ? "—" : totalLessons} accent={PURPLE} />
          <StatCard icon="✅" label="Completed" value={loading ? "—" : completedLessons} accent={GREEN} />
          <StatCard icon="⚡" label="In Progress" value={loading ? "—" : inProgressLessons} accent="#f59e0b" />
          <StatCard icon="🕐" label="Today" value={loading ? "—" : formatMinutes(todayMinutes)} accent="#06b6d4" />
          <StatCard icon="📅" label="This Week" value={loading ? "—" : formatMinutes(weekMinutes)} accent="#8b5cf6" />
        </div>

        {/* ── QUICK ACTIONS ───────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 400, color: TEXT, margin: "0 0 14px" }}>
            Quick Access
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
            <QuickCard icon="🎓" title="Lessons" desc="Browse all dance lessons"
              onClick={() => navigate("/dance-master/lessons")} accent={PURPLE_LIGHT} />
            <QuickCard icon="📈" title="My Progress" desc="Track your learning journey"
              onClick={() => navigate("/dance-master/progress")} accent="#d1fae5" />
            <QuickCard icon="📝" title="Notes" desc="Review your lesson notes"
              onClick={() => navigate("/dance-master/lessons")} accent={BLUE_LIGHT} />
            {recentCompleted.length > 0 && (
              <QuickCard icon="🏆" title="Last Completed" desc={recentCompleted[0]?.title || "View achievement"}
                onClick={() => navigate("/dance-master/progress")} accent="#fef3c7" />
            )}
          </div>
        </div>

        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
            borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── MAIN CONTENT ────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>

          {/* Current Lessons */}
          <div className="dm-card dm-fadein dm-fadein-2" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontFamily: FONT_HEADING, fontSize: 20, fontWeight: 400, color: TEXT, margin: 0 }}>
                Current Lessons
              </h2>
              <span style={{ fontSize: 13, color: MUTED }}>
                {loading ? "" : `${Math.min(5, lessons.length)} of ${lessons.length}`}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} style={{ height: 68, borderRadius: 12, background: "#f3f0ff", animation: "pulse 1.5s ease infinite" }} />
                ))
              ) : lessons.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: MUTED }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🎵</div>
                  <div>No lessons available yet.</div>
                </div>
              ) : (
                lessons.slice(0, 5).map((x, i) => (
                  <div
                    key={x.lesson_id || x.id}
                    className="dm-lesson-row"
                    onClick={() => navigate(`/dance-master/lessons/${x.lesson_id || x.id}`)}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: PURPLE_LIGHT, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 18, flexShrink: 0,
                    }}>
                      🎵
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: TEXT, fontSize: 15, marginBottom: 4 }}>{x.title}</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <StyleBadge style={x.style} difficulty={x.difficulty} />
                        <span className="dm-badge" style={{ background: "#f3f4f6", color: "#374151" }}>
                          {x.difficulty}
                        </span>
                      </div>
                      {x.description && (
                        <div style={{
                          marginTop: 4, fontSize: 12, color: MUTED,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          maxWidth: "95%",
                        }}>
                          {x.description}
                        </div>
                      )}
                    </div>
                    <div style={{ color: PURPLE, fontSize: 18, flexShrink: 0 }}>›</div>
                  </div>
                ))
              )}
            </div>

            {!loading && lessons.length > 0 && (
              <button className="dm-btn dm-btn-outline" style={{ marginTop: 16 }}
                onClick={() => navigate("/dance-master/lessons")}>
                View All {totalLessons} Lessons →
              </button>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Recent Notes */}
            <div className="dm-card dm-fadein dm-fadein-3" style={{ padding: 20 }}>
              <h2 style={{ fontFamily: FONT_HEADING, fontSize: 18, fontWeight: 400, color: TEXT, margin: "0 0 14px" }}>
                📝 Recent Notes
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {loading ? (
                  <div style={{ color: MUTED, fontSize: 14 }}>Loading…</div>
                ) : recentNotes.length === 0 ? (
                  <div style={{ color: MUTED, fontSize: 14, textAlign: "center", padding: "20px 0" }}>
                    No notes yet.
                  </div>
                ) : (
                  recentNotes.map((n) => (
                    <div
                      key={n.note_id}
                      className="dm-lesson-row"
                      onClick={() => navigate(`/dance-master/lessons/${n.lesson_id}`)}
                      style={{ padding: "10px 12px" }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: TEXT, fontSize: 13 }}>
                          {n.lesson_title || "Lesson"}
                        </div>
                        <div style={{
                          fontSize: 12, color: MUTED, marginTop: 2,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {n.content}
                        </div>
                      </div>
                      <div style={{ color: PURPLE, fontSize: 16 }}>›</div>
                    </div>
                  ))
                )}
              </div>
              <button className="dm-btn dm-btn-outline" style={{ marginTop: 12, fontSize: 13 }}
                onClick={() => navigate("/dance-master/lessons")}>
                Open Lessons
              </button>
            </div>

            {/* Recently Completed */}
            <div className="dm-card dm-fadein dm-fadein-4" style={{ padding: 20 }}>
              <h2 style={{ fontFamily: FONT_HEADING, fontSize: 18, fontWeight: 400, color: TEXT, margin: "0 0 14px" }}>
                🏆 Recently Completed
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {loading ? (
                  <div style={{ color: MUTED, fontSize: 14 }}>Loading…</div>
                ) : recentCompleted.length === 0 ? (
                  <div style={{ color: MUTED, fontSize: 14, textAlign: "center", padding: "20px 0" }}>
                    No completed lessons yet.<br />
                    <span style={{ fontSize: 12 }}>Start one to track progress!</span>
                  </div>
                ) : (
                  recentCompleted.slice(0, 4).map((item) => (
                    <div
                      key={`${item.lesson_id}-${item.completed_at}`}
                      className="dm-lesson-row"
                      onClick={() => navigate(`/dance-master/lessons/${item.lesson_id}`)}
                      style={{ padding: "10px 12px" }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: GREEN_LIGHT, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: 14, flexShrink: 0,
                      }}>✓</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: TEXT, fontSize: 13 }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                          {item.style} · {item.difficulty} · {formatMinutes(Math.ceil((item.time_spent_sec || 0) / 60))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button className="dm-btn dm-btn-outline" style={{ marginTop: 12, fontSize: 13 }}
                onClick={() => navigate("/dance-master/progress")}>
                View All Progress
              </button>
            </div>

          </div>
        </div>

        {/* last completed timestamp */}
        {summary?.last_completed_at && (
          <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: MUTED }}>
            Last activity: {formatDate(summary.last_completed_at)}
          </div>
        )}
      </div>
    </div>
  );
}