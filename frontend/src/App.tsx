import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/ui";
import type { Role } from "./lib/api";

import { Login } from "./pages/Login";
import { TeacherDashboard } from "./pages/teacher/Dashboard";
import { TeacherMaterials } from "./pages/teacher/Materials";
import { TeacherExams } from "./pages/teacher/Exams";
import { TeacherExamReview } from "./pages/teacher/ExamReview";
import { ParentProgress } from "./pages/parent/Progress";
import { ParentReport } from "./pages/parent/Report";
import { StudentExams } from "./pages/student/Exams";
import { StudentTutor } from "./pages/student/Tutor";
import { AdminOverviewPage } from "./pages/admin/Overview";
import { AdminAutomationPage } from "./pages/admin/Automation";

const HOME: Record<Role, string> = {
  admin: "/admin",
  teacher: "/teacher",
  parent: "/parent",
  student: "/student",
};

function Require({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={HOME[user.role]} replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={HOME[user.role]} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route
              path="/teacher"
              element={<Require roles={["teacher", "admin"]}><TeacherDashboard /></Require>}
            />
            <Route
              path="/teacher/materials"
              element={<Require roles={["teacher", "admin"]}><TeacherMaterials /></Require>}
            />
            <Route
              path="/teacher/exams"
              element={<Require roles={["teacher", "admin"]}><TeacherExams /></Require>}
            />
            <Route
              path="/teacher/exams/:id"
              element={<Require roles={["teacher", "admin"]}><TeacherExamReview /></Require>}
            />
            <Route path="/parent" element={<Require roles={["parent"]}><ParentProgress /></Require>} />
            <Route
              path="/parent/report/:studentId"
              element={<Require roles={["parent"]}><ParentReport /></Require>}
            />
            <Route path="/student" element={<Require roles={["student"]}><StudentExams /></Require>} />
            <Route path="/student/tutor" element={<Require roles={["student"]}><StudentTutor /></Require>} />
            <Route path="/admin" element={<Require roles={["admin"]}><AdminOverviewPage /></Require>} />
            <Route path="/admin/automation" element={<Require roles={["admin"]}><AdminAutomationPage /></Require>} />
          </Route>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
