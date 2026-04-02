import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
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
  askLessonAI,
} from "../dmApi";

const BASE =
  process.env.REACT_APP_BACKEND_SERVER_URI || "http://localhost:3000/api";

function getUserId() {
  return (
    localStorage.getItem("userId") ||
    localStorage.getItem("user_id") ||
    ""
  );
}

function getVideoId(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    const v = u.searchParams.get("v");
    if (v) return v;
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
    return "";
  } catch {
    return "";
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
    return { title: line, substeps: [] };
  });
}

function YouTubePlayer({ videoUrl, startAt, onTimeUpdate }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const videoId = useMemo(() => getVideoId(videoUrl), [videoUrl]);
  const startAtRef = useRef(startAt);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    startAtRef.current = startAt;
  }, [startAt]);

  useEffect(() => {
    if (!videoId) return;

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    function createPlayer() {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        height: "420",
        width: "100%",
        playerVars: {
          start: Math.floor(startAtRef.current || 0),
          autoplay: 0,
          rel: 0,
        },
        events: {
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              const duration = playerRef.current?.getDuration?.() || 0;
              onTimeUpdateRef.current?.(duration, true);
            }
          },
        },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [videoId]);

  useEffect(() => {
    function handleBeforeUnload() {
      if (playerRef.current?.getCurrentTime) {
        const currentTime = playerRef.current.getCurrentTime();
        onTimeUpdateRef.current?.(currentTime, false);
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    window.__ytGetCurrentTime = () => {
      return playerRef.current?.getCurrentTime?.() || 0;
    };
    return () => {
      delete window.__ytGetCurrentTime;
    };
  }, []);

  if (!videoId) {
    return (
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
          background: "#000",
          padding: 16,
          color: "#fff",
        }}
      >
        No video url
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
        background: "#000",
      }}
    >
      <div ref={containerRef} />
    </div>
  );
}

