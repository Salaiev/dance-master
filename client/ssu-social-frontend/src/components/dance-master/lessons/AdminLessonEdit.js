import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function isAdminNow() {
  const role = localStorage.getItem("userRole");
  return String(role || "").toLowerCase() === "admin";
}

function pickLesson(payload) {
  return payload?.item ?? payload ?? {};
}

// Convert description string → steps array
// Each step is stored as "Title||Description" separated by newline
function descriptionToSteps(description) {
  if (!description) return [{ title: "", description: "" }];
  const lines = description.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [{ title: "", description: "" }];
  return lines.map((line) => {
    const sepIdx = line.indexOf("||");
    if (sepIdx !== -1) {
      return {
        title: line.slice(0, sepIdx).trim(),
        description: line.slice(sepIdx + 2).trim(),
      };
    }
    // Legacy: plain line with no separator — treat as title only
    return { title: line, description: "" };
  });
}

// Convert steps array → newline-separated string for storage
function stepsToDescription(steps) {
  return steps
    .filter((s) => s.title.trim() || s.description.trim())
    .map((s) => `${s.title.trim()}||${s.description.trim()}`)
    .join("\n");
}

export default function AdminLessonEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAdmin = useMemo(() => isAdminNow(), []);

  const [form, setForm] = useState({
    title: "",
    style: "HIPHOP",
    difficulty: "BEGINNER",
    video_url: "",
    estimated_minutes: "",
  });

  const [steps, setSteps] = useState([{ title: "", description: "" }]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dance-master/lessons");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setFieldErrors((p) => ({ ...p, [name]: "" }));
  }

  function onStepChange(idx, field, value) {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
    setFieldErrors((p) => ({ ...p, steps: "" }));
  }

  function addStep() {
    setSteps((prev) => [...prev, { title: "", description: "" }]);
  }

  function removeStep(idx) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveStep(idx, dir) {
    setSteps((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function loadLesson() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_SERVER_URI}/lessons/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load lesson");

      const lesson = pickLesson(data);

      setForm({
        title: lesson.title || "",
        style: lesson.style || "HIPHOP",
        difficulty: lesson.difficulty || "BEGINNER",
        video_url: lesson.video_url || "",
        estimated_minutes: lesson.duration_sec
          ? String(Math.round(Number(lesson.duration_sec) / 60))
          : "",
      });

      setSteps(descriptionToSteps(lesson.description));
    } catch (e) {
      setError(e?.message || "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function validate() {
    const fe = {};
    if (!form.title.trim()) fe.title = "Title is required";
    if (!form.video_url.trim()) fe.video_url = "YouTube URL is required";

    if (!form.estimated_minutes.trim()) {
      fe.estimated_minutes = "Estimated minutes is required";
    } else if (Number(form.estimated_minutes) <= 0) {
      fe.estimated_minutes = "Must be greater than 0";
    } else if (Number.isNaN(Number(form.estimated_minutes))) {
      fe.estimated_minutes = "Must be a number";
    }

    if (!form.style) fe.style = "Style is required";
    if (!form.difficulty) fe.difficulty = "Difficulty is required";

    const filledSteps = steps.filter((s) => s.title.trim());
    if (filledSteps.length === 0) fe.steps = "At least one step with a title is required";

    return fe;
  }

  async function onSave(e) {
    e.preventDefault();
    setError("");

    const fe = validate();
    setFieldErrors(fe);
    if (Object.keys(fe).length) return;

    setSaving(true);

    try {
      const body = {
        title: form.title.trim(),
        style: form.style,
        difficulty: form.difficulty,
        duration_sec: Math.round(Number(form.estimated_minutes) * 60),
        video_url: form.video_url.trim(),
        description: stepsToDescription(steps),
      };

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_SERVER_URI}/lessons/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save lesson");

      await loadLesson();
    } catch (e) {
      setError(e?.message || "Failed to save lesson");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!window.confirm("Delete this lesson permanently?")) return;

    setDeleting(true);
    setError("");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_SERVER_URI}/lessons/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete lesson");

      navigate("/dance-master/lessons");
    } catch (e) {
      setError(e?.message || "Failed to delete lesson");
    } finally {
      setDeleting(false);
    }
  }

  // Styles
  const page = { maxWidth: 900, margin: "0 auto", padding: 22 };
  const card = { border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, background: "#fff" };
  const label = { fontSize: 13, fontWeight: 900, color: "#111827", marginBottom: 6 };
  const input = { width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", boxSizing: "border-box" };
  const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const top = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 };
  const btn = { border: "1px solid #e5e7eb", background: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 900, cursor: "pointer" };
  const primary = { ...btn, border: "1px solid #111827", background: "#111827", color: "#fff" };
  const danger = { ...btn, border: "1px solid #ef4444", color: "#ef4444", background: "#fff" };
  const iconBtn = { border: "1px solid #e5e7eb", background: "#f9fafb", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14, lineHeight: 1 };

  return (
    <div style={page}>
      <div style={top}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Edit Lesson</h2>
          <div style={{ color: "#6b7280", marginTop: 6 }}>
            Update title, YouTube URL, estimated time, and step-by-step instructions.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={btn} onClick={() => navigate("/dance-master/lessons")}>
            Back
          </button>
          <button
            style={danger}
            onClick={onDelete}
            disabled={deleting || loading}
            title="Delete lesson"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {loading && <div style={{ color: "#6b7280", marginBottom: 12 }}>Loading...</div>}
      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

      {!loading && (
        <form onSubmit={onSave} style={card}>
          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <div style={label}>Title</div>
            <input name="title" value={form.title} onChange={onChange} style={input} />
            {fieldErrors.title && (
              <div style={{ color: "crimson", marginTop: 6, fontSize: 13 }}>{fieldErrors.title}</div>
            )}
          </div>

          {/* Style + Difficulty */}
          <div style={row2}>
            <div style={{ marginBottom: 12 }}>
              <div style={label}>Style</div>
              <select name="style" value={form.style} onChange={onChange} style={input}>
                <option value="HIPHOP">HIPHOP</option>
                <option value="SALSA">SALSA</option>
                <option value="BALLET">BALLET</option>
                <option value="JAZZ">JAZZ</option>
                <option value="TAP">TAP</option>
                <option value="CONTEMPORARY">CONTEMPORARY</option>
              </select>
              {fieldErrors.style && (
                <div style={{ color: "crimson", marginTop: 6, fontSize: 13 }}>{fieldErrors.style}</div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={label}>Difficulty</div>
              <select name="difficulty" value={form.difficulty} onChange={onChange} style={input}>
                <option value="BEGINNER">BEGINNER</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="ADVANCED">ADVANCED</option>
              </select>
              {fieldErrors.difficulty && (
                <div style={{ color: "crimson", marginTop: 6, fontSize: 13 }}>{fieldErrors.difficulty}</div>
              )}
            </div>
          </div>

          {/* URL + Minutes */}
          <div style={row2}>
            <div style={{ marginBottom: 12 }}>
              <div style={label}>YouTube URL</div>
              <input name="video_url" value={form.video_url} onChange={onChange} style={input} />
              {fieldErrors.video_url && (
                <div style={{ color: "crimson", marginTop: 6, fontSize: 13 }}>{fieldErrors.video_url}</div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={label}>Estimated time (minutes)</div>
              <input
                name="estimated_minutes"
                value={form.estimated_minutes}
                onChange={onChange}
                style={input}
                inputMode="numeric"
              />
              {fieldErrors.estimated_minutes && (
                <div style={{ color: "crimson", marginTop: 6, fontSize: 13 }}>{fieldErrors.estimated_minutes}</div>
              )}
            </div>
          </div>

          {/* Steps builder */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={label}>Instructions (step-by-step)</div>
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                {steps.filter((s) => s.title.trim()).length} step{steps.filter((s) => s.title.trim()).length !== 1 ? "s" : ""}
              </span>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  {/* Top row: number badge + move/remove controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "#111827",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 12,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>

                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#374151" }}>
                      Step {idx + 1}
                    </span>

                    {/* Move up */}
                    <button
                      type="button"
                      style={{ ...iconBtn, opacity: idx === 0 ? 0.3 : 1 }}
                      onClick={() => moveStep(idx, -1)}
                      disabled={idx === 0}
                      title="Move up"
                    >↑</button>

                    {/* Move down */}
                    <button
                      type="button"
                      style={{ ...iconBtn, opacity: idx === steps.length - 1 ? 0.3 : 1 }}
                      onClick={() => moveStep(idx, 1)}
                      disabled={idx === steps.length - 1}
                      title="Move down"
                    >↓</button>

                    {/* Remove */}
                    <button
                      type="button"
                      style={{ ...iconBtn, color: "#ef4444", borderColor: "#fca5a5" }}
                      onClick={() => removeStep(idx)}
                      disabled={steps.length === 1}
                      title="Remove step"
                    >✕</button>
                  </div>

                  {/* Title input */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>
                      Title
                    </div>
                    <input
                      value={step.title}
                      onChange={(e) => onStepChange(idx, "title", e.target.value)}
                      placeholder={`e.g., Warm Up`}
                      style={{
                        width: "100%",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: "8px 10px",
                        fontSize: 14,
                        background: "#fff",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  {/* Description textarea */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>
                      Description
                    </div>
                    <textarea
                      value={step.description}
                      onChange={(e) => onStepChange(idx, "description", e.target.value)}
                      placeholder={`Describe what to do in this step…`}
                      rows={2}
                      style={{
                        width: "100%",
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: "8px 10px",
                        fontSize: 14,
                        background: "#fff",
                        resize: "vertical",
                        fontFamily: "inherit",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {fieldErrors.steps && (
              <div style={{ color: "crimson", marginTop: 6, fontSize: 13 }}>{fieldErrors.steps}</div>
            )}

            <button
              type="button"
              onClick={addStep}
              style={{
                marginTop: 10,
                border: "1px dashed #9ca3af",
                background: "#f9fafb",
                borderRadius: 10,
                padding: "9px 14px",
                cursor: "pointer",
                color: "#6b7280",
                fontWeight: 700,
                fontSize: 13,
                width: "100%",
              }}
            >
              + Add Step
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            <button
              type="button"
              style={btn}
              onClick={() => navigate(`/dance-master/lessons/${id}`)}
              disabled={saving}
            >
              Preview
            </button>
            <button type="submit" style={primary} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}