import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import PrivateRoute from "./components/PrivateRoute";
import Home from "./pages/Home";
import BrowseConsultants from "./pages/BrowseConsultants";
import BrowseMissions from "./pages/BrowseMissions";
import ConsultantDetail from "./pages/ConsultantDetail";
import MissionDetail from "./pages/MissionDetail";
import MissionForm from "./pages/MissionForm";
import MissionMatches from "./pages/MissionMatches";
import MyMissions from "./pages/MyMissions";
import MyProfile from "./pages/MyProfile";
import Requests from "./pages/Requests";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PaymentReturn from "./pages/PaymentReturn";

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/consultants" element={<BrowseConsultants />} />
          <Route path="/consultants/:id" element={<ConsultantDetail />} />
          <Route path="/missions" element={<BrowseMissions />} />
          <Route
            path="/missions/new"
            element={
              <PrivateRoute role="entreprise">
                <MissionForm />
              </PrivateRoute>
            }
          />
          <Route path="/missions/:id" element={<MissionDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/me/profile"
            element={
              <PrivateRoute role="consultant">
                <MyProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/me/missions"
            element={
              <PrivateRoute role="entreprise">
                <MyMissions />
              </PrivateRoute>
            }
          />
          <Route
            path="/me/missions/:id/edit"
            element={
              <PrivateRoute role="entreprise">
                <MissionForm />
              </PrivateRoute>
            }
          />
          <Route
            path="/me/missions/:id/matches"
            element={
              <PrivateRoute role="entreprise">
                <MissionMatches />
              </PrivateRoute>
            }
          />
          <Route
            path="/requests/sent"
            element={
              <PrivateRoute>
                <Requests kind="sent" />
              </PrivateRoute>
            }
          />
          <Route
            path="/requests/received"
            element={
              <PrivateRoute>
                <Requests kind="received" />
              </PrivateRoute>
            }
          />
          <Route
            path="/payments/:id/return"
            element={
              <PrivateRoute>
                <PaymentReturn />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
