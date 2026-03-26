const BASE = process.env.REACT_APP_BACKEND_SERVER_URI; // http://localhost:3000/api
const USER_ID = "11111111-1111-1111-1111-111111111111";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": USER_ID,
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
  return data;
}

// lessons
export const getLessons = () => request("/lessons");
export const getLesson = (id) => request(`/lessons/${id}`);

// notes
export const getNotes = (lessonId) =>
  request(`/notes?lessonId=${encodeURIComponent(lessonId)}`);

export const addNote = (lessonId, content) =>
  request("/notes", {
    method: "POST",
    body: JSON.stringify({ lessonId, content }),
  });

export const editNote = (noteId, content) =>
  request(`/notes/${noteId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });

export const removeNote = (noteId) =>
  request(`/notes/${noteId}`, { method: "DELETE" });

// comments
export const getComments = (lessonId) =>
  request(`/comments?lesson_id=${encodeURIComponent(lessonId)}`);

export const addComment = (lessonId, content) =>
  request(`/comments`, {
    method: "POST",
    body: JSON.stringify({ lesson_id: lessonId, user_id: USER_ID, content }),
  });

export const replyComment = (lessonId, replyId, content) =>
  request(`/comments`, {
    method: "POST",
    body: JSON.stringify({
      lesson_id: lessonId,
      user_id: USER_ID,
      reply_id: replyId,
      content,
    }),
  });

export const deleteComment = (commentId) =>
  request(`/comments/${commentId}`, {
    method: "DELETE",
    body: JSON.stringify({ user_id: USER_ID }),
  });