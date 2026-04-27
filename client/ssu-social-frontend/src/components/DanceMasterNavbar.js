import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { getUserInfoAsync } from "../utilities/decodeJwtAsync";

const DEFAULT_PROFILE_IMAGE =
  "https://ssusocial.s3.amazonaws.com/profilepictures/ProfileIcon.png";

const linkBase = {
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14,
  padding: "8px 10px",
  borderRadius: 10,
};

export default function DanceMasterNavbar() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState(DEFAULT_PROFILE_IMAGE);

  const BACKEND = process.env.REACT_APP_BACKEND_SERVER_URI;

  useEffect(() => {
    async function loadNavbarUser() {
      try {
        const userInfo = await getUserInfoAsync();
        if (!userInfo) return;

        const userId =
          userInfo.id || userInfo.user_id || userInfo._id || userInfo.sub;

        if (!userId) return;

        const response = await axios.get(`${BACKEND}/user/getUserById/${userId}`);
        const data = response.data;

        setUsername(data.username || "User");
        setProfileImage(
          data.profileImage || data.profile_image || DEFAULT_PROFILE_IMAGE
        );
      } catch (err) {
        console.error("Failed to load navbar user:", err);
      }
    }

    loadNavbarUser();
  }, [BACKEND]);

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("token");
    localStorage.removeItem("jwt");
    navigate("/");
  }

  const linkStyle = ({ isActive }) => ({
    ...linkBase,
    color: isActive ? "#111827" : "#6b7280",
    background: isActive ? "#eef2ff" : "transparent",
  });

  return (
    <div
      style={{
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
        position: "relative",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#4f46e5" }}>
            Dance Master
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <NavLink to="/dance-master/home" style={linkStyle}>Home</NavLink>
            <NavLink to="/dance-master/lessons" style={linkStyle}>Lessons</NavLink>
            <NavLink to="/dance-master/progress" style={linkStyle}>My Progress</NavLink>
            <NavLink to="/dance-master/challenges" style={linkStyle}>Challenges</NavLink>
            <NavLink to="/dance-master/notes" style={linkStyle}>Notes</NavLink>
            <NavLink to="/dance-master/profile" style={linkStyle}>Profile</NavLink>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <NavLink
            to="/dance-master/profile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              textDecoration: "none",
              color: "#111827",
            }}
          >
            <img
              src={profileImage}
              alt="Profile"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                objectFit: "cover",
                border: "1px solid #e5e7eb",
                background: "#f3f4f6",
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DEFAULT_PROFILE_IMAGE;
              }}
            />

            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                maxWidth: 120,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {username || "User"}
            </span>
          </NavLink>

          <button
            onClick={logout}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 12,
              padding: "10px 16px",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}