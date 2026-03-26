import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addNote,
  editNote,
  getLesson,
  getNotes,
  removeNote,
  getComments,
  addComment,
  replyComment,
  deleteComment,
} from "../dmApi";

function toEmbedUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    return url;
  } catch {
    return url;
  }
}

function timeAgo(isoString) {
  if (!isoString) return "";
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h} hour${h > 1 ? "s" : ""} ago`;
  }
  const d = Math.floor(diff / 86400);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

// ✅ ONLY THIS FUNCTION WAS CHANGED
// Parses "Title||Description" per line (new format from admin editor).
// Falls back gracefully for legacy plain-text lines (no "||").
function parseSteps(description) {
  if (!description) return [];
  const lines = description.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const sepIdx = line.indexOf("||");
    if (sepIdx !== -1) {
      const title = line.slice(0, sepIdx).trim();
      const desc = line.slice(sepIdx + 2).trim();
      return { title, substeps: desc ? [desc] : [] };
    }
    // Legacy plain line — treat whole line as title, no substeps
    return { title: line, substeps: [] };
  });
}

function StepAccordion({ steps }) {
  const [openIdx, setOpenIdx] = useState(null);

  if (!steps || steps.length === 0) {
    return <p style={{ color: "#6b7280" }}>No instructions yet.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {steps.map((step, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div
            key={idx}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <button
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                background: isOpen ? "#111827" : "#f9fafb",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: isOpen ? "#fff" : "#111827",
                    color: isOpen ? "#111827" : "#fff",
                    fontWeight: 800,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: isOpen ? "#fff" : "#111827",
                  }}
                >
                  {step.title}
                </span>
              </div>
              <span style={{ fontSize: 18, color: isOpen ? "#fff" : "#6b7280", lineHeight: 1 }}>
                {isOpen ? "−" : "+"}
              </span>
            </button>

            {isOpen && step.substeps.length > 0 && (
              <div style={{ padding: "10px 14px 14px 14px", background: "#fff" }}>
                <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                  {step.substeps.map((sub, sIdx) => (
                    <li key={sIdx} style={{ color: "#374151", fontSize: 14, lineHeight: 1.6 }}>
                      {sub}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isOpen && step.substeps.length === 0 && (
              <div style={{ padding: "10px 14px 14px 50px", color: "#6b7280", fontSize: 13 }}>
                No details for this step.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CommentItem({ comment, currentUserId, currentUsername, onDelete, onReply }) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");

  function handleReplySubmit() {
    const text = replyText.trim();
    if (!text) return;
    onReply(comment.comment_id, text);
    setReplyText("");
    setShowReplyInput(false);
  }

  const isMine = comment.user_id === currentUserId;
  const displayName =
    comment.display_name && comment.display_name !== "Anonymous"
      ? comment.display_name
      : isMine && currentUsername
      ? currentUsername
      : comment.display_name || "Anonymous";

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "12px 14px",
        background: "#fafafa",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#6366f1",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            {(displayName || "?")[0]?.toUpperCase()}
          </div>
          <div>
            <span style={{ fontWeight: 600, color: "#111827", fontSize: 14 }}>
              {displayName}
            </span>
            <span style={{ color: "#9ca3af", fontSize: 12, marginLeft: 8 }}>
              {timeAgo(comment.created_at)}
            </span>
          </div>
        </div>

        {isMine && (
          <button
            onClick={() => onDelete(comment.comment_id)}
            style={{
              background: "none",
              border: "none",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: 12,
              padding: "2px 6px",
            }}
            title="Delete comment"
          >
            Delete
          </button>
        )}
      </div>

      <p
        style={{
          margin: "10px 0 8px 46px",
          color: "#374151",
          fontSize: 14,
          whiteSpace: "pre-wrap",
        }}
      >
        {comment.content}
      </p>

      <div style={{ marginLeft: 46 }}>
        <button
          onClick={() => setShowReplyInput((prev) => !prev)}
          style={{
            background: "none",
            border: "none",
            color: "#6366f1",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            padding: 0,
          }}
        >
          {showReplyInput ? "Cancel" : "Reply"}
        </button>
      </div>

      {showReplyInput && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, marginLeft: 46 }}>
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply…"
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 13,
            }}
            onKeyDown={(e) => e.key === "Enter" && handleReplySubmit()}
          />
          <button
            onClick={handleReplySubmit}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Post
          </button>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: 12, marginLeft: 46, display: "grid", gap: 8 }}>
          {comment.replies.map((reply) => {
            const replyIsMine = reply.user_id === currentUserId;
            const replyName =
              reply.display_name && reply.display_name !== "Anonymous"
                ? reply.display_name
                : replyIsMine && currentUsername
                ? currentUsername
                : reply.display_name || "Anonymous";

            return (
              <div
                key={reply.comment_id}
                style={{
                  borderLeft: "3px solid #e5e7eb",
                  paddingLeft: 12,
                  background: "#f3f4f6",
                  borderRadius: "0 8px 8px 0",
                  padding: "8px 10px 8px 14px",
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#818cf8",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {(replyName || "?")[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, color: "#111827", fontSize: 13 }}>
                    {replyName}
                  </span>
                  <span style={{ color: "#9ca3af", fontSize: 11 }}>
                    {timeAgo(reply.created_at)}
                  </span>

                  {replyIsMine && (
                    <button
                      onClick={() => onDelete(reply.comment_id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        fontSize: 11,
                        marginLeft: "auto",
                        padding: 0,
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p
                  style={{
                    margin: "6px 0 0 36px",
                    color: "#374151",
                    fontSize: 13,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {reply.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LessonView() {
  const { id } = useParams();
  const lessonId = id;

  const CURRENT_USER_ID = useMemo(
    () => localStorage.getItem("userId") || localStorage.getItem("user_id") || "",
    []
  );
  const CURRENT_USERNAME = useMemo(
    () => localStorage.getItem("username") || localStorage.getItem("displayName") || "",
    []
  );

  const [lesson, setLesson] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");

  const [error, setError] = useState("");

  const embedUrl = useMemo(() => toEmbedUrl(lesson?.video_url), [lesson]);
  const parsedSteps = useMemo(() => parseSteps(lesson?.description), [lesson]);

  async function loadComments() {
    try {
      setCommentError("");
      const data = await getComments(lessonId);
      setComments(data.items || []);
    } catch (e) {
      setCommentError(e.message);
    }
  }

  async function loadAll() {
    setError("");
    try {
      const [l, n] = await Promise.all([getLesson(lessonId), getNotes(lessonId)]);
      setLesson(l.item || l);
      setNotes(n.items || []);
      await loadComments();
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!lessonId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  async function handleAddNote() {
    const content = noteText.trim();
    if (!content) return;
    try {
      await addNote(lessonId, content);
      setNoteText("");
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleEditNote(noteId, current) {
    const next = prompt("Edit note:", current);
    if (next === null) return;
    const content = next.trim();
    if (!content) return;
    try {
      await editNote(noteId, content);
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDeleteNote(noteId) {
    if (!window.confirm("Delete this note?")) return;
    try {
      await removeNote(noteId);
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAddComment() {
    const content = commentText.trim();
    if (!content) return;

    setCommentError("");
    try {
      await addComment(lessonId, content);
      setCommentText("");
      await loadComments();
    } catch (e) {
      setCommentError(e.message);
    }
  }

  async function handleReplyComment(parentId, content) {
    const text = String(content || "").trim();
    if (!text) return;

    setCommentError("");
    try {
      await replyComment(lessonId, parentId, text);
      await loadComments();
    } catch (e) {
      setCommentError(e.message);
    }
  }

  async function handleDeleteComment(commentId) {
    setCommentError("");
    try {
      await deleteComment(commentId);
      await loadComments();
    } catch (e) {
      setCommentError(e.message);
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/dance-master/lessons">← Back to lessons</Link>
      </div>

      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

      {!lesson ? (
        <div>Loading…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          {/* LEFT */}
          <div>
            <h2 style={{ marginTop: 0 }}>{lesson.title}</h2>
            <div style={{ color: "#6b7280", marginBottom: 10 }}>
              {lesson.style} • {lesson.difficulty} • {Math.round((lesson.duration_sec || 0) / 60)} min
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                overflow: "hidden",
                background: "#000",
              }}
            >
              {embedUrl ? (
                <iframe
                  title="Lesson video"
                  width="100%"
                  height="420"
                  src={embedUrl}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div style={{ padding: 16, color: "#fff" }}>No video url</div>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <h3 style={{ margin: 0 }}>Instructions</h3>
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  {parsedSteps.length} step{parsedSteps.length !== 1 ? "s" : ""}
                </span>
              </div>
              <StepAccordion steps={parsedSteps} />
            </div>

            {/* COMMENTS */}
            <div style={{ marginTop: 24, borderTop: "1px solid #e5e7eb", paddingTop: 18 }}>
              <h3 style={{ marginTop: 0, marginBottom: 14 }}>
                Comments{" "}
                {comments.length > 0 && (
                  <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 400 }}>
                    ({comments.length})
                  </span>
                )}
              </h3>

              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts about this lesson…"
                  rows={3}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    resize: "vertical",
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={handleAddComment}
                  style={{
                    alignSelf: "flex-end",
                    padding: "10px 18px",
                    borderRadius: 8,
                    border: "none",
                    background: "#111827",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                    whiteSpace: "nowrap",
                  }}
                >
                  Post
                </button>
              </div>

              {commentError && (
                <div style={{ color: "crimson", fontSize: 13, marginBottom: 10 }}>{commentError}</div>
              )}

              <div style={{ display: "grid", gap: 12 }}>
                {comments.length === 0 ? (
                  <p style={{ color: "#6b7280", fontSize: 14 }}>
                    No comments yet. Be the first to share your thoughts!
                  </p>
                ) : (
                  comments.map((c) => (
                    <CommentItem
                      key={c.comment_id}
                      comment={c}
                      currentUserId={CURRENT_USER_ID}
                      currentUsername={CURRENT_USERNAME}
                      onDelete={handleDeleteComment}
                      onReply={handleReplyComment}
                    />
                  ))
                )}
              </div>
            </div>

            <div style={{ marginTop: 24, borderTop: "1px solid #eee", paddingTop: 14 }}>
              <h3>AI Assistance</h3>
              <div style={{ color: "#6b7280" }}>Coming next.</div>
            </div>
          </div>

          {/* RIGHT */}
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 14,
              background: "#fff",
              height: "fit-content",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Notes</h3>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write a note…"
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                }}
              />
              <button
                onClick={handleAddNote}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#111827",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Add
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {notes.length === 0 ? (
                <div style={{ color: "#6b7280" }}>No notes yet.</div>
              ) : (
                notes.map((n) => (
                  <div
                    key={n.note_id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 10,
                    }}
                  >
                    <div style={{ whiteSpace: "pre-wrap", color: "#111827" }}>{n.content}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button onClick={() => handleEditNote(n.note_id, n.content)}>Edit</button>
                      <button onClick={() => handleDeleteNote(n.note_id)}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}