import FullScreen from "design/Layouts/FullScreen";
import Home from "pages/Home";
import { Navigate, Route, Routes as RoutesFromRouter } from "react-router-dom";
import RoutesEnum from "types/routes.enum";

const Routes = () => (
	<RoutesFromRouter>
		<Route element={<FullScreen />}>
			<Route path={RoutesEnum.HOME} element={<Home />} />
		</Route>

		<Route path="*" element={<Navigate to="/" />} />
	</RoutesFromRouter>
);
export default Routes;
