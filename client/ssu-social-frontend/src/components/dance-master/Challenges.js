// src/components/dance-master/Challenges.js
import React, { useEffect, useState, useCallback } from "react";

// Put dance2.jpg in your /public folder, OR import it:
// import danceBg from "../../assets/dance2.jpg";
// then replace DANCE_BG with danceBg in the pageStyle below
const DANCE_BG = process.env.PUBLIC_URL + "/dance2.jpg";

const BASE =
  process.env.REACT_APP_BACKEND_SERVER_URI || "http://localhost:3000/api";

function getUserId() {
  return (
    localStorage.getItem("userId") ||
    localStorage.getItem("user_id") ||
    ""
  );
}

const LEVEL_TITLES = [
  "",
  "Beginner", "Mover", "Groover", "Performer", "Dancer",
  "Artist", "Virtuoso", "Master", "Legend", "Icon",
];

const LEVEL_COLORS = [
  "",
  "#8da07a", "#6db5b8", "#f07fa8", "#5ba4a7", "#c9647e",
  "#7a9e6b", "#e8a882", "#d45c82", "#4a8fa0", "#f59e0b",
];

/* ─── CSS — NO fixed positioning on bg ───────────────────── */
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
  50%       { transform: scale(1.08); }
}
@keyframes ch-shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}

.ch-fadein   { animation: ch-fadeUp 0.4s ease both; }
.ch-fadein-1 { animation-delay: 0.05s; }
.ch-fadein-2 { animation-delay: 0.10s; }
.ch-fadein-3 { animation-delay: 0.15s; }
.ch-fadein-4 { animation-delay: 0.20s; }
.ch-fadein-5 { animation-delay: 0.25s; }

.ch-badge-card {
  border: 1.5px solid rgba(240,127,168,0.2);
  border-radius: 16px;
  padding: 18px;
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.ch-badge-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 28px rgba(240,127,168,0.18);
}
.ch-badge-earned {
  border-color: #6db5b8;
  background: rgba(230,248,249,0.9);
}
.ch-badge-earned::after {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 0; height: 0;
  border-top: 32px solid #6db5b8;
  border-left: 32px solid transparent;
}

.ch-challenge-card {
  border: 1.5px solid rgba(240,127,168,0.2);
  border-radius: 16px;
  padding: 20px;
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}
.ch-challenge-card:hover {
  box-shadow: 0 6px 20px rgba(240,127,168,0.15);
}
.ch-challenge-done {
  border-color: #6db5b8;
  background: rgba(230,248,249,0.9);
}

.ch-xp-bar-outer {
  width: 100%;
  height: 12px;
  background: rgba(255,255,255,0.25);
  border-radius: 999px;
  overflow: hidden;
}
.ch-xp-bar-inner {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #f07fa8, #e8a882, #f07fa8);
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
  color: #9e6e7e;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.15s;
}
.ch-tab:hover { color: #c9647e; }
.ch-tab-active {
  color: #c9647e;
  border-bottom-color: #f07fa8;
}

.ch-xp-popup {
  position: fixed;
  top: 80px;
  right: 24px;
  padding: 14px 20px;
  border-radius: 14px;
  background: #c9647e;
  color: #fff;
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 15px;
  box-shadow: 0 8px 32px rgba(201,100,126,0.35);
  z-index: 1000;
  animation: ch-fadeUp 0.3s ease both;
}

.ch-stat-card {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1.5px solid rgba(240,127,168,0.18);
  border-radius: 14px;
  padding: 14px 16px;
  text-align: center;
}

.ch-info-card {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1.5px solid rgba(240,127,168,0.18);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  color: #9e7080;
}

.ch-xp-row {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(240,127,168,0.15);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
      try {
        await fetch(`${BASE}/challenges/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        });
      } catch { /* continue */ }

      const res = await fetch(`${BASE}/challenges?user_id=${userId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load challenges.");
      }
      setData(await res.json());
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── The key fix: background is on THIS element only (not fixed),
  //    so it never overlaps the navbar which lives outside this component.
  const pageStyle = {
    minHeight: "100vh",
    position: "relative",        // ← relative, NOT fixed
    backgroundImage: `url(${DANCE_BG})`,
    backgroundSize: "cover",
    backgroundPosition: "center top",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "local", // ← local, NOT fixed — stays inside this div
  };

  // White tint layer — absolute inside the relative page div, not fixed
  const tintStyle = {
    position: "absolute",         // ← absolute, NOT fixed
    inset: 0,
    background: "rgba(255, 255, 255, 0.80)",
    pointerEvents: "none",
    zIndex: 0,
  };

  const contentStyle = {
    position: "relative",
    zIndex: 1,
    padding: "28px 24px 80px",
    maxWidth: 960,
    margin: "0 auto",
  };

  if (loading) {
    return (
      <div className="ch-page" style={pageStyle}>
        <StyleInjector />
        <div style={tintStyle} />
        <div style={{ ...contentStyle, textAlign: "center", paddingTop: 80, color: "#c9647e" }}>
          Loading challenges...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ch-page" style={pageStyle}>
        <StyleInjector />
        <div style={tintStyle} />
        <div style={contentStyle}>
          <div style={{ background: "rgba(255,236,236,0.92)", border: "1px solid #f5c2c7", color: "#b91c1c", borderRadius: 12, padding: 16 }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { xp, badges, weekly_challenges, recent_xp, stats } = data;
  const levelColor = LEVEL_COLORS[xp.level] || "#c9647e";
  const levelTitle = LEVEL_TITLES[xp.level] || `Level ${xp.level}`;

  const earnedBadges   = badges.filter((b) => b.is_earned);
  const unearnedBadges = badges.filter((b) => !b.is_earned);
  const milestones     = badges.filter((b) => b.category === "milestone");
  const streakBadges   = badges.filter((b) => b.category === "streak");
  const specialBadges  = badges.filter((b) => b.category === "special");

  return (
    <div className="ch-page" style={pageStyle}>
      <StyleInjector />

      {/* White tint — absolute, stays inside this div, never touches navbar */}
      <div style={tintStyle} />

      <div style={contentStyle}>
        {xpPopup && <div className="ch-xp-popup">+{xpPopup} XP earned!</div>}

        {/* ── HEADER ──────────────────────────────────────── */}
        <div className="ch-fadein" style={{
          background: "linear-gradient(135deg, #c9647e 0%, #f07fa8 50%, #6db5b8 100%)",
          borderRadius: 20, padding: "28px 32px", marginBottom: 24,
          color: "#fff", position: "relative", overflow: "hidden",
          boxShadow: "0 8px 32px rgba(201,100,126,0.28)",
        }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.1)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -50, right: 100, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20, position: "relative" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 36 }}>
                  {xp.level >= 8 ? "👑" : xp.level >= 5 ? "⭐" : "🎯"}
                </span>
                <div className="ch-level-badge" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)" }}>
                  LVL {xp.level} · {levelTitle}
                </div>
              </div>
              <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>
                {earnedBadges.length} badge{earnedBadges.length !== 1 ? "s" : ""} earned · {stats.completed_lessons} lesson{stats.completed_lessons !== 1 ? "s" : ""} completed
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.18)", borderRadius: 16, padding: "14px 20px", textAlign: "center", minWidth: 120, backdropFilter: "blur(8px)" }}>
              <div className="ch-streak-flame" style={{ fontSize: 28 }}>
                {xp.current_streak > 0 ? "🔥" : "❄️"}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 28, fontWeight: 700 }}>
                {xp.current_streak}
              </div>
              <div style={{ fontSize: 11, opacity: 0.85, textTransform: "uppercase", letterSpacing: 1 }}>
                Day Streak
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.9, marginBottom: 6 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{xp.total_xp} XP</span>
              <span>{xp.nextLevelXp} XP to Level {xp.level + 1}</span>
            </div>
            <div className="ch-xp-bar-outer">
              <div className="ch-xp-bar-inner" style={{ width: `${xp.progress}%` }} />
            </div>
          </div>
        </div>

        {/* ── STATS ROW ───────────────────────────────────── */}
        <div className="ch-fadein ch-fadein-1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { icon: "✅", label: "Lessons Done", value: stats.completed_lessons },
            { icon: "⏱️", label: "Total Time",   value: `${stats.total_time_min}m` },
            { icon: "🔥", label: "Best Streak",  value: `${xp.longest_streak}d` },
            { icon: "🏅", label: "Badges",       value: `${earnedBadges.length}/${badges.length}` },
            { icon: "📝", label: "Notes",        value: stats.total_notes },
          ].map((s, i) => (
            <div key={i} className="ch-stat-card">
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: "#c9647e" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#9e7080", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── TABS ────────────────────────────────────────── */}
        <div style={{ borderBottom: "2px solid rgba(240,127,168,0.3)", marginBottom: 24, display: "flex", gap: 4 }}>
          {["overview", "badges", "history"].map((tab) => (
            <button key={tab} className={`ch-tab ${activeTab === tab ? "ch-tab-active" : ""}`} onClick={() => setActiveTab(tab)}>
              {tab === "overview" ? "🎯 This Week" : tab === "badges" ? "🏅 All Badges" : "📜 XP History"}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="ch-fadein">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#c9647e", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <span>📅</span> Weekly Challenges
            </h2>

            {weekly_challenges.length === 0 ? (
              <div className="ch-info-card">No challenges this week. Check back Monday!</div>
            ) : (
              <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
                {weekly_challenges.map((ch) => (
                  <div key={ch.challenge_id} className={`ch-challenge-card ${ch.is_completed ? "ch-challenge-done" : ""}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: ch.is_completed ? "rgba(109,181,184,0.15)" : "rgba(240,127,168,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                          {ch.is_completed ? "✅" : ch.icon}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: "#4a3540", textDecoration: ch.is_completed ? "line-through" : "none", opacity: ch.is_completed ? 0.6 : 1 }}>
                            {ch.title}
                          </div>
                          <div style={{ fontSize: 13, color: "#9e7080", marginTop: 2 }}>{ch.description}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: ch.is_completed ? "#6db5b8" : "#c9647e" }}>
                          {ch.current_value}/{ch.target_value}
                        </div>
                        <div style={{ fontSize: 11, color: "#e8a882", fontWeight: 700 }}>+{ch.xp_reward} XP</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, height: 6, background: "rgba(240,127,168,0.12)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (ch.current_value / ch.target_value) * 100)}%`, background: ch.is_completed ? "#6db5b8" : "linear-gradient(90deg, #f07fa8, #c9647e)", borderRadius: 999, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {earnedBadges.length > 0 && (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#c9647e", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🏆</span> Recently Earned
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {earnedBadges.slice(0, 6).map((badge) => <BadgeCard key={badge.badge_id} badge={badge} />)}
                </div>
              </>
            )}

            {unearnedBadges.length > 0 && (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#c9647e", margin: "32px 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🎯</span> Up Next
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {unearnedBadges.slice(0, 4).map((badge) => <BadgeCard key={badge.badge_id} badge={badge} />)}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── BADGES ──────────────────────────────────────── */}
        {activeTab === "badges" && (
          <div className="ch-fadein">
            <BadgeSection title="🎓 Lesson Milestones"   badges={milestones} />
            <BadgeSection title="🔥 Streak Achievements" badges={streakBadges} />
            <BadgeSection title="⭐ Special Badges"      badges={specialBadges} />
          </div>
        )}

        {/* ── HISTORY ─────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="ch-fadein">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#c9647e", margin: "0 0 16px" }}>
              Recent XP Activity
            </h2>
            {recent_xp.length === 0 ? (
              <div className="ch-info-card">No XP earned yet. Start practicing to earn rewards!</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {recent_xp.map((entry, i) => (
                  <div key={i} className="ch-xp-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 20 }}>
                        {entry.reason === "badge_earned"         ? "🏅"
                          : entry.reason === "challenge_completed" ? "🎯"
                          : entry.reason === "streak_bonus"        ? "🔥"
                          : entry.reason === "daily_login"         ? "📅"
                          : entry.reason === "lesson_completed"    ? "✅"
                          : "⚡"}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "#4a3540" }}>{formatReason(entry.reason)}</div>
                        <div style={{ fontSize: 12, color: "#9e7080" }}>{formatTimeAgo(entry.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 15, color: "#6db5b8" }}>
                      +{entry.xp_amount} XP
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Badge Card ──────────────────────────────────────────── */
function BadgeCard({ badge }) {
  return (
    <div className={`ch-badge-card ${badge.is_earned ? "ch-badge-earned" : ""}`}>
      <div style={{ fontSize: 36, marginBottom: 8, filter: badge.is_earned ? "none" : "grayscale(1)", opacity: badge.is_earned ? 1 : 0.4 }}>
        {badge.icon}
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, color: "#4a3540", marginBottom: 4 }}>{badge.title}</div>
      <div style={{ fontSize: 12, color: "#9e7080", marginBottom: 10, lineHeight: 1.4 }}>{badge.description}</div>

      {!badge.is_earned && (
        <>
          <div style={{ height: 5, background: "rgba(240,127,168,0.12)", borderRadius: 999, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ height: "100%", width: `${badge.progress_percent}%`, background: "linear-gradient(90deg, #f07fa8, #c9647e)", borderRadius: 999, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ fontSize: 11, color: "#9e7080", fontFamily: "'Space Mono', monospace" }}>
            {badge.current_progress}/{badge.requirement_value}
          </div>
        </>
      )}

      {badge.is_earned && (
        <div style={{ fontSize: 11, color: "#6db5b8", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
          ✓ Earned · +{badge.xp_reward} XP
        </div>
      )}
      {!badge.is_earned && (
        <div style={{ fontSize: 11, color: "#e8a882", fontWeight: 600, marginTop: 4 }}>+{badge.xp_reward} XP</div>
      )}
    </div>
  );
}

/* ─── Badge Section ───────────────────────────────────────── */
function BadgeSection({ title, badges }) {
  if (!badges || badges.length === 0) return null;
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: "#c9647e", margin: "0 0 14px" }}>{title}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {badges.map((badge) => <BadgeCard key={badge.badge_id} badge={badge} />)}
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
  return `${Math.floor(diff / 86400)}d ago`;
}