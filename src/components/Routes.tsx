import ScrollToTop from "./ScrollToTop";
import CompleteProfile from "./User/CompleteProfile";
import ForgotPassword from "./User/ForgotPassword";
import ResetPassword from "./User/ResetPassword";
import UserDashboard from "./User/UserDashboard";
import FullScreen from "design/Layouts/FullScreen";
import AboutPage from "pages/AboutPage";
import DatabasePage from "pages/DatabasePage";
import DatasetDetailPage from "pages/DatasetDetailPage";
import DatasetPage from "pages/DatasetPage";
import Home from "pages/Home";
import ResendVerification from "pages/ResendVerification";
import SearchPage from "pages/SearchPage";
import UpdatedDatasetDetailPage from "pages/UpdatedDatasetDetailPage";
import NewDatasetPage from "pages/UpdatedDatasetPage";
import VerifyEmail from "pages/VerifyEmail";
import React from "react";
import { Navigate, Route, Routes as RouterRoutes } from "react-router-dom";
import RoutesEnum from "types/routes.enum";

const Routes = () => (
  <>
    <ScrollToTop />
    <RouterRoutes>
      {/* FullScreen Layout */}
      <Route element={<FullScreen />}>
        {/* Home Page */}
        <Route path={RoutesEnum.HOME} element={<Home />} />
        {/* Databases Page */}
        <Route path={RoutesEnum.DATABASES} element={<DatabasePage />} />

        {/* Dataset List Page */}
        <Route
          path={`${RoutesEnum.DATABASES}/:dbName`}
          // element={<DatasetPage />}
          element={<NewDatasetPage />}
        />

        {/* Dataset Details Page */}
        <Route
          path={`${RoutesEnum.DATABASES}/:dbName/:docId`}
          // element={<DatasetDetailPage />}
          element={<UpdatedDatasetDetailPage />}
        />

        {/* Search Page */}
        <Route path={RoutesEnum.SEARCH} element={<SearchPage />} />

        {/* About Page */}
        <Route path={RoutesEnum.ABOUT} element={<AboutPage />} />

        {/* Email Verification Routes */}
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/resend-verification" element={<ResendVerification />} />

        <Route path="/complete-profile" element={<CompleteProfile />} />

        {/* forgot and reset password page */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Dashboard Page */}
        <Route path={RoutesEnum.DASHBOARD} element={<UserDashboard />} />
      </Route>
    </RouterRoutes>
  </>
);

export default Routes;
