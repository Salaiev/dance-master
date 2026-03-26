import React from "react";
import { Outlet } from "react-router-dom";
import DanceMasterNavbar from "../DanceMasterNavbar";

export default function DanceMasterLayout() {
  return (
    <div>
      <DanceMasterNavbar />
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
        <Outlet />
      </div>
    </div>
  );
}