// src/App.js
import React, { createContext, useEffect, useState } from "react";
import { DarkModeProvider } from "./components/DarkModeContext";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";

import Login from "./components/users/Login";
import Signup from "./components/register/Register";
import ProtectedRoute from "./components/ProtectedRoute";
import getUserInfo from "./utilities/decodeJwt";
import useRefreshTokenOnActivity from "./components/hooks/refreshTokenOnActivity";

// Keep old navbar only for any remaining non-DanceMaster pages if needed
import Navbar from "./components/navbar";

// Dance Master pages
import DanceMasterHome from "./components/dance-master/DanceMasterHome";
import LessonsList from "./components/dance-master/lessons/LessonsList";
import LessonView from "./components/dance-master/lessons/LessonView";
import AdminLessonCreate from "./components/dance-master/lessons/AdminLessonCreate";
import AdminLessonEdit from "./components/dance-master/lessons/AdminLessonEdit";
import MyProgress from "./components/dance-master/MyProgress";
import Challenges from "./components/dance-master/Challenges";
import NotesPage from "./components/dance-master/NotesPage";
import DanceMasterLayout from "./components/dance-master/DanceMasterLayout";

// New cleaned user page
import PrivateUserPage from "./components/users/PrivateUserPage";

export const UserContext = createContext();
export const PostContext = createContext();
export const PostPageContext = createContext();

const App = () => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);

  const location = useLocation();

  useRefreshTokenOnActivity();

  useEffect(() => {
    setUser(getUserInfo());
  }, []);

  // Hide old SSU navbar on login/signup and all DanceMaster routes
  const hideNavbar =
    location.pathname === "/" ||
    location.pathname === "/signup" ||
    location.pathname.startsWith("/dance-master");

  return (
    <DarkModeProvider>
      <PostContext.Provider value={[posts, setPosts]}>
        <PostPageContext.Provider value={[page, setPage]}>
          {!hideNavbar && <Navbar />}

          <UserContext.Provider value={[user, setUser]}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                {/* Dance Master layout with persistent navbar */}
                <Route path="/dance-master" element={<DanceMasterLayout />}>
                  <Route index element={<Navigate to="home" replace />} />
                  <Route path="home" element={<DanceMasterHome />} />
                  <Route path="lessons" element={<LessonsList />} />
                  <Route path="lessons/:id" element={<LessonView />} />
                  <Route path="progress" element={<MyProgress />} />
                  <Route path="challenges" element={<Challenges />} />
                  <Route path="notes" element={<NotesPage />} />
                  <Route path="profile" element={<PrivateUserPage />} />
                  <Route path="admin/lessons/new" element={<AdminLessonCreate />} />
                  <Route path="admin/lessons/:id/edit" element={<AdminLessonEdit />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </UserContext.Provider>
        </PostPageContext.Provider>
      </PostContext.Provider>
    </DarkModeProvider>
  );
};

export default App;