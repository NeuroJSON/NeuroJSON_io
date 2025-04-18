import FullScreen from "design/Layouts/FullScreen";
import DatabasePage from "pages/DatabasePage";
import DatasetDetailPage from "pages/DatasetDetailPage";
import DatasetPage from "pages/DatasetPage";
import Home from "pages/Home";
import SearchPage from "pages/SearchPage";
import React from "react";
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
      <Route
        path={`${RoutesEnum.DATABASES}/:dbName`}
        element={<DatasetPage />}
      />

      {/* Dataset Details Page */}
      <Route
        path={`${RoutesEnum.DATABASES}/:dbName/:docId`}
        element={<DatasetDetailPage />}
      />

      {/* Search Page */}
      <Route path={RoutesEnum.SEARCH} element={<SearchPage />} />
    </Route>
  </RouterRoutes>
);

export default Routes;
