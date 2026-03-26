// src/components/dance-master/Challenges.js
import React, { useEffect, useState, useCallback } from "react";

const BASE =
  process.env.REACT_APP_BACKEND_SERVER_URI || "http://localhost:3000/api";

function getUserId() {
  return (
    localStorage.getItem("userId") ||
    localStorage.getItem("user_id") ||
    ""
  );
}

/* ─── Level titles ────────────────────────────────────────── */
const LEVEL_TITLES = [
  "",
  "Beginner",
  "Mover",
  "Groover",
  "Performer",
  "Dancer",
  "Artist",
  "Virtuoso",
  "Master",
  "Legend",
  "Icon",
];

const LEVEL_COLORS = [
  "",
  "#6b7280", // 1 gray
  "#3b82f6", // 2 blue
  "#8b5cf6", // 3 purple
  "#06b6d4", // 4 cyan
  "#059669", // 5 green
  "#d97706", // 6 amber
  "#dc2626", // 7 red
  "#7c3aed", // 8 violet
  "#ec4899", // 9 pink
  "#f59e0b", // 10 gold
];

/* ─── Styles (injected once) ──────────────────────────────── */
const STYLE_TAG = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');

.ch-page * { box-sizing: border-box; }
.ch-page { font-family: 'Sora', sans-serif; }

@keyframes ch-fadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ch-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes ch-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes ch-glow {
  0%, 100% { box-shadow: 0 0 8px rgba(124,58,237,0.2); }
  50% { box-shadow: 0 0 24px rgba(124,58,237,0.4); }
}

.ch-fadein { animation: ch-fadeUp 0.4s ease both; }
.ch-fadein-1 { animation-delay: 0.05s; }
.ch-fadein-2 { animation-delay: 0.10s; }
.ch-fadein-3 { animation-delay: 0.15s; }
.ch-fadein-4 { animation-delay: 0.20s; }
.ch-fadein-5 { animation-delay: 0.25s; }

.ch-badge-card {
  border: 1.5px solid #e5e7eb;
  border-radius: 16px;
  padding: 18px;
  background: #fff;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.ch-badge-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 28px rgba(0,0,0,0.08);
}
.ch-badge-earned {
  border-color: #059669;
  background: linear-gradient(135deg, #f0fdf4 0%, #fff 100%);
}
.ch-badge-earned::after {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 0; height: 0;
  border-top: 32px solid #059669;
  border-left: 32px solid transparent;
}

.ch-challenge-card {
  border: 1.5px solid #e5e7eb;
  border-radius: 16px;
  padding: 20px;
  background: #fff;
  transition: all 0.2s ease;
}
.ch-challenge-card:hover {
  box-shadow: 0 6px 20px rgba(0,0,0,0.06);
}
.ch-challenge-done {
  border-color: #059669;
  background: linear-gradient(135deg, #f0fdf4 0%, #fff 100%);
}

.ch-xp-bar-outer {
  width: 100%;
  height: 12px;
  background: rgba(255,255,255,0.2);
  border-radius: 999px;
  overflow: hidden;
}
.ch-xp-bar-inner {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24);
  background-size: 200% 100%;
  animation: ch-shimmer 2s linear infinite;
  transition: width 0.6s ease;
}

.ch-streak-flame {
  animation: ch-pulse 1.5s ease infinite;
  display: inline-block;
}

.ch-level-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.5px;
}