function StepAccordion({ steps, completedSteps, onToggleStep }) {
  const [openIdx, setOpenIdx] = useState(null);

  if (!steps || steps.length === 0) {
    return <p style={{ color: "#6b7280" }}>No instructions yet.</p>;
  }

  const completedCount = completedSteps.filter(Boolean).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div
          style={{
            flex: 1,
            height: 8,
            background: "#f1f5f9",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${steps.length > 0 ? (completedCount / steps.length) * 100 : 0}%`,
              background: completedCount === steps.length ? "#059669" : "#6366f1",
              borderRadius: 999,
              transition: "width 0.4s ease, background 0.3s ease",
            }}
          />
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: completedCount === steps.length ? "#059669" : "#6366f1",
            whiteSpace: "nowrap",
          }}
        >
          {completedCount}/{steps.length}
        </span>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {steps.map((step, idx) => {
          const isOpen = openIdx === idx;
          const isCompleted = !!completedSteps[idx];

          return (
            <div
              key={idx}
              style={{
                border: `1.5px solid ${isCompleted ? "#059669" : "#e5e7eb"}`,
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
                  background: isOpen ? "#111827" : isCompleted ? "#f0fdf4" : "#f9fafb",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
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
                      background: isCompleted ? "#059669" : isOpen ? "#fff" : "#111827",
                      color: isCompleted ? "#fff" : isOpen ? "#111827" : "#fff",
                      fontWeight: 800,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted ? "✓" : idx + 1}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: isOpen ? "#fff" : "#111827",
                      textDecoration: isCompleted && !isOpen ? "line-through" : "none",
                      opacity: isCompleted && !isOpen ? 0.7 : 1,
                    }}
                  >
                    {step.title}
                  </span>
                </div>
                <span style={{ fontSize: 18, color: isOpen ? "#fff" : "#6b7280", lineHeight: 1 }}>
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {isOpen && (
                <div style={{ padding: "10px 14px 14px 14px", background: "#fff" }}>
                  {step.substeps.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                      {step.substeps.map((sub, sIdx) => (
                        <li key={sIdx} style={{ color: "#374151", fontSize: 14, lineHeight: 1.6 }}>
                          {sub}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ color: "#6b7280", fontSize: 13, paddingLeft: 36 }}>
                      No details for this step.
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 10,
                      borderTop: "1px solid #f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 600,
                        color: isCompleted ? "#059669" : "#374151",
                        userSelect: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => onToggleStep(idx)}
                        style={{
                          width: 20,
                          height: 20,
                          cursor: "pointer",
                          accentColor: "#059669",
                        }}
                      />
                      {isCompleted ? "Completed!" : "Mark as done"}
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
            <span style={{ fontWeight: 600, color: "#111827", fontSize: 14 }}>{displayName}</span>
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
                  <span style={{ color: "#9ca3af", fontSize: 11 }}>{timeAgo(reply.created_at)}</span>
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

  const CURRENT_USER_ID = useMemo(() => getUserId(), []);
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

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [progress, setProgress] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [completingLesson, setCompletingLesson] = useState(false);

  const startTimeRef = useRef(Date.now());
  const hasSavedRef = useRef(false);
  const parsedSteps = useMemo(() => parseSteps(lesson?.description), [lesson]);

  const loadProgress = useCallback(async () => {
    if (!CURRENT_USER_ID || !lessonId) return;
    try {
      const res = await fetch(`${BASE}/progress/${lessonId}?user_id=${CURRENT_USER_ID}`);
      if (res.ok) {
        const data = await res.json();
        const item = data.progress || {};
        setProgress(item);
        setVideoCompleted(!!item.video_completed);
        setLessonCompleted(item.status === "COMPLETED");

        if (item.completed_steps) {
          try {
            setCompletedSteps(JSON.parse(item.completed_steps));
          } catch {
            const saved = localStorage.getItem(`dm_steps_${lessonId}`);
            if (saved) setCompletedSteps(JSON.parse(saved));
          }
        } else {
          const saved = localStorage.getItem(`dm_steps_${lessonId}`);
          if (saved) {
            try {
              setCompletedSteps(JSON.parse(saved));
            } catch {}
          }
        }
      }
    } catch {}
  }, [CURRENT_USER_ID, lessonId]);

  const saveProgress = useCallback(
    async (videoPos, isVideoComplete) => {
      if (!CURRENT_USER_ID || !lessonId || hasSavedRef.current) return;

      const elapsedSec = Math.round((Date.now() - startTimeRef.current) / 1000);
      const allStepsDone =
        parsedSteps.length > 0 &&
        completedSteps.filter(Boolean).length === parsedSteps.length;

      try {
        await fetch(`${BASE}/progress/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: CURRENT_USER_ID,
            lesson_id: lessonId,
            last_position_sec: Math.floor(videoPos || 0),
            time_spent_sec: elapsedSec,
            video_completed: isVideoComplete || videoCompleted,
            instructions_completed: allStepsDone,
          }),
        });
        hasSavedRef.current = true;
        startTimeRef.current = Date.now();
        setTimeout(() => {
          hasSavedRef.current = false;
        }, 1000);
      } catch (e) {
        console.error("Failed to save progress:", e);
      }
    },
    [CURRENT_USER_ID, lessonId, parsedSteps, completedSteps, videoCompleted]
  );

  const tryAutoComplete = useCallback(
    async (stepsArr, vidDone) => {
      if (lessonCompleted || completingLesson) return;
      if (!CURRENT_USER_ID || !lessonId) return;

      const allStepsDone =
        parsedSteps.length > 0 &&
        stepsArr.filter(Boolean).length === parsedSteps.length;
      if (!allStepsDone || !vidDone) return;

      setCompletingLesson(true);
      try {
        const res = await fetch(`${BASE}/progress/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: CURRENT_USER_ID,
            lesson_id: lessonId,
            self_rating: null,
          }),
        });

        if (res.ok) {
          setLessonCompleted(true);
        }
      } catch (e) {
        console.error("Auto-complete failed:", e);
      } finally {
        setCompletingLesson(false);
      }
    },
    [CURRENT_USER_ID, lessonId, parsedSteps, lessonCompleted, completingLesson]
  );

  function handleToggleStep(idx) {
    if (lessonCompleted) return;

    setCompletedSteps((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      localStorage.setItem(`dm_steps_${lessonId}`, JSON.stringify(next));
      tryAutoComplete(next, videoCompleted);
      return next;
    });
  }

  function handleVideoTimeUpdate(currentTime, isEnded) {
    if (isEnded && !videoCompleted) {
      setVideoCompleted(true);
      saveProgress(currentTime, true);
      tryAutoComplete(completedSteps, true);
    }
  }

  useEffect(() => {
    function handleBeforeUnload() {
      const currentTime = window.__ytGetCurrentTime?.() || 0;
      saveProgress(currentTime, videoCompleted);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      const currentTime = window.__ytGetCurrentTime?.() || 0;
      saveProgress(currentTime, videoCompleted);
    };
  }, [saveProgress, videoCompleted]);

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
    loadProgress();
    startTimeRef.current = Date.now();
  }, [lessonId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (parsedSteps.length > 0 && completedSteps.length === 0) {
      const saved = localStorage.getItem(`dm_steps_${lessonId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.length === parsedSteps.length) {
            setCompletedSteps(parsed);
            return;
          }
        } catch {}
      }
      setCompletedSteps(new Array(parsedSteps.length).fill(false));
    }
  }, [parsedSteps, lessonId, completedSteps.length]);

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

  async function handleAskAI() {
    const question = aiQuestion.trim();
    if (!question) return;

    setAiLoading(true);
    setAiError("");

    try {
      const data = await askLessonAI(lessonId, question);
      setAiAnswer(data?.answer || "");
    } catch (e) {
      setAiError(e.message || "Failed to get AI response.");
    } finally {
      setAiLoading(false);
    }
  }

  const stepsComplete = completedSteps.filter(Boolean).length;
  const totalSteps = parsedSteps.length;
  const allDone = totalSteps > 0 && stepsComplete === totalSteps && videoCompleted;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link to="/dance-master/lessons">← Back to lessons</Link>

        {lessonCompleted && (
          <span
            style={{
              background: "#dcfce7",
              color: "#059669",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            ✓ Lesson Completed
          </span>
        )}
        {!lessonCompleted && progress && (
          <span
            style={{
              background: "#dbeafe",
              color: "#1d4ed8",
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            In Progress
          </span>
        )}
      </div>

      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

      {!lesson ? (
        <div>Loading…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <div>
            <h2 style={{ marginTop: 0 }}>{lesson.title}</h2>
            <div style={{ color: "#6b7280", marginBottom: 10 }}>
              {lesson.style} • {lesson.difficulty} •{" "}
              {Math.round((lesson.duration_sec || 0) / 60)} min
            </div>

            {!lessonCompleted && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: "12px 16px",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>🎬</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: videoCompleted ? "#059669" : "#6b7280",
                    }}
                  >
                    Video {videoCompleted ? "✓" : "—"}
                  </span>
                </div>
                <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>📋</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color:
                        stepsComplete === totalSteps && totalSteps > 0
                          ? "#059669"
                          : "#6b7280",
                    }}
                  >
                    Steps {stepsComplete}/{totalSteps}
                  </span>
                </div>
                {allDone && (
                  <>
                    <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>
                      🎉 Auto-completing...
                    </span>
                  </>
                )}
              </div>
            )}

            <YouTubePlayer
              videoUrl={lesson.video_url}
              startAt={progress?.last_position_sec || 0}
              onTimeUpdate={handleVideoTimeUpdate}
            />

            {progress?.last_position_sec > 0 && !lessonCompleted && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: "#6b7280",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                ▶ Resumed from {Math.floor(progress.last_position_sec / 60)}:
                {String(Math.floor(progress.last_position_sec % 60)).padStart(2, "0")}
              </div>
            )}

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
              <StepAccordion
                steps={parsedSteps}
                completedSteps={completedSteps}
                onToggleStep={handleToggleStep}
              />
            </div>

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
                <div style={{ color: "crimson", fontSize: 13, marginBottom: 10 }}>
                  {commentError}
                </div>
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
          </div>

          <div style={{ display: "grid", gap: 16, height: "fit-content" }}>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                background: "#fff",
                height: "fit-content",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <h3 style={{ margin: 0 }}>AI Assistance</h3>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  Lesson-based help
                </span>
              </div>

              <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 10 }}>
                Ask about this lesson’s steps, movement, rhythm, posture, or technique.
              </div>

              <textarea
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="Ask about this lesson..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  resize: "vertical",
                  fontSize: 14,
                  fontFamily: "inherit",
                  marginBottom: 10,
                  boxSizing: "border-box",
                }}
              />

              <button
                onClick={handleAskAI}
                disabled={aiLoading || !aiQuestion.trim()}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: aiLoading || !aiQuestion.trim() ? "#9ca3af" : "#111827",
                  color: "#fff",
                  cursor: aiLoading || !aiQuestion.trim() ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {aiLoading ? "Thinking..." : "Ask AI"}
              </button>

              {aiError && (
                <div style={{ color: "crimson", fontSize: 13, marginTop: 10 }}>
                  {aiError}
                </div>
              )}

              {aiAnswer && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#6b7280",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    AI Response
                  </div>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      color: "#111827",
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    {aiAnswer}
                  </div>
                </div>
              )}
            </div>

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
                      {n.lesson_title && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#6b7280",
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        >
                          {n.lesson_title}
                        </div>
                      )}

                      <div style={{ whiteSpace: "pre-wrap", color: "#111827" }}>
                        {n.content}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 8,
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>
                          {timeAgo(n.updated_at || n.created_at)}
                        </span>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => handleEditNote(n.note_id, n.content)}
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
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteNote(n.note_id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: 600,
                              padding: 0,
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}