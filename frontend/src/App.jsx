import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";
import EventPage from "./pages/EventPage";
import EventParticipantsPage from "./pages/EventParticipantsPage";
import HousesPage from "./pages/HousesPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LoginPage from "./pages/LoginPage";
import ProjectorPage from "./pages/ProjectorPage";
import ResultPage from "./pages/ResultPage";
import SearchPage from "./pages/SearchPage";
import StudentPage from "./pages/StudentPage";
import StudentProfilePage from "./pages/StudentProfilePage";
import UsersPage from "./pages/UsersPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/projector"
        element={
          <ProtectedRoute>
            <ProjectorPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="students" element={<StudentPage />} />
        <Route path="houses" element={<HousesPage />} />
        <Route path="events" element={<EventPage />} />
        <Route path="event-participants" element={<EventParticipantsPage />} />
        <Route path="student-profile" element={<StudentProfilePage />} />
        <Route path="results" element={<ResultPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="search" element={<SearchPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
