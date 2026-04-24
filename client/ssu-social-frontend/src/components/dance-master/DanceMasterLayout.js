import React from "react";
import { Outlet } from "react-router-dom";
import DanceMasterNavbar from "../DanceMasterNavbar";

export default function DanceMasterLayout() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <DanceMasterNavbar />
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
    </div>
  );
}