import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

const linkBase = {
  textDecoration: "none",
  fontWeight: 700,
  fontSize: 14,
  padding: "8px 10px",
  borderRadius: 10,
};

export default function DanceMasterNavbar() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    navigate("/");
  }

  const linkStyle = ({ isActive }) => ({
    ...linkBase,
    color: isActive ? "#111827" : "#6b7280",
    background: isActive ? "#eef2ff" : "transparent",
  });

  return (
    <div style={{ borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
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
            <NavLink to="/dance-master/home" style={linkStyle}>
              Home
            </NavLink>

            <NavLink to="/dance-master/lessons" style={linkStyle}>
              Lessons
            </NavLink>

            <NavLink to="/dance-master/progress" style={linkStyle}>
              My Progress
            </NavLink>

            <NavLink to="/dance-master/challenges" style={linkStyle}>
              Challenges
            </NavLink>

            <NavLink to="/dance-master/notes" style={linkStyle}>
              Notes
            </NavLink>
          </div>
        </div>

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
  );
}