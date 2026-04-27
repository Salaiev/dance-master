import React, { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

function isAdminNow() {
  const role = localStorage.getItem("userRole");
  return String(role || "").toLowerCase() === "admin";
}

function stepsToDescription(steps) {
  return steps
    .filter((s) => s.title.trim() || s.description.trim())
    .map((s) => `${s.title.trim()}||${s.description.trim()}`)
    .join("\n");
}

const BACKEND = process.env.REACT_APP_BACKEND_SERVER_URI;

export default function AdminLessonCreate() {
  const navigate = useNavigate();
  const isAdmin = useMemo(() => isAdminNow(), []);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    style: "HIPHOP",
    difficulty: "BEGINNER",
    video_url: "",
    estimated_minutes: "",
  });

  const [steps, setSteps] = useState([{ title: "", description: "" }]);

  // Image state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  if (!isAdmin) {
    navigate("/dance-master/lessons");
    return null;
  }

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

  // ── Image handlers ────────────────────────────────────────
  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setFieldErrors((p) => ({ ...p, image: "Please select a JPG, PNG, or WebP image." }));
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFieldErrors((p) => ({ ...p, image: "Image must be 5 MB or smaller." }));
      e.target.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFieldErrors((p) => ({ ...p, image: "" }));
  }

  function removeImage() {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadImageToS3() {
    if (!selectedFile) return null;

    setUploading(true);
    try {
      const presignRes = await fetch(`${BACKEND}/uploads/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          folder: "lessons",
          userId: localStorage.getItem("userId") || "admin",
        }),
      });

      if (!presignRes.ok) throw new Error("Failed to get upload URL.");
      const { uploadUrl, fileUrl } = await presignRes.json();
      if (!uploadUrl || !fileUrl) throw new Error("Upload URL missing.");

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!uploadRes.ok) throw new Error(`S3 upload failed (${uploadRes.status}).`);
      return fileUrl;
    } finally {
      setUploading(false);
    }
  }

  // ── Validation ────────────────────────────────────────────
  function validate() {
    const fe = {};
    if (!form.title.trim()) fe.title = "Title is required";
    if (!form.video_url.trim()) fe.video_url = "YouTube URL is required";
    if (!form.estimated_minutes.trim()) fe.estimated_minutes = "Estimated minutes is required";
    if (Number(form.estimated_minutes) <= 0) fe.estimated_minutes = "Must be greater than 0";
    if (!form.style) fe.style = "Style is required";
    if (!form.difficulty) fe.difficulty = "Difficulty is required";
    if (!selectedFile) fe.image = "A thumbnail image is required";
    const filledSteps = steps.filter((s) => s.title.trim());
    if (filledSteps.length === 0) fe.steps = "At least one step with a title is required";
    return fe;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const fe = validate();
    setFieldErrors(fe);
    if (Object.keys(fe).length) return;

    setLoading(true);
    try {
      // 1. Upload image first
      const imageUrl = await uploadImageToS3();
      if (!imageUrl) throw new Error("Image upload failed.");

      // 2. Create lesson with image URL
      const body = {
        title: form.title.trim(),
        style: form.style,
        difficulty: form.difficulty,
        duration_sec: Math.round(Number(form.estimated_minutes) * 60),
        video_url: form.video_url.trim(),
        description: stepsToDescription(steps),
        thumbnail_url: imageUrl,   // adjust key to match your backend field name
        image_url: imageUrl,       // sending both common names to be safe
      };

      const res = await fetch(`${BACKEND}/lessons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || "Failed to create lesson");

      navigate("/dance-master/lessons");
    } catch (err) {
      setError(err?.message || "Failed to create lesson");
    } finally {
      setLoading(false);
    }
  }

  // ── Styles ────────────────────────────────────────────────
  const page  = { maxWidth: 900, margin: "0 auto", padding: 22 };
  const card  = { border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, background: "#fff" };
  const lbl   = { fontSize: 13, fontWeight: 900, color: "#111827", marginBottom: 6 };
  const input = { width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", boxSizing: "border-box", fontSize: 14 };
  const row2  = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const btn   = { border: "1px solid #e5e7eb", background: "#fff", borderRadius: 10, padding: "10px 14px", fontWeight: 900, cursor: "pointer" };
  const primary = { ...btn, border: "1px solid #111827", background: "#111827", color: "#fff" };
  const iconBtn = { border: "1px solid #e5e7eb", background: "#f9fafb", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14, lineHeight: 1 };

  const isBusy = loading || uploading;

  return (
    <div style={page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>Create Lesson</h2>
          <div style={{ color: "#6b7280", marginTop: 6 }}>
            Title, thumbnail, YouTube URL, estimated time, and step-by-step instructions.
          </div>
        </div>
        <button style={btn} onClick={() => navigate("/dance-master/lessons")}>Back</button>
      </div>

      {error && (
        <div style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 14 }}>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} style={card}>

        {/* ── THUMBNAIL ─────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <div style={lbl}>Thumbnail Image</div>

          {!previewUrl ? (
            /* Drop zone */
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${fieldErrors.image ? "#fca5a5" : "#d1d5db"}`,
                borderRadius: 12,
                background: fieldErrors.image ? "#fef2f2" : "#f9fafb",
                padding: "32px 20px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
              <div style={{ fontWeight: 700, color: "#374151", marginBottom: 4 }}>
                Click to upload thumbnail
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>JPG, PNG, WebP · max 5 MB</div>
            </div>
          ) : (
            /* Preview */
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                src={previewUrl}
                alt="Thumbnail preview"
                style={{
                  width: "100%",
                  maxHeight: 220,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  display: "block",
                }}
              />
              <button
                type="button"
                onClick={removeImage}
                style={{
                  position: "absolute",
                  top: 8, right: 8,
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: 28, height: 28,
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                title="Remove image"
              >
                ✕
              </button>
              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                {selectedFile?.name} · {(selectedFile?.size / 1024).toFixed(0)} KB
              </div>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={onFileChange}
            style={{ display: "none" }}
          />

          {fieldErrors.image && (
            <div style={{ color: "#b91c1c", marginTop: 6, fontSize: 13 }}>{fieldErrors.image}</div>
          )}
        </div>

        {/* ── TITLE ─────────────────────────────────────── */}
        <div style={{ marginBottom: 12 }}>
          <div style={lbl}>Title</div>
          <input name="title" value={form.title} onChange={onChange} style={input} placeholder="e.g., Hip-Hop Groove Fundamentals" />
          {fieldErrors.title && <div style={{ color: "#b91c1c", marginTop: 6, fontSize: 13 }}>{fieldErrors.title}</div>}
        </div>

        {/* ── STYLE + DIFFICULTY ────────────────────────── */}
        <div style={{ ...row2, marginBottom: 12 }}>
          <div>
            <div style={lbl}>Style</div>
            <select name="style" value={form.style} onChange={onChange} style={input}>
              <option value="HIPHOP">HIPHOP</option>
              <option value="SALSA">SALSA</option>
              <option value="BALLET">BALLET</option>
              <option value="JAZZ">JAZZ</option>
              <option value="TAP">TAP</option>
              <option value="CONTEMPORARY">CONTEMPORARY</option>
            </select>
            {fieldErrors.style && <div style={{ color: "#b91c1c", marginTop: 6, fontSize: 13 }}>{fieldErrors.style}</div>}
          </div>

          <div>
            <div style={lbl}>Difficulty</div>
            <select name="difficulty" value={form.difficulty} onChange={onChange} style={input}>
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
            </select>
            {fieldErrors.difficulty && <div style={{ color: "#b91c1c", marginTop: 6, fontSize: 13 }}>{fieldErrors.difficulty}</div>}
          </div>
        </div>

        {/* ── URL + DURATION ────────────────────────────── */}
        <div style={{ ...row2, marginBottom: 12 }}>
          <div>
            <div style={lbl}>YouTube URL</div>
            <input name="video_url" value={form.video_url} onChange={onChange} style={input} placeholder="https://www.youtube.com/watch?v=..." />
            {fieldErrors.video_url && <div style={{ color: "#b91c1c", marginTop: 6, fontSize: 13 }}>{fieldErrors.video_url}</div>}
          </div>

          <div>
            <div style={lbl}>Estimated time (minutes)</div>
            <input
              name="estimated_minutes"
              value={form.estimated_minutes}
              onChange={onChange}
              style={input}
              placeholder="e.g., 25"
              inputMode="numeric"
            />
            {fieldErrors.estimated_minutes && <div style={{ color: "#b91c1c", marginTop: 6, fontSize: 13 }}>{fieldErrors.estimated_minutes}</div>}
          </div>
        </div>

        {/* ── STEPS ─────────────────────────────────────── */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={lbl}>Instructions (step-by-step)</div>
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              {steps.filter((s) => s.title.trim()).length} step{steps.filter((s) => s.title.trim()).length !== 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {steps.map((step, idx) => (
              <div key={idx} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    minWidth: 26, height: 26, borderRadius: "50%",
                    background: "#111827", color: "#fff", fontWeight: 800, fontSize: 12, flexShrink: 0,
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#374151" }}>Step {idx + 1}</span>
                  <button type="button" style={{ ...iconBtn, opacity: idx === 0 ? 0.3 : 1 }} onClick={() => moveStep(idx, -1)} disabled={idx === 0} title="Move up">↑</button>
                  <button type="button" style={{ ...iconBtn, opacity: idx === steps.length - 1 ? 0.3 : 1 }} onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} title="Move down">↓</button>
                  <button type="button" style={{ ...iconBtn, color: "#ef4444", borderColor: "#fca5a5" }} onClick={() => removeStep(idx)} disabled={steps.length === 1} title="Remove step">✕</button>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>Title</div>
                  <input
                    value={step.title}
                    onChange={(e) => onStepChange(idx, "title", e.target.value)}
                    placeholder="e.g., Warm Up"
                    style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 14, background: "#fff", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 4 }}>Description</div>
                  <textarea
                    value={step.description}
                    onChange={(e) => onStepChange(idx, "description", e.target.value)}
                    placeholder="Describe what to do in this step…"
                    rows={2}
                    style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 14, background: "#fff", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {fieldErrors.steps && <div style={{ color: "#b91c1c", marginTop: 6, fontSize: 13 }}>{fieldErrors.steps}</div>}

          <button
            type="button"
            onClick={addStep}
            style={{ marginTop: 10, border: "1px dashed #9ca3af", background: "#f9fafb", borderRadius: 10, padding: "9px 14px", cursor: "pointer", color: "#6b7280", fontWeight: 700, fontSize: 13, width: "100%" }}
          >
            + Add Step
          </button>
        </div>

        {/* ── SUBMIT ────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
          <button type="button" style={btn} onClick={() => navigate("/dance-master/lessons")} disabled={isBusy}>
            Cancel
          </button>
          <button type="submit" style={{ ...primary, opacity: isBusy ? 0.7 : 1, cursor: isBusy ? "not-allowed" : "pointer" }} disabled={isBusy}>
            {uploading ? "Uploading image…" : loading ? "Creating…" : "Create Lesson"}
          </button>
        </div>
      </form>
    </div>
  );
}