import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET, S3_PUBLIC_BASE_URL } from "@/app/lib/s3";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fileName,
      fileType,
      folder = "misc",
      userId,
      lessonId,
    } = body || {};

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are required." },
        { status: 400 }
      );
    }

    const safeName = sanitizeFileName(fileName);
    const timestamp = Date.now();

    let key = "";

    if (folder === "profiles") {
      if (!userId) {
        return NextResponse.json(
          { error: "userId is required for profile uploads." },
          { status: 400 }
        );
      }
      key = `profiles/${userId}/${timestamp}-${safeName}`;
    } else if (folder === "lessons") {
      if (!lessonId) {
        return NextResponse.json(
          { error: "lessonId is required for lesson uploads." },
          { status: 400 }
        );
      }
      key = `lessons/${lessonId}/${timestamp}-${safeName}`;
    } else {
      key = `misc/${timestamp}-${safeName}`;
    }

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 60,
    });

    const fileUrl = `${S3_PUBLIC_BASE_URL}/${key}`;

    return NextResponse.json({
      uploadUrl,
      key,
      fileUrl,
    });
  } catch (error) {
    console.error("presign upload error:", error);

    return NextResponse.json(
      { error: "Failed to create upload URL." },
      { status: 500 }
    );
  }
}