.ch-tab {
  padding: 10px 20px;
  border: none;
  background: transparent;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.15s;
}
.ch-tab:hover { color: #111827; }
.ch-tab-active {
  color: #111827;
  border-bottom-color: #111827;
}

.ch-xp-popup {
  position: fixed;
  top: 80px;
  right: 24px;
  padding: 14px 20px;
  border-radius: 14px;
  background: #111827;
  color: #fbbf24;
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 15px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  z-index: 1000;
  animation: ch-fadeUp 0.3s ease both;
}
`;

function StyleInjector() {
  useEffect(() => {
    if (document.getElementById("ch-styles")) return;
    const el = document.createElement("style");
    el.id = "ch-styles";
    el.textContent = STYLE_TAG;
    document.head.appendChild(el);
  }, []);
  return null;
}

/* ─── Main Component ──────────────────────────────────────── */

export default function Challenges() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [xpPopup, setXpPopup] = useState(null);

  const userId = getUserId();

  const loadData = useCallback(async () => {
    if (!userId) {
      setError("No user ID found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // First trigger a check to update badges/challenges
      try {
        await fetch(`${BASE}/challenges/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
      } catch {
        // Check endpoint might not exist yet, continue
      }

      const res = await fetch(`${BASE}/challenges?user_id=${userId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load challenges.");
      }

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="ch-page" style={{ padding: 32 }}>
        <StyleInjector />
        <div style={{ textAlign: "center", color: "#6b7280", padding: 60 }}>
          Loading challenges...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ch-page" style={{ padding: 32 }}>
        <StyleInjector />
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca",
          color: "#b91c1c", borderRadius: 12, padding: 16,
        }}>
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { xp, badges, weekly_challenges, recent_xp, stats } = data;
  const levelColor = LEVEL_COLORS[xp.level] || "#6b7280";
  const levelTitle = LEVEL_TITLES[xp.level] || `Level ${xp.level}`;

  const earnedBadges = badges.filter((b) => b.is_earned);
  const unearnedBadges = badges.filter((b) => !b.is_earned);

  const milestones = badges.filter((b) => b.category === "milestone");
  const streakBadges = badges.filter((b) => b.category === "streak");
  const specialBadges = badges.filter((b) => b.category === "special");

  return (
    <div className="ch-page" style={{ padding: "28px 0 60px", minHeight: "100vh" }}>
      <StyleInjector />

      {/* XP Popup */}
      {xpPopup && (
        <div className="ch-xp-popup">+{xpPopup} XP earned!</div>
      )}

      {/* ── HEADER ──────────────────────────────────────── */}
      <div className="ch-fadein" style={{
        background: `linear-gradient(135deg, #111827 0%, ${levelColor}44 100%)`,
        borderRadius: 20,
        padding: "28px 32px",
        marginBottom: 24,
        color: "#fff",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative elements */}
        <div style={{
          position: "absolute", top: -30, right: -30,
          width: 140, height: 140, borderRadius: "50%",
          background: `${levelColor}22`, pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -50, right: 100,
          width: 200, height: 200, borderRadius: "50%",
          background: `${levelColor}11`, pointerEvents: "none",
        }} />

        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 20,
          position: "relative",
        }}>
          <div>
            <div style={{
              display: "flex", alignItems: "center", gap: 12, marginBottom: 8,
            }}>
              <span style={{ fontSize: 36 }}>
                {xp.level >= 8 ? "👑" : xp.level >= 5 ? "⭐" : "🎯"}
              </span>
              <div>
                <div className="ch-level-badge" style={{
                  background: `${levelColor}33`, color: levelColor,
                  border: `1.5px solid ${levelColor}`,
                }}>
                  LVL {xp.level} · {levelTitle}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>
              {earnedBadges.length} badge{earnedBadges.length !== 1 ? "s" : ""} earned · {stats.completed_lessons} lesson{stats.completed_lessons !== 1 ? "s" : ""} completed
            </div>
          </div>

          {/* Streak */}
          <div style={{
            background: "rgba(255,255,255,0.1)",
            borderRadius: 16, padding: "14px 20px",
            textAlign: "center", minWidth: 120,
          }}>
            <div className="ch-streak-flame" style={{ fontSize: 28 }}>
              {xp.current_streak > 0 ? "🔥" : "❄️"}
            </div>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 28, fontWeight: 700,
            }}>
              {xp.current_streak}
            </div>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>
              Day Streak
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: 12, opacity: 0.8, marginBottom: 6,
          }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
              {xp.total_xp} XP
            </span>
            <span>
              {xp.nextLevelXp} XP to Level {xp.level + 1}
            </span>
          </div>
          <div className="ch-xp-bar-outer">
            <div className="ch-xp-bar-inner" style={{ width: `${xp.progress}%` }} />
          </div>
        </div>
      </div>

      {/* ── STATS ROW ───────────────────────────────────── */}
      <div className="ch-fadein ch-fadein-1" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12, marginBottom: 24,
      }}>
        {[
          { icon: "✅", label: "Lessons Done", value: stats.completed_lessons },
          { icon: "⏱️", label: "Total Time", value: `${stats.total_time_min}m` },
          { icon: "🔥", label: "Best Streak", value: `${xp.longest_streak}d` },
          { icon: "🏅", label: "Badges", value: `${earnedBadges.length}/${badges.length}` },
          { icon: "📝", label: "Notes", value: stats.total_notes },
        ].map((s, i) => (
          <div key={i} style={{
            background: "#fff", border: "1.5px solid #e5e7eb",
            borderRadius: 14, padding: "14px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 22, fontWeight: 700, color: "#111827",
            }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── TABS ────────────────────────────────────────── */}
      <div style={{
        borderBottom: "2px solid #e5e7eb", marginBottom: 24,
        display: "flex", gap: 4,
      }}>
        {["overview", "badges", "history"].map((tab) => (
          <button
            key={tab}
            className={`ch-tab ${activeTab === tab ? "ch-tab-active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "overview" ? "🎯 This Week" : tab === "badges" ? "🏅 All Badges" : "📜 XP History"}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ─────────────────────────────────── */}

      {activeTab === "overview" && (
        <div className="ch-fadein">
          {/* Weekly Challenges */}
          <h2 style={{
            fontSize: 20, fontWeight: 700, color: "#111827",
            margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>📅</span> Weekly Challenges
          </h2>

          {weekly_challenges.length === 0 ? (
            <div style={{
              background: "#fff", border: "1.5px solid #e5e7eb",
              borderRadius: 16, padding: 24, textAlign: "center", color: "#6b7280",
            }}>
              No challenges this week. Check back Monday!
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
              {weekly_challenges.map((ch) => (
                <div
                  key={ch.challenge_id}
                  className={`ch-challenge-card ${ch.is_completed ? "ch-challenge-done" : ""}`}
                >
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", gap: 16,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: ch.is_completed ? "#dcfce7" : "#f3f4f6",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24, flexShrink: 0,
                      }}>
                        {ch.is_completed ? "✅" : ch.icon}
                      </div>
                      <div>
                        <div style={{
                          fontWeight: 700, fontSize: 15, color: "#111827",
                          textDecoration: ch.is_completed ? "line-through" : "none",
                          opacity: ch.is_completed ? 0.7 : 1,
                        }}>
                          {ch.title}
                        </div>
                        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                          {ch.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 14, fontWeight: 700,
                        color: ch.is_completed ? "#059669" : "#111827",
                      }}>
                        {ch.current_value}/{ch.target_value}
                      </div>
                      <div style={{
                        fontSize: 11, color: "#f59e0b", fontWeight: 700,
                      }}>
                        +{ch.xp_reward} XP
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{
                    marginTop: 12, height: 6, background: "#f1f5f9",
                    borderRadius: 999, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, (ch.current_value / ch.target_value) * 100)}%`,
                      background: ch.is_completed
                        ? "#059669"
                        : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                      borderRadius: 999,
                      transition: "width 0.4s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recently earned badges */}
          {earnedBadges.length > 0 && (
            <>
              <h2 style={{
                fontSize: 20, fontWeight: 700, color: "#111827",
                margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8,
              }}>
                <span>🏆</span> Recently Earned
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
              }}>
                {earnedBadges.slice(0, 6).map((badge) => (
                  <BadgeCard key={badge.badge_id} badge={badge} />
                ))}
              </div>
            </>
          )}

          {/* Next badges to earn */}
          {unearnedBadges.length > 0 && (
            <>
              <h2 style={{
                fontSize: 20, fontWeight: 700, color: "#111827",
                margin: "32px 0 16px", display: "flex", alignItems: "center", gap: 8,
              }}>
                <span>🎯</span> Up Next
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
              }}>
                {unearnedBadges.slice(0, 4).map((badge) => (
                  <BadgeCard key={badge.badge_id} badge={badge} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "badges" && (
        <div className="ch-fadein">
          {/* Milestone badges */}
          <BadgeSection title="🎓 Lesson Milestones" badges={milestones} />
          <BadgeSection title="🔥 Streak Achievements" badges={streakBadges} />
          <BadgeSection title="⭐ Special Badges" badges={specialBadges} />
        </div>
      )}

      {activeTab === "history" && (
        <div className="ch-fadein">
          <h2 style={{
            fontSize: 20, fontWeight: 700, color: "#111827",
            margin: "0 0 16px",
          }}>
            Recent XP Activity
          </h2>

          {recent_xp.length === 0 ? (
            <div style={{
              background: "#fff", border: "1.5px solid #e5e7eb",
              borderRadius: 16, padding: 24, textAlign: "center", color: "#6b7280",
            }}>
              No XP earned yet. Start practicing to earn rewards!
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {recent_xp.map((entry, i) => (
                <div key={i} style={{
                  background: "#fff", border: "1px solid #e5e7eb",
                  borderRadius: 12, padding: "12px 16px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 20 }}>
                      {entry.reason === "badge_earned" ? "🏅"
                        : entry.reason === "challenge_completed" ? "🎯"
                        : entry.reason === "streak_bonus" ? "🔥"
                        : entry.reason === "daily_login" ? "📅"
                        : entry.reason === "lesson_completed" ? "✅"
                        : "⚡"}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                        {formatReason(entry.reason)}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {formatTimeAgo(entry.created_at)}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700, fontSize: 15,
                    color: "#059669",
                  }}>
                    +{entry.xp_amount} XP
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Badge Card ──────────────────────────────────────────── */

function BadgeCard({ badge }) {
  return (
    <div className={`ch-badge-card ${badge.is_earned ? "ch-badge-earned" : ""}`}>
      <div style={{
        fontSize: 36, marginBottom: 8,
        filter: badge.is_earned ? "none" : "grayscale(1)",
        opacity: badge.is_earned ? 1 : 0.4,
      }}>
        {badge.icon}
      </div>
      <div style={{
        fontWeight: 700, fontSize: 14, color: "#111827",
        marginBottom: 4,
      }}>
        {badge.title}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10, lineHeight: 1.4 }}>
        {badge.description}
      </div>

      {!badge.is_earned && (
        <>
          {/* Progress bar */}
          <div style={{
            height: 5, background: "#f1f5f9",
            borderRadius: 999, overflow: "hidden", marginBottom: 6,
          }}>
            <div style={{
              height: "100%",
              width: `${badge.progress_percent}%`,
              background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
              borderRadius: 999,
              transition: "width 0.4s ease",
            }} />
          </div>
          <div style={{
            fontSize: 11, color: "#6b7280",
            fontFamily: "'Space Mono', monospace",
          }}>
            {badge.current_progress}/{badge.requirement_value}
          </div>
        </>
      )}

      {badge.is_earned && (
        <div style={{
          fontSize: 11, color: "#059669", fontWeight: 700,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          ✓ Earned · +{badge.xp_reward} XP
        </div>
      )}

      {!badge.is_earned && (
        <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, marginTop: 4 }}>
          +{badge.xp_reward} XP
        </div>
      )}
    </div>
  );
}

/* ─── Badge Section ───────────────────────────────────────── */

function BadgeSection({ title, badges }) {
  if (!badges || badges.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{
        fontSize: 18, fontWeight: 700, color: "#111827",
        margin: "0 0 14px",
      }}>
        {title}
      </h3>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 12,
      }}>
        {badges.map((badge) => (
          <BadgeCard key={badge.badge_id} badge={badge} />
        ))}
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────── */

function formatReason(reason) {
  const map = {
    badge_earned: "Badge Earned",
    challenge_completed: "Challenge Completed",
    streak_bonus: "Streak Bonus",
    daily_login: "Daily Practice",
    lesson_completed: "Lesson Completed",
  };
  return map[reason] || reason;
}

function formatTimeAgo(isoString) {
  if (!isoString) return "";
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = Math.floor(diff / 86400);
  return `${d}d ago`;
}