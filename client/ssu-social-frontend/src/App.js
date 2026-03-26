// src/App.js
import React, { createContext, useState, useEffect } from "react";
import { DarkModeProvider } from "./components/DarkModeContext";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";

import Navbar from "./components/navbar";
import ContributorList from "./components/project-notes/contributorListPage";
import EditContributor from "./components/project-notes/editContributor";
import CreateContributor from "./components/project-notes/createContributor";
import Login from "./components/users/Login";
import Signup from "./components/register/Register";
import ForYouPage from "./components/post/forYouPage";
import PublicFeedPage from "./components/post/publicFeedPage";
import EditUserPage from "./components/users/editUserPage";
import EditUserBio from "./components/users/editUserBio";
import PublicProfilePage from "./components/users/PublicProfilePage";
import PublicUser from "./components/users/PublicUser";
import PrivateUserProfile from "./components/users/PrivateUserProfile";
import FollowerList from "./components/following/followerListPage";
import FollowingList from "./components/following/followingListPage";
import FollowCompsTestPage from "./components/following/followCompsTestPage";
import PrivateUserLikeList from "./components/privateUserLikeList/PrivateUserLikeListPage";
import getUserInfo from "./utilities/decodeJwt";
import CreatePost from "./components/post/createPost";
import GetAllPost from "./components/post/getAllPost";
import UpdatePost from "./components/post/updatePost";
import UploadImages from "./components/images/uploadImages";
import ViewImages from "./components/images/viewImages";
import GetToken from "./components/getToken";
import useRefreshTokenOnActivity from "./components/hooks/refreshTokenOnActivity";
import SearchPage from "./components/search/SearchPage";
import SearchResultsPosts from "./components/search/SearchResultsPosts";
import SearchResultsProfiles from "./components/search/SearchResultsProfiles";
import Test from "./Test";
import ProtectedRoute from "./components/ProtectedRoute";
import SmartPostSearch from "./components/search/smartPostSearch";

// Dance Master pages
import DanceMasterHome from "./components/dance-master/DanceMasterHome";
import LessonsList from "./components/dance-master/lessons/LessonsList";
import LessonView from "./components/dance-master/lessons/LessonView";
import AdminLessonCreate from "./components/dance-master/lessons/AdminLessonCreate";
import AdminLessonEdit from "./components/dance-master/lessons/AdminLessonEdit";
import MyProgress from "./components/dance-master/MyProgress";
import Challenges from "./components/dance-master/Challenges";

// layout that mounts DanceMasterNavbar + <Outlet />
import DanceMasterLayout from "./components/dance-master/DanceMasterLayout";

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

  // Hide old SSU navbar on login/signup and on ALL /dance-master/* routes
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
                {/* Dance Master: persistent navbar via layout */}
                <Route path="/dance-master" element={<DanceMasterLayout />}>
                  <Route index element={<Navigate to="home" replace />} />
                  <Route path="home" element={<DanceMasterHome />} />
                  <Route path="lessons" element={<LessonsList />} />
                  <Route path="lessons/:id" element={<LessonView />} />
                  <Route path="progress" element={<MyProgress />} />
                  <Route path="challenges" element={<Challenges />} />
                  <Route path="admin/lessons/new" element={<AdminLessonCreate />} />
                  <Route path="admin/lessons/:id/edit" element={<AdminLessonEdit />} />
                </Route>

                {/* User/Profile */}
                <Route path="/editUserPage" element={<EditUserPage />} />
                <Route path="/editUserBio" element={<EditUserBio />} />
                <Route path="/privateUserProfile" element={<PrivateUserProfile />} />
                <Route path="/privateUserLikeList" element={<PrivateUserLikeList />} />
                <Route path="/postLikedByPage" element={<PrivateUserLikeList />} />
                <Route path="/publicProfilePage/:username" element={<PublicProfilePage />} />
                <Route path="/publicUser" element={<PublicUser />} />
                <Route path="/removeProfileImage" element={<PrivateUserProfile />} />

                {/* Project notes */}
                <Route path="/project-notes-contributors" element={<ContributorList />} />
                <Route
                  path="/project-notes/editContributor/:id"
                  element={<EditContributor />}
                />
                <Route path="/project-notes/create" element={<CreateContributor />} />
                <Route path="/project-notes/contributors" element={<ContributorList />} />

                {/* Feed */}
                <Route path="/feed-algorithm" element={<ForYouPage />} />
                <Route path="/publicFeed" element={<PublicFeedPage />} />

                {/* Following */}
                <Route path="/followers/:id" element={<FollowerList />} />
                <Route path="/following/:id" element={<FollowingList />} />
                <Route
                  path="/followCompsTestPage/:id"
                  element={<FollowCompsTestPage />}
                />

                {/* Posts */}
                <Route path="/createpost" element={<CreatePost />} />
                <Route path="/getallpost" element={<GetAllPost />} />
                <Route path="/updatepost/:postId" element={<UpdatePost />} />

                {/* Images */}
                <Route path="/uploadImages" element={<UploadImages />} />
                <Route path="/viewImages" element={<ViewImages />} />

                {/* Auth/Token */}
                <Route path="/get-token" element={<GetToken />} />

                {/* Search */}
                <Route path="/searchPage" element={<SearchPage />} />
                <Route path="/searchResultsPosts" element={<SearchResultsPosts />} />
                <Route
                  path="/searchResultsProfiles"
                  element={<SearchResultsProfiles />}
                />
                <Route path="/smartPostSearch/:userId" element={<SmartPostSearch />} />

                {/* Misc */}
                <Route path="/test" element={<Test />} />
              </Route>

              {/* Fallback */}
              {/* <Route path="*" element={<div>404 Not Found</div>} /> */}
            </Routes>
          </UserContext.Provider>
        </PostPageContext.Provider>
      </PostContext.Provider>
    </DarkModeProvider>
  );
};

export default App;