const BASE = process.env.REACT_APP_BACKEND_SERVER_URI;

export async function uploadFileToS3(file, options = {}) {
  const { folder = "misc", userId, lessonId } = options;

  const presignRes = await fetch(`${BASE}/uploads/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      folder,
      userId,
      lessonId,
    }),
  });

  const presignData = await presignRes.json();

  if (!presignRes.ok) {
    throw new Error(presignData?.error || "Failed to get upload URL.");
  }

  const uploadRes = await fetch(presignData.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Upload to S3 failed.");
  }

  return presignData;
}