import React from "react";
import { Outlet } from "react-router-dom";
import DanceMasterNavbar from "../DanceMasterNavbar";

export default function DanceMasterLayout() {
  return (
    <div>
      <DanceMasterNavbar />
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Outlet />
      </div>
    </div>
  );
}