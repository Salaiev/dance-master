import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLessons } from "../dmApi";

// Small helper: decode JWT payload (no secret needed)
function decodeJwtPayload(token) {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function formatDuration(sec) {
  const n = Number(sec || 0);
  if (!n) return "0 min";
  const mins = Math.round(n / 60);
  return `${mins} min`;
}

function normalizeStyle(style) {
  if (!style) return "";
  return String(style).toUpperCase();
}

function normalizeDifficulty(d) {
  if (!d) return "";
  return String(d).toUpperCase();
}

// NEW: short preview so list does not show full instructions
function previewText(text, maxLen = 90) {
  const s = String(text ?? "").trim();
  if (!s) return "";
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).trimEnd() + "...";
}

// Simple deterministic image by style (you can replace with real DB image later)
function getLessonImage(style) {
  const s = normalizeStyle(style);
  if (s.includes("HIPHOP")) return "/dance2.jpg";
  if (s.includes("BALLET")) return "/dance3.jpg";
  if (s.includes("SALSA")) return "/dance4.jpg";
  if (s.includes("JAZZ")) return "/dance1.jpg";
  return "/dance1.jpg";
}

export default function LessonsList() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // UI state
  const [search, setSearch] = useState("");
  const [selectedStyles, setSelectedStyles] = useState(new Set());
  const [selectedDiffs, setSelectedDiffs] = useState(new Set());
  const [durationBucket, setDurationBucket] = useState("ALL"); // ALL | LT10 | M10_30 | M30_60 | GT60

  const token = useMemo(() => localStorage.getItem("accessToken"), []);
  const payload = useMemo(() => (token ? decodeJwtPayload(token) : null), [token]);

  const isAdmin = useMemo(() => {
    const roleFromToken = payload?.role;
    const roleFromStorage = localStorage.getItem("userRole");
    const role = roleFromToken || roleFromStorage;
    return String(role || "").toLowerCase() === "admin";
  }, [payload]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getLessons();
      setItems(data.items || []);
    } catch (e) {
      setError(e?.message || "Failed to load lessons");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stylesList = useMemo(() => {
    const set = new Set(items.map((x) => normalizeStyle(x.style)).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const diffsList = useMemo(() => {
    const set = new Set(items.map((x) => normalizeDifficulty(x.difficulty)).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  function toggleInSet(prevSet, value) {
    const next = new Set(prevSet);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((l) => {
      const title = String(l.title || "").toLowerCase();
      const style = normalizeStyle(l.style);
      const diff = normalizeDifficulty(l.difficulty);
      const sec = Number(l.duration_sec || 0);
      const mins = sec / 60;

      // UPDATED: search only title + style (NOT description)
      if (q && !(title.includes(q) || style.toLowerCase().includes(q))) return false;

      // style filter
      if (selectedStyles.size > 0 && !selectedStyles.has(style)) return false;

      // difficulty filter
      if (selectedDiffs.size > 0 && !selectedDiffs.has(diff)) return false;

      // duration bucket
      if (durationBucket !== "ALL") {
        if (durationBucket === "LT10" && !(mins < 10)) return false;
        if (durationBucket === "M10_30" && !(mins >= 10 && mins <= 30)) return false;
        if (durationBucket === "M30_60" && !(mins > 30 && mins <= 60)) return false;
        if (durationBucket === "GT60" && !(mins > 60)) return false;
      }

      return true;
    });
  }, [items, search, selectedStyles, selectedDiffs, durationBucket]);

  async function deleteLesson(e, lessonId) {
    e.stopPropagation();
    if (!window.confirm("Delete this lesson?")) return;

    setBusyId(lessonId);
    setError("");

    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_SERVER_URI}/lessons/${lessonId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete lesson");

      setItems((prev) => prev.filter((x) => x.lesson_id !== lessonId));
    } catch (err) {
      setError(err?.message || "Failed to delete lesson");
    } finally {
      setBusyId(null);
    }
  }

  function goEdit(e, lessonId) {
    e.stopPropagation();
    navigate(`/dance-master/admin/lessons/${lessonId}/edit`);
  }

  function goCreate() {
    navigate(`/dance-master/admin/lessons/new`);
  }

  function clearFilters() {
    setSelectedStyles(new Set());
    setSelectedDiffs(new Set());
    setDurationBucket("ALL");
    setSearch("");
  }

  // Styles (inline to match your current approach)
  // ONLY CHANGE IS HERE 👇
const page = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: 22,
  minHeight: "100vh",

  // 👇 light white shade
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.6)),
    url('/dance2.jpg')
  `,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
};
  const topBar = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  };
  const title = { fontSize: 28, fontWeight: 800, margin: 0 };
  const sub = { color: "#6b7280", marginTop: 4 };

  const searchWrap = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
  const searchInput = {
    width: 320,
    maxWidth: "70vw",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "10px 12px",
    outline: "none",
    background: "#fff",
  };

  const smallBtn = {
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 10,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 700,
    color: "#111827",
    height: 40,
  };

  const primaryBtn = {
    border: "1px solid #111827",
    background: "#111827",
    color: "white",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 800,
    height: 40,
    whiteSpace: "nowrap",
  };

  const layout = {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: 16,
    alignItems: "start",
  };

  const sidebar = {
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 14,
    padding: 14,
    position: "sticky",
    top: 12,
  };

  const sideTitle = { fontSize: 13, fontWeight: 800, color: "#111827", margin: "6px 0 10px" };
  const sideGroup = { marginBottom: 14 };
  const sideRow = { display: "flex", alignItems: "center", gap: 10, marginBottom: 8, color: "#111827" };
  const checkbox = { width: 16, height: 16 };

  const main = {};
  const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
  };

  const card = {
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    minHeight: 250,
  };

  const img = {
    width: "100%",
    height: 140,
    objectFit: "cover",
    display: "block",
  };

  const cardBody = { padding: 12, display: "flex", flexDirection: "column", gap: 8, flex: 1 };
  const cardTitle = { fontWeight: 900, color: "#111827", fontSize: 15, lineHeight: 1.2 };
  const meta = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };

  const badge = (bg, fg) => ({
    background: bg,
    color: fg,
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 800,
  });

  const viewBtn = {
    marginTop: "auto",
    border: "1px solid #4f46e5",
    background: "#4f46e5",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
    width: "100%",
  };

  const adminRow = { display: "flex", gap: 8, marginTop: 8 };
  const adminBtn = {
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 10,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
    flex: 1,
  };
  const dangerBtn = {
    ...adminBtn,
    border: "1px solid #ef4444",
    color: "#ef4444",
    background: "#fff",
  };

  // responsive tweak
  const responsiveStyle = `
    @media (max-width: 980px) {
      .dm-layout { grid-template-columns: 1fr; }
      .dm-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .dm-sidebar { position: relative; top: 0; }
    }
    @media (max-width: 620px) {
      .dm-grid { grid-template-columns: 1fr; }
      .dm-search { width: 100% !important; }
    }
  `;

  return (
    <div style={page}>
      <style>{responsiveStyle}</style>

      <div style={topBar}>
        <div>
          <h2 style={title}>Explore Dance Lessons</h2>
          <div style={sub}>Browse lessons by style and difficulty.</div>
        </div>

        <div style={searchWrap}>
          <input
            className="dm-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lessons..."
            style={searchInput}
          />

          <button type="button" onClick={clearFilters} style={smallBtn} title="Clear search and filters">
            Reset
          </button>

          {isAdmin && (
            <button type="button" onClick={goCreate} style={primaryBtn}>
              + Create Lesson
            </button>
          )}
        </div>
      </div>

      {loading && <div style={{ color: "#6b7280", marginBottom: 12 }}>Loading...</div>}
      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

      <div className="dm-layout" style={layout}>
        {/* Sidebar */}
        <div className="dm-sidebar" style={sidebar}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>Filters</div>
            <button type="button" onClick={clearFilters} style={{ ...smallBtn, height: 34, padding: "6px 10px" }}>
              Clear
            </button>
          </div>

          <div style={sideGroup}>
            <div style={sideTitle}>Dance Style</div>
            {stylesList.length === 0 && <div style={{ color: "#6b7280", fontSize: 13 }}>No styles</div>}
            {stylesList.map((s) => (
              <label key={s} style={sideRow}>
                <input
                  type="checkbox"
                  style={checkbox}
                  checked={selectedStyles.has(s)}
                  onChange={() => setSelectedStyles((prev) => toggleInSet(prev, s))}
                />
                <span style={{ fontSize: 13 }}>{s}</span>
              </label>
            ))}
          </div>

          <div style={sideGroup}>
            <div style={sideTitle}>Difficulty</div>
            {diffsList.length === 0 && <div style={{ color: "#6b7280", fontSize: 13 }}>No difficulty</div>}
            {diffsList.map((d) => (
              <label key={d} style={sideRow}>
                <input
                  type="checkbox"
                  style={checkbox}
                  checked={selectedDiffs.has(d)}
                  onChange={() => setSelectedDiffs((prev) => toggleInSet(prev, d))}
                />
                <span style={{ fontSize: 13 }}>{d}</span>
              </label>
            ))}
          </div>

          <div style={sideGroup}>
            <div style={sideTitle}>Duration</div>
            {[
              ["ALL", "All"],
              ["LT10", "Under 10 min"],
              ["M10_30", "10–30 min"],
              ["M30_60", "30–60 min"],
              ["GT60", "Over 60 min"],
            ].map(([key, label]) => (
              <label key={key} style={sideRow}>
                <input
                  type="radio"
                  name="durationBucket"
                  style={checkbox}
                  checked={durationBucket === key}
                  onChange={() => setDurationBucket(key)}
                />
                <span style={{ fontSize: 13 }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={main}>
          {!loading && filtered.length === 0 && <div style={{ color: "#6b7280", marginTop: 6 }}>No lessons found.</div>}

          <div className="dm-grid" style={grid}>
            {filtered.map((l) => {
              const s = normalizeStyle(l.style);
              const d = normalizeDifficulty(l.difficulty);

              const diffBadge =
                d === "BEGINNER"
                  ? badge("#DCFCE7", "#166534")
                  : d === "INTERMEDIATE"
                  ? badge("#DBEAFE", "#1E40AF")
                  : badge("#FEE2E2", "#991B1B");

              return (
                <div
                  key={l.lesson_id}
                  style={card}
                  onClick={() => navigate(`/dance-master/lessons/${l.lesson_id}`)}
                  title="Open lesson"
                >
                  <img src={getLessonImage(l.style)} alt={l.title} style={img} />

                  <div style={cardBody}>
                    <div style={cardTitle}>{l.title}</div>

                    <div style={meta}>
                      <span style={badge("#F3F4F6", "#111827")}>{s || "STYLE"}</span>
                      <span style={diffBadge}>{d || "DIFFICULTY"}</span>
                      <span style={badge("#F3F4F6", "#111827")}>{formatDuration(l.duration_sec)}</span>
                    </div>

                    {/* UPDATED: short preview only */}
                    <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.35 }}>
                      {previewText(l.description, 90) || " "}
                    </div>

                    <button
                      type="button"
                      style={viewBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dance-master/lessons/${l.lesson_id}`);
                      }}
                    >
                      View Lesson
                    </button>

                    {isAdmin && (
                      <div style={adminRow} onClick={(e) => e.stopPropagation()}>
                        <button type="button" style={adminBtn} onClick={(e) => goEdit(e, l.lesson_id)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          style={{
                            ...dangerBtn,
                            opacity: busyId === l.lesson_id ? 0.6 : 1,
                            cursor: busyId === l.lesson_id ? "not-allowed" : "pointer",
                          }}
                          disabled={busyId === l.lesson_id}
                          onClick={(e) => deleteLesson(e, l.lesson_id)}
                        >
                          {busyId === l.lesson_id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}