// src/components/dance-master/MyProgress.jsx
import React, { useEffect, useMemo, useState } from "react";

const BASE =
  process.env.REACT_APP_BACKEND_SERVER_URI || "http://localhost:3000/api";

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

export default function MyProgress() {
  const [summary, setSummary] = useState(null);
  const [recentCompleted, setRecentCompleted] = useState([]);
  const [progressItems, setProgressItems] = useState([]);
  const [reports, setReports] = useState([]);
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
          fetch(`${BASE}/progress/summary?user_id=${userId}`),
          fetch(`${BASE}/progress?user_id=${userId}`),
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

        // Reports is optional — don't crash if route doesn't exist yet
        let reportsData = { reports: [] };
        try {
          const reportsRes = await fetch(`${BASE}/reports?user_id=${userId}`);
          if (reportsRes.ok) {
            reportsData = await reportsRes.json();
          }
        } catch {
          // reports route not available yet
        }

        if (!ignore) {
          setSummary(summaryData.summary || null);
          setRecentCompleted(summaryData.recent_completed || []);
          setProgressItems(progressData.items || []);
          setReports(reportsData.reports || []);
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
    () => progressItems.filter((item) => item.status === "COMPLETED"),
    [progressItems]
  );

  const inProgressItems = useMemo(
    () => progressItems.filter((item) => item.status === "IN_PROGRESS"),
    [progressItems]
  );

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>My Progress</h1>
          <div style={styles.infoCard}>Loading progress...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>My Progress</h1>
          <div style={{ ...styles.infoCard, color: "#b91c1c" }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>My Progress</h1>
            <p style={styles.subtitle}>
              Track your completed lessons, time spent, and class reports.
            </p>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Completed Lessons</div>
            <div style={styles.statValue}>
              {summary?.completed_lessons ?? 0}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>In Progress</div>
            <div style={styles.statValue}>
              {summary?.in_progress_lessons ?? 0}
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>Today</div>
            <div style={styles.statValue}>
              {summary?.today_time_spent_min ?? 0} min
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>This Week</div>
            <div style={styles.statValue}>
              {summary?.week_time_spent_min ?? 0} min
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Time</div>
            <div style={styles.statValue}>
              {summary?.total_time_spent_min ?? 0} min
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>Last Completed</div>
            <div style={{ ...styles.statValue, fontSize: 15, lineHeight: 1.3 }}>
              {formatDate(summary?.last_completed_at)}
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Current Lessons</h2>

          {inProgressItems.length === 0 ? (
            <div style={styles.infoCard}>No lessons in progress yet.</div>
          ) : (
            <div style={styles.lessonGrid}>
              {inProgressItems.map((item) => (
                <div key={item.lesson_id} style={styles.lessonCard}>
                  <div style={styles.lessonTopRow}>
                    <h3 style={styles.lessonTitle}>{item.title}</h3>
                    <span style={styles.badgeBlue}>
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <div style={styles.lessonMeta}>
                    <span>{item.style}</span>
                    <span>•</span>
                    <span>{item.difficulty}</span>
                  </div>

                  <p style={styles.lessonDescription}>
                    {item.description || "No description available."}
                  </p>

                  <div style={styles.progressRow}>
                    <div style={styles.progressLabel}>Time Spent</div>
                    <div style={styles.progressValue}>
                      {formatMinutes(item.time_spent_sec)}
                    </div>
                  </div>

                  <div style={styles.progressRow}>
                    <div style={styles.progressLabel}>Video</div>
                    <div style={styles.progressValue}>
                      {item.video_completed ? "Completed" : "Not completed"}
                    </div>
                  </div>

                  <div style={styles.progressRow}>
                    <div style={styles.progressLabel}>Instructions</div>
                    <div style={styles.progressValue}>
                      {item.instructions_completed
                        ? "Completed"
                        : "Not completed"}
                    </div>
                  </div>

                  <div style={styles.progressRow}>
                    <div style={styles.progressLabel}>Last Position</div>
                    <div style={styles.progressValue}>
                      {item.last_position_sec || 0}s
                    </div>
                  </div>

                  <div style={styles.progressRow}>
                    <div style={styles.progressLabel}>Last Opened</div>
                    <div style={styles.progressValue}>
                      {formatDate(item.last_accessed_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Completed Lessons</h2>

          {completedItems.length === 0 ? (
            <div style={styles.infoCard}>No completed lessons yet.</div>
          ) : (
            <div style={styles.lessonGrid}>
              {completedItems.map((item) => (
                <div key={item.lesson_id} style={styles.lessonCard}>
                  <div style={styles.lessonTopRow}>
                    <h3 style={styles.lessonTitle}>{item.title}</h3>
                    <span style={styles.badgeGreen}>Completed</span>
                  </div>

                  <div style={styles.lessonMeta}>
                    <span>{item.style}</span>
                    <span>•</span>
                    <span>{item.difficulty}</span>
                  </div>

                  <p style={styles.lessonDescription}>
                    {item.description || "No description available."}
                  </p>

                  <div style={styles.progressRow}>
                    <div style={styles.progressLabel}>Finished On</div>
                    <div style={styles.progressValue}>
                      {formatDate(item.completed_at)}
                    </div>
                  </div>

                  <div style={styles.progressRow}>
                    <div style={styles.progressLabel}>Time Spent</div>
                    <div style={styles.progressValue}>
                      {formatMinutes(item.time_spent_sec)}
                    </div>
                  </div>

                  <div style={styles.progressRow}>
                    <div style={styles.progressLabel}>Video</div>
                    <div style={styles.progressValue}>
                      {item.video_completed ? "Completed" : "Not completed"}
                    </div>
                  </div>

                  <div style={styles.progressRow}>
                    <div style={styles.progressLabel}>Instructions</div>
                    <div style={styles.progressValue}>
                      {item.instructions_completed
                        ? "Completed"
                        : "Not completed"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Recent Completions</h2>

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
                      <td style={styles.td}>{item.style}</td>
                      <td style={styles.td}>{item.difficulty}</td>
                      <td style={styles.td}>
                        {formatMinutes(item.time_spent_sec)}
                      </td>
                      <td style={styles.td}>{formatDate(item.completed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Lesson Reports</h2>

          {reports.length === 0 ? (
            <div style={styles.infoCard}>No reports generated yet.</div>
          ) : (
            <div style={styles.reportList}>
              {reports.map((report) => (
                <div key={report.report_id} style={styles.reportCard}>
                  <div style={styles.lessonTopRow}>
                    <div>
                      <h3 style={styles.lessonTitle}>{report.title}</h3>
                      <div style={styles.lessonMeta}>
                        <span>{report.style}</span>
                        <span>•</span>
                        <span>{report.difficulty}</span>
                      </div>
                    </div>
                    <span style={styles.badgeGray}>
                      {formatDate(report.created_at)}
                    </span>
                  </div>

                  <div style={styles.reportStatsRow}>
                    <div style={styles.smallStat}>
                      <div style={styles.smallStatLabel}>Time</div>
                      <div style={styles.smallStatValue}>
                        {formatMinutes(report.time_spent_sec)}
                      </div>
                    </div>

                    <div style={styles.smallStat}>
                      <div style={styles.smallStatLabel}>Video</div>
                      <div style={styles.smallStatValue}>
                        {report.video_completed ? "Done" : "No"}
                      </div>
                    </div>

                    <div style={styles.smallStat}>
                      <div style={styles.smallStatLabel}>Instructions</div>
                      <div style={styles.smallStatValue}>
                        {report.instructions_completed ? "Done" : "No"}
                      </div>
                    </div>

                    <div style={styles.smallStat}>
                      <div style={styles.smallStatLabel}>Notes</div>
                      <div style={styles.smallStatValue}>
                        {report.notes_count ?? 0}
                      </div>
                    </div>

                    <div style={styles.smallStat}>
                      <div style={styles.smallStatLabel}>Self Rating</div>
                      <div style={styles.smallStatValue}>
                        {report.self_rating ? `${report.self_rating}/5` : "—"}
                      </div>
                    </div>
                  </div>

                  <div style={styles.reportSummary}>
                    {report.summary || "No summary available."}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "32px 20px",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    gap: 16,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: 32,
    fontWeight: 700,
    color: "#111827",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 0,
    color: "#6b7280",
    fontSize: 15,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginBottom: 30,
  },
  statCard: {
    background: "#ffffff",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  },
  statLabel: {
    color: "#6b7280",
    fontSize: 13,
    marginBottom: 8,
  },
  statValue: {
    color: "#111827",
    fontSize: 24,
    fontWeight: 700,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 14,
    color: "#111827",
  },
  infoCard: {
    background: "#ffffff",
    borderRadius: 16,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
    color: "#374151",
  },
  lessonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 16,
  },
  lessonCard: {
    background: "#ffffff",
    borderRadius: 18,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
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
    fontWeight: 700,
    color: "#111827",
  },
  lessonMeta: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    color: "#6b7280",
    fontSize: 13,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  lessonDescription: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 1.5,
    marginBottom: 16,
  },
  progressRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 0",
    borderTop: "1px solid #f1f5f9",
    fontSize: 14,
  },
  progressLabel: {
    color: "#6b7280",
  },
  progressValue: {
    color: "#111827",
    fontWeight: 600,
    textAlign: "right",
  },
  badgeBlue: {
    background: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  badgeGreen: {
    background: "#dcfce7",
    color: "#15803d",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  badgeGray: {
    background: "#f3f4f6",
    color: "#374151",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  tableWrap: {
    background: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: 14,
    background: "#f9fafb",
    borderBottom: "1px solid #e5e7eb",
    color: "#374151",
    fontSize: 13,
  },
  td: {
    padding: 14,
    borderBottom: "1px solid #f1f5f9",
    fontSize: 14,
    color: "#111827",
  },
  reportList: {
    display: "grid",
    gap: 16,
  },
  reportCard: {
    background: "#ffffff",
    borderRadius: 18,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  },
  reportStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 12,
    marginTop: 14,
    marginBottom: 16,
  },
  smallStat: {
    background: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    border: "1px solid #eef2f7",
  },
  smallStatLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6,
  },
  smallStatValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
  },
  reportSummary: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "#374151",
    borderTop: "1px solid #f1f5f9",
    paddingTop: 12,
  },
};