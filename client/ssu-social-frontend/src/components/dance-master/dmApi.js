const BASE = process.env.REACT_APP_BACKEND_SERVER_URI; // http://localhost:3000/api

function getUserId() {
  return (
    localStorage.getItem("userId") ||
    localStorage.getItem("user_id") ||
    ""
  );
}

function requireUserId() {
  const userId = getUserId();
  if (!userId) {
    throw new Error("No user_id found in localStorage.");
  }
  return userId;
}

function buildUrl(path) {
  if (!BASE) {
    throw new Error("REACT_APP_BACKEND_SERVER_URI is not set.");
  }
  return `${BASE}${path}`;
}

async function request(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data;
}

// lessons
export const getLessons = () => request("/lessons");
export const getLesson = (id) => request(`/lessons/${id}`);

// notes
export const getNotes = (lessonId) => {
  const userId = requireUserId();
  return request(
    `/notes?lessonId=${encodeURIComponent(
      lessonId
    )}&user_id=${encodeURIComponent(userId)}`
  );
};

export const getAllNotes = () => {
  const userId = requireUserId();
  return request(`/notes?user_id=${encodeURIComponent(userId)}`);
};

export const addNote = (lessonId, content) => {
  const userId = requireUserId();
  return request("/notes", {
    method: "POST",
    body: JSON.stringify({
      lesson_id: lessonId,
      user_id: userId,
      content,
    }),
  });
};

export const editNote = (noteId, content) => {
  const userId = requireUserId();
  return request(`/notes/${noteId}`, {
    method: "PATCH",
    body: JSON.stringify({
      user_id: userId,
      content,
    }),
  });
};

export const removeNote = (noteId) => {
  const userId = requireUserId();
  return request(`/notes/${noteId}`, {
    method: "DELETE",
    body: JSON.stringify({
      user_id: userId,
    }),
  });
};

// comments
export const getComments = (lessonId) =>
  request(`/comments?lesson_id=${encodeURIComponent(lessonId)}`);

export const addComment = (lessonId, content) => {
  const userId = requireUserId();
  return request("/comments", {
    method: "POST",
    body: JSON.stringify({
      lesson_id: lessonId,
      user_id: userId,
      content,
    }),
  });
};

export const replyComment = (lessonId, replyId, content) => {
  const userId = requireUserId();
  return request("/comments", {
    method: "POST",
    body: JSON.stringify({
      lesson_id: lessonId,
      user_id: userId,
      reply_id: replyId,
      content,
    }),
  });
};

export const deleteComment = (commentId) => {
  const userId = requireUserId();
  return request(`/comments/${commentId}`, {
    method: "DELETE",
    body: JSON.stringify({
      user_id: userId,
    }),
  });
};