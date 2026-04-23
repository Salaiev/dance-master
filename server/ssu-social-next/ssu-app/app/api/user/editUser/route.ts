import { NextResponse } from "next/server";
import { censorText } from "@/utilities/moderation";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { corsHeaders } from "@/utilities/cors";
import sql from "@/utilities/db";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Missing token" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.split(" ")[1];
    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
    } catch (err) {
      console.error("Token verification failed:", err);
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = decoded?.id || decoded?.user_id || decoded?.userId || decoded?.sub;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Invalid token payload" },
        { status: 400, headers: corsHeaders }
      );
    }

    const body = await req.json();

    const username =
      typeof body.username === "string" ? body.username.trim() : null;
    const email =
      typeof body.email === "string" ? body.email.trim() : null;
    const password =
      typeof body.password === "string" ? body.password.trim() : null;
    const biography =
      typeof body.biography === "string" ? body.biography.trim() : null;
    const profileImage =
      typeof body.profileImage === "string" ? body.profileImage.trim() : null;

    const [existingUser] = await sql`
      SELECT *
      FROM ssu_users
      WHERE user_id = ${userId}
    `;

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (username) {
      const [usernameConflict] = await sql`
        SELECT user_id, username
        FROM ssu_users
        WHERE LOWER(username) = LOWER(${username})
          AND user_id <> ${userId}
      `;

      if (usernameConflict) {
        return NextResponse.json(
          { success: false, message: "Username is already taken" },
          { status: 409, headers: corsHeaders }
        );
      }
    }

    if (email) {
      const [emailConflict] = await sql`
        SELECT user_id, email
        FROM ssu_users
        WHERE LOWER(email) = LOWER(${email})
          AND user_id <> ${userId}
      `;

      if (emailConflict) {
        return NextResponse.json(
          { success: false, message: "Email is already in use" },
          { status: 409, headers: corsHeaders }
        );
      }
    }

    let hashedPassword = existingUser.password;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    let bioForUpdate = biography;

    if (bioForUpdate) {
      const { text } = await censorText(bioForUpdate);
      bioForUpdate = text;
    }

    const [updatedUser] = await sql`
      UPDATE ssu_users
      SET
        username = COALESCE(${username}, username),
        email = COALESCE(${email}, email),
        password = ${hashedPassword},
        biography = COALESCE(${bioForUpdate}, biography),
        profile_image = COALESCE(${profileImage}, profile_image)
      WHERE user_id = ${userId}
      RETURNING
        user_id::text AS "_id",
        username,
        email,
        biography,
        profile_image AS "profileImage"
    `;

    return NextResponse.json(
      {
        success: true,
        message: "User information updated successfully",
        user: updatedUser,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("🔥 Error updating user:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error while updating user information",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}