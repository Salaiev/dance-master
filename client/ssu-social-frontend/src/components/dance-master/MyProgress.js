// src/components/dance-master/MyProgress.jsx
import React, { useEffect, useMemo, useState } from "react";

const BASE =
  process.env.REACT_APP_BACKEND_SERVER_URI || "http://localhost:3000/api";

// Put your uploaded dancing image in: public/dance2.jpg
// React public assets are referenced from the browser as /dance2.jpg
const BACKGROUND_IMAGE = "/dance2.jpg";

function formatMinutes(seconds) {
  const mins = Math.ceil((Number(seconds) || 0) / 60);
  return `${mins} min`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusLabel(status) {
  if (!status) return "Not Started";
  if (status === "COMPLETED") return "Completed";
  if (status === "IN_PROGRESS") return "In Progress";
  return "Not Started";
}

function lessonPercent(item) {
  if (item.status === "COMPLETED" || item.is_completed) return 100;

  let percent = 0;
  if (item.video_completed) percent += 50;
  if (item.instructions_completed) percent += 50;
  if (percent === 0 && Number(item.time_spent_sec) > 0) percent = 25;
  if (percent === 0 && Number(item.last_position_sec) > 0) percent = 25;

  return percent;
}

export default function MyProgress() {
  const [summary, setSummary] = useState(null);
  const [recentCompleted, setRecentCompleted] = useState([]);
  const [progressItems, setProgressItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userId =
    localStorage.getItem("userId") ||
    localStorage.getItem("user_id") ||
    "";

  useEffect(() => {
    if (!userId) {
      setError("No userId found in localStorage.");
      setLoading(false);
      return;
    }

    let ignore = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [summaryRes, progressRes] = await Promise.all([
          fetch(`${BASE}/progress/summary?user_id=${encodeURIComponent(userId)}`),
          fetch(`${BASE}/progress?user_id=${encodeURIComponent(userId)}`),
        ]);

        if (!summaryRes.ok) {
          const errData = await summaryRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load summary.");
        }

        if (!progressRes.ok) {
          const errData = await progressRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load progress.");
        }

        const [summaryData, progressData] = await Promise.all([
          summaryRes.json(),
          progressRes.json(),
        ]);

        if (!ignore) {
          setSummary(summaryData.summary || null);
          setRecentCompleted(summaryData.recent_completed || []);
          setProgressItems(progressData.items || progressData.progress || []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Something went wrong.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [userId]);

  const completedItems = useMemo(
    () => progressItems.filter((item) => item.status === "COMPLETED" || item.is_completed),
    [progressItems]
  );

  const inProgressItems = useMemo(
    () => progressItems.filter((item) => item.status === "IN_PROGRESS"),
    [progressItems]
  );

  const totalLessons = progressItems.length;
  const completedCount = summary?.completed_lessons ?? completedItems.length;
  const completionPercent = totalLessons
    ? Math.round((completedCount / totalLessons) * 100)
    : 0;

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.overlay}>
          <div style={styles.container}>
            <div style={styles.loadingCard}>Loading your dance progress...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.overlay}>
          <div style={styles.container}>
            <div style={styles.errorCard}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.overlay}>
        <div style={styles.container}>
          <section style={styles.hero}>
            <div style={styles.heroText}>
              <div style={styles.kicker}>Dance Master</div>
              <h1 style={styles.title}>My Progress</h1>
              <p style={styles.subtitle}>
                Keep track of your lessons, practice time, and completed dance training.
              </p>
            </div>

            <div style={styles.heroProgressCard}>
              <div style={styles.bigPercent}>{completionPercent}%</div>
              <div style={styles.heroProgressText}>Complete</div>
              <div style={styles.heroProgressSubtext}>
                {completedCount} of {totalLessons} lessons
              </div>
            </div>
          </section>

          <section style={styles.statsGrid}>
            <StatCard label="Completed" value={completedCount} />
            <StatCard label="In Progress" value={summary?.in_progress_lessons ?? inProgressItems.length} />
            <StatCard label="Today" value={`${summary?.today_time_spent_min ?? 0} min`} />
            <StatCard label="This Week" value={`${summary?.week_time_spent_min ?? 0} min`} />
            
            <StatCard label="Last Completed" value={formatDate(summary?.last_completed_at)} small />
          </section>

          <ProgressSection
            title="Current Lessons"
            emptyText="No lessons in progress yet."
            items={inProgressItems}
            badgeColor="blue"
          />

          <ProgressSection
            title="Completed Lessons"
            emptyText="No completed lessons yet."
            items={completedItems}
            badgeColor="green"
          />

          <section style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Recent Completions</h2>
            </div>

            {recentCompleted.length === 0 ? (
              <div style={styles.infoCard}>No recent completions yet.</div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Lesson</th>
                      <th style={styles.th}>Style</th>
                      <th style={styles.th}>Difficulty</th>
                      <th style={styles.th}>Time</th>
                      <th style={styles.th}>Completed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCompleted.map((item) => (
                      <tr key={`${item.lesson_id}-${item.completed_at}`}>
                        <td style={styles.td}>{item.title}</td>
                        <td style={styles.td}>{item.style || "—"}</td>
                        <td style={styles.td}>{item.difficulty || "—"}</td>
                        <td style={styles.td}>{formatMinutes(item.time_spent_sec)}</td>
                        <td style={styles.td}>{formatDate(item.completed_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, small }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statLabel}>{label}</div>
      <div style={small ? styles.statValueSmall : styles.statValue}>{value}</div>
    </div>
  );
}

function ProgressSection({ title, emptyText, items, badgeColor }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <h2 style={styles.sectionTitle}>{title}</h2>
      </div>

      {items.length === 0 ? (
        <div style={styles.infoCard}>{emptyText}</div>
      ) : (
        <div style={styles.lessonGrid}>
          {items.map((item) => {
            const percent = lessonPercent(item);

            return (
              <div key={item.lesson_id} style={styles.lessonCard}>
                <div style={styles.lessonTopRow}>
                  <h3 style={styles.lessonTitle}>{item.title || `Lesson ${item.lesson_id}`}</h3>
                  <span style={badgeColor === "green" ? styles.badgeGreen : styles.badgeBlue}>
                    {statusLabel(item.status)}
                  </span>
                </div>

                <div style={styles.lessonMeta}>
                  <span>{item.style || "Dance"}</span>
                  <span>•</span>
                  <span>{item.difficulty || "Level"}</span>
                </div>

                <p style={styles.lessonDescription}>
                  {item.description || "Continue practicing this lesson to improve your routine."}
                </p>

                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: `${percent}%` }} />
                </div>
                <div style={styles.percentText}>{percent}% complete</div>

                <div style={styles.progressRow}>
                  <div style={styles.progressLabel}>Time Spent</div>
                  <div style={styles.progressValue}>{formatMinutes(item.time_spent_sec)}</div>
                </div>

                <div style={styles.progressRow}>
                  <div style={styles.progressLabel}>Video</div>
                  <div style={styles.progressValue}>{item.video_completed ? "Completed" : "Not completed"}</div>
                </div>

                <div style={styles.progressRow}>
                  <div style={styles.progressLabel}>Instructions</div>
                  <div style={styles.progressValue}>{item.instructions_completed ? "Completed" : "Not completed"}</div>
                </div>

                {item.status !== "COMPLETED" && !item.is_completed && (
                  <div style={styles.progressRow}>
                    <div style={styles.progressLabel}>Last Position</div>
                    <div style={styles.progressValue}>{item.last_position_sec || 0}s</div>
                  </div>
                )}

                <div style={styles.progressRow}>
                  <div style={styles.progressLabel}>
                    {item.status === "COMPLETED" || item.is_completed ? "Finished On" : "Last Opened"}
                  </div>
                  <div style={styles.progressValue}>
                    {formatDate(item.completed_at || item.last_accessed_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.94), rgba(255,255,255,0.84)), url(${BACKGROUND_IMAGE})`,
    backgroundSize: "contain",
    backgroundPosition: "right 70px top 70px",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "fixed",
  },
  overlay: {
    minHeight: "100vh",
    padding: "36px 20px 56px",
  },
  container: {
    maxWidth: 1180,
    margin: "0 auto",
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "stretch",
    gap: 24,
    flexWrap: "wrap",
    marginBottom: 22,
  },
  heroText: {
    flex: "1 1 520px",
    background: "rgba(255,255,255,0.74)",
    border: "1px solid rgba(255,255,255,0.85)",
    boxShadow: "0 18px 45px rgba(17,24,39,0.08)",
    borderRadius: 28,
    padding: "34px 32px",
    backdropFilter: "blur(10px)",
  },
  kicker: {
    color: "#ef5f8f",
    fontWeight: 800,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    fontSize: 13,
    marginBottom: 10,
  },
  title: {
    margin: 0,
    fontSize: 44,
    lineHeight: 1,
    fontWeight: 900,
    color: "#172033",
  },
  subtitle: {
    marginTop: 14,
    marginBottom: 0,
    maxWidth: 560,
    color: "#5f6676",
    fontSize: 16,
    lineHeight: 1.7,
  },
  heroProgressCard: {
    flex: "0 1 250px",
    borderRadius: 28,
    padding: 28,
    background: "linear-gradient(135deg, rgba(239,95,143,0.96), rgba(120,183,199,0.96))",
    color: "#ffffff",
    boxShadow: "0 18px 45px rgba(239,95,143,0.22)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
  },
  bigPercent: {
    fontSize: 54,
    lineHeight: 1,
    fontWeight: 900,
  },
  heroProgressText: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: 800,
  },
  heroProgressSubtext: {
    marginTop: 5,
    fontSize: 14,
    opacity: 0.9,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 14,
    marginBottom: 30,
  },
  statCard: {
    background: "rgba(255,255,255,0.82)",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 14px 32px rgba(17,24,39,0.07)",
    border: "1px solid rgba(255,255,255,0.9)",
    backdropFilter: "blur(10px)",
  },
  statLabel: {
    color: "#747b8c",
    fontSize: 13,
    marginBottom: 8,
    fontWeight: 700,
  },
  statValue: {
    color: "#172033",
    fontSize: 26,
    fontWeight: 900,
  },
  statValueSmall: {
    color: "#172033",
    fontSize: 14,
    lineHeight: 1.35,
    fontWeight: 800,
  },
  section: {
    marginTop: 30,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 24,
    margin: 0,
    color: "#172033",
    fontWeight: 900,
  },
  infoCard: {
    background: "rgba(255,255,255,0.86)",
    borderRadius: 22,
    padding: 20,
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 14px 32px rgba(17,24,39,0.07)",
    color: "#3f4657",
    backdropFilter: "blur(10px)",
  },
  errorCard: {
    background: "rgba(255,255,255,0.9)",
    borderRadius: 22,
    padding: 20,
    border: "1px solid #fecaca",
    boxShadow: "0 14px 32px rgba(17,24,39,0.07)",
    color: "#b91c1c",
    fontWeight: 700,
  },
  loadingCard: {
    background: "rgba(255,255,255,0.9)",
    borderRadius: 22,
    padding: 20,
    border: "1px solid rgba(255,255,255,0.9)",
    boxShadow: "0 14px 32px rgba(17,24,39,0.07)",
    color: "#3f4657",
    fontWeight: 700,
  },
  lessonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
    gap: 16,
  },
  lessonCard: {
    background: "rgba(255,255,255,0.88)",
    borderRadius: 24,
    padding: 20,
    border: "1px solid rgba(255,255,255,0.92)",
    boxShadow: "0 16px 36px rgba(17,24,39,0.08)",
    backdropFilter: "blur(12px)",
  },
  lessonTopRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  lessonTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
    color: "#172033",
  },
  lessonMeta: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    color: "#747b8c",
    fontSize: 13,
    marginBottom: 12,
    flexWrap: "wrap",
    fontWeight: 700,
  },
  lessonDescription: {
    color: "#3f4657",
    fontSize: 14,
    lineHeight: 1.55,
    marginBottom: 16,
  },
  progressTrack: {
    height: 9,
    borderRadius: 999,
    background: "#f1f5f9",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #ef5f8f, #78b7c7)",
    transition: "width 0.25s ease",
  },
  percentText: {
    marginTop: 7,
    marginBottom: 10,
    color: "#747b8c",
    fontSize: 12,
    fontWeight: 800,
  },
  progressRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 0",
    borderTop: "1px solid rgba(226,232,240,0.9)",
    fontSize: 14,
  },
  progressLabel: {
    color: "#747b8c",
  },
  progressValue: {
    color: "#172033",
    fontWeight: 800,
    textAlign: "right",
  },
  badgeBlue: {
    background: "#dff5fb",
    color: "#257184",
    borderRadius: 999,
    padding: "6px 11px",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  badgeGreen: {
    background: "#dcfce7",
    color: "#15803d",
    borderRadius: 999,
    padding: "6px 11px",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  tableWrap: {
    background: "rgba(255,255,255,0.88)",
    borderRadius: 22,
    overflowX: "auto",
    border: "1px solid rgba(255,255,255,0.92)",
    boxShadow: "0 16px 36px rgba(17,24,39,0.08)",
    backdropFilter: "blur(12px)",
  },
  table: {
    width: "100%",
    minWidth: 720,
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: 15,
    background: "rgba(248,250,252,0.85)",
    borderBottom: "1px solid #e5e7eb",
    color: "#3f4657",
    fontSize: 13,
    fontWeight: 900,
  },
  td: {
    padding: 15,
    borderBottom: "1px solid #f1f5f9",
    fontSize: 14,
    color: "#172033",
    fontWeight: 600,
  },
};
