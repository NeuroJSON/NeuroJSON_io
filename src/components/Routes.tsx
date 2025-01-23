import React from "react";
import FullScreen from "design/Layouts/FullScreen";
import Home from "pages/Home";
import DatabasePage from "pages/DatabasePage";
import DatasetPage from "pages/DatasetPage";
import DatasetDetailPage from "pages/DatasetDetailPage";
import { Navigate, Route, Routes as RouterRoutes } from "react-router-dom";
import RoutesEnum from "types/routes.enum";

const Routes = () => (
  <RouterRoutes>
    {/* FullScreen Layout */}
    <Route element={<FullScreen />}>
      {/* Home Page */}
      <Route path={RoutesEnum.HOME} element={<Home />} />

      {/* Databases Page */}
      <Route path={RoutesEnum.DATABASES} element={<DatabasePage />} />

      {/* Dataset List Page */}
      <Route path={`${RoutesEnum.DATABASES}/:dbName`} element={<DatasetPage />} />

      {/* Dataset Details Page */}
      <Route path={`${RoutesEnum.DATABASES}/:dbName/:docId`} element={<DatasetDetailPage />} />
    </Route>

    {/* Fallback Route */}
    <Route path="*" element={<Navigate to={RoutesEnum.HOME} />} />
  </RouterRoutes>
);

export default Routes;

