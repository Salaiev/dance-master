const BASE = process.env.REACT_APP_BACKEND_SERVER_URI; // http://localhost:3000/api

export function getUserId() {
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

  const url = buildUrl(path);

  console.log("========== API REQUEST ==========");
  console.log("BASE =", BASE);
  console.log("PATH =", path);
  console.log("FULL URL =", url);
  console.log("METHOD =", options.method || "GET");
  console.log("HEADERS =", headers);
  console.log("BODY =", options.body || null);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    console.log("RESPONSE STATUS =", res.status);
    console.log("RESPONSE OK =", res.ok);
    console.log("RESPONSE TYPE =", res.type);
    console.log("================================");

    const data = await res.json().catch(() => ({}));

    console.log("RESPONSE DATA =", data);

    if (!res.ok) {
      throw new Error(data?.error || `Request failed: ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error("FETCH FAILED");
    console.error("FAILED URL =", url);
    console.error("FAILED METHOD =", options.method || "GET");
    console.error("FAILED ERROR =", err);
    console.error("================================");
    throw err;
  }
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

// AI assistance
export const askLessonAI = (lessonId, question) => {
  const userId = requireUserId();
  return request("/dm-ai-assistant", {
    method: "POST",
    body: JSON.stringify({
      lesson_id: lessonId,
      user_id: userId,
      question,
    }),
  });
};