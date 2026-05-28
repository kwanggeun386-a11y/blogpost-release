import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard  from "./pages/Dashboard.jsx";
import NewPost    from "./pages/NewPost.jsx";
import StyleSelect from "./pages/StyleSelect.jsx";
import Editor     from "./pages/Editor.jsx";
import Settings   from "./pages/Settings.jsx";

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/"          element={<Dashboard />} />
        <Route path="/new"       element={<NewPost />} />
        <Route path="/style/:postId" element={<StyleSelect />} />
        <Route path="/editor/:postId" element={<Editor />} />
        <Route path="/settings"  element={<Settings />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
