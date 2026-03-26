// src/components/dance-master/NotesPage.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllNotes,
  getLessons,
  addNote,
  editNote,
  removeNote,
} from "./dmApi";

/* ── style constants ───────────────────────────────────── */
const PURPLE = "#7c3aed";
const PURPLE_LIGHT = "#ede9fe";
const PURPLE_DARK = "#5b21b6";
const SURFACE = "#ffffff";
const BG = "#f5f3ff";
const BORDER = "#e8e3f8";
const TEXT = "#1e1b4b";
const MUTED = "#6b7280";

const FONT_HEADING = "'DM Serif Display', 'Georgia', serif";
const FONT_BODY = "'DM Sans', 'Segoe UI', sans-serif";

const STYLE_TAG = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');

.dm-notes * { box-sizing: border-box; }

.dm-notes-group {
  background: ${SURFACE};
  border: 1px solid ${BORDER};
  border-radius: 18px;
  overflow: hidden;
  transition: box-shadow 0.18s;
}
.dm-notes-group:hover {
  box-shadow: 0 8px 28px rgba(124,58,237,0.10);
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.dm-fadein { animation: fadeUp 0.35s ease both; }
`;

function StyleInjector() {
  useEffect(() => {
    if (document.getElementById("dm-notes-styles")) return;
    const el = document.createElement("style");
    el.id = "dm-notes-styles";
    el.textContent = STYLE_TAG;
    document.head.appendChild(el);
  }, []);
  return null;
}

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function NotesPage() {
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [newLessonId, setNewLessonId] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const [filterLessonId, setFilterLessonId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [notesRes, lessonsRes] = await Promise.all([
        getAllNotes(),
        getLessons(),
      ]);

      setNotes(Array.isArray(notesRes?.items) ? notesRes.items : []);
      setLessons(Array.isArray(lessonsRes?.items) ? lessonsRes.items : lessonsRes || []);
    } catch (e) {
      setError(e.message || "Failed to load notes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreate(e) {
    e.preventDefault();

    if (!newLessonId || !newContent.trim()) return;

    setSaving(true);
    try {
      await addNote(newLessonId, newContent.trim());
      setNewLessonId("");
      setNewContent("");
      setShowForm(false);
      await fetchData();
    } catch (e) {
      alert(e.message || "Failed to create note.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(noteId) {
    if (!editContent.trim()) return;

    try {
      await editNote(noteId, editContent.trim());
      setEditingId(null);
      setEditContent("");
      await fetchData();
    } catch (e) {
      alert(e.message || "Failed to update note.");
    }
  }

  async function handleDelete(noteId) {
    if (!window.confirm("Delete this note?")) return;

    try {
      await removeNote(noteId);
      if (editingId === noteId) {
        setEditingId(null);
        setEditContent("");
      }
      await fetchData();
    } catch (e) {
      alert(e.message || "Failed to delete note.");
    }
  }

  const grouped = {};
  notes.forEach((n) => {
    const key = n.lesson_id;
    if (!grouped[key]) {
      grouped[key] = {
        lessonTitle: n.lesson_title || "Untitled Lesson",
        lessonId: key,
        notes: [],
      };
    }
    grouped[key].notes.push(n);
  });

  const groups = Object.values(grouped);

  const filteredGroups = filterLessonId
    ? groups.filter((g) => g.lessonId === filterLessonId)
    : groups;

  return (
    <div
      className="dm-notes"
      style={{
        minHeight: "100vh",
        background: BG,
        fontFamily: FONT_BODY,
        padding: "32px 24px 60px",
      }}
    >
      <StyleInjector />

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          className="dm-fadein"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: FONT_HEADING,
                fontSize: 30,
                fontWeight: 400,
                color: TEXT,
                margin: 0,
              }}
            >
              📝 My Notes
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: MUTED }}>
              Your personal lesson reflections
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowForm((p) => !p)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 18px",
              borderRadius: 10,
              fontFamily: FONT_BODY,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              border: showForm ? `1.5px solid ${PURPLE}` : "none",
              background: showForm ? "transparent" : PURPLE,
              color: showForm ? PURPLE : "#fff",
              transition: "all 0.15s",
            }}
          >
            {showForm ? "✕ Cancel" : "+ New Note"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="dm-fadein"
            style={{
              background: SURFACE,
              border: `1.5px solid ${BORDER}`,
              borderRadius: 18,
              padding: 22,
              marginBottom: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <select
              style={{
                background: BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "10px 14px",
                color: newLessonId ? TEXT : MUTED,
                fontSize: 14,
                fontFamily: FONT_BODY,
                outline: "none",
                cursor: "pointer",
              }}
              value={newLessonId}
              onChange={(e) => setNewLessonId(e.target.value)}
            >
              <option value="">Select a lesson…</option>
              {lessons.map((l) => {
                const id = l.lesson_id || l.id;
                return (
                  <option key={id} value={id}>
                    {l.title || id}
                  </option>
                );
              })}
            </select>

            <textarea
              style={{
                background: BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "10px 14px",
                color: TEXT,
                fontSize: 14,
                fontFamily: FONT_BODY,
                resize: "vertical",
                outline: "none",
              }}
              placeholder="Write your note…"
              rows={4}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />

            <button
              type="submit"
              disabled={saving}
              style={{
                alignSelf: "flex-end",
                padding: "10px 22px",
                borderRadius: 10,
                border: "none",
                background: PURPLE,
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                fontFamily: FONT_BODY,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving…" : "Save Note"}
            </button>
          </form>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <select
            style={{
              flex: 1,
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 10,
              padding: "10px 14px",
              color: filterLessonId ? TEXT : MUTED,
              fontSize: 13,
              fontFamily: FONT_BODY,
              outline: "none",
              cursor: "pointer",
            }}
            value={filterLessonId}
            onChange={(e) => setFilterLessonId(e.target.value)}
          >
            <option value="">All lessons</option>
            {lessons.map((l) => {
              const id = l.lesson_id || l.id;
              return (
                <option key={id} value={id}>
                  {l.title || id}
                </option>
              );
            })}
          </select>

          {filterLessonId && (
            <button
              type="button"
              onClick={() => setFilterLessonId("")}
              style={{
                background: "transparent",
                color: PURPLE,
                border: `1.5px solid ${PURPLE}`,
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: FONT_BODY,
              }}
            >
              Clear
            </button>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: MUTED, fontSize: 14, padding: "40px 0" }}>
            Loading…
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 14,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && notes.length === 0 && (
          <div style={{ textAlign: "center", color: MUTED, fontSize: 14, padding: "50px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
            No notes yet — create your first one!
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredGroups.map((group) => (
            <div key={group.lessonId} className="dm-notes-group dm-fadein">
              <div
                onClick={() => navigate(`/dance-master/lessons/${group.lessonId}`)}
                style={{
                  padding: "14px 18px",
                  background: PURPLE_LIGHT,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🎵</span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: PURPLE_DARK,
                    }}
                  >
                    {group.lessonTitle}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: PURPLE,
                    background: SURFACE,
                    padding: "3px 10px",
                    borderRadius: 999,
                  }}
                >
                  {group.notes.length} note{group.notes.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div style={{ padding: "12px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                {group.notes.map((n) => {
                  const isEditing = editingId === n.note_id;

                  return (
                    <div
                      key={n.note_id}
                      style={{
                        border: `1px solid ${BORDER}`,
                        borderRadius: 10,
                        padding: "12px 14px",
                        background: "#fafafa",
                      }}
                    >
                      {isEditing ? (
                        <div>
                          <textarea
                            style={{
                              width: "100%",
                              background: BG,
                              border: `1px solid ${BORDER}`,
                              borderRadius: 10,
                              padding: "10px 14px",
                              color: TEXT,
                              fontSize: 14,
                              fontFamily: FONT_BODY,
                              resize: "vertical",
                              outline: "none",
                              marginBottom: 10,
                            }}
                            rows={3}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                          />

                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => handleUpdate(n.note_id)}
                              style={{
                                padding: "8px 16px",
                                borderRadius: 8,
                                border: "none",
                                background: PURPLE,
                                color: "#fff",
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: "pointer",
                                fontFamily: FONT_BODY,
                              }}
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setEditContent("");
                              }}
                              style={{
                                padding: "8px 16px",
                                borderRadius: 8,
                                border: `1.5px solid ${BORDER}`,
                                background: "transparent",
                                color: MUTED,
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: "pointer",
                                fontFamily: FONT_BODY,
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 14,
                              lineHeight: 1.6,
                              color: TEXT,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {n.content}
                          </p>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: 10,
                              paddingTop: 8,
                              borderTop: `1px solid ${BORDER}`,
                            }}
                          >
                            <span style={{ fontSize: 12, color: MUTED }}>
                              {timeAgo(n.updated_at)}
                            </span>

                            <div style={{ display: "flex", gap: 12 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(n.note_id);
                                  setEditContent(n.content);
                                }}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: PURPLE,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  padding: 0,
                                  fontFamily: FONT_BODY,
                                }}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(n.note_id)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#ef4444",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  padding: 0,
                                  fontFamily: FONT_BODY,
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}