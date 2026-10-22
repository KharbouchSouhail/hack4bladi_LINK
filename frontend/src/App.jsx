import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import RequireRole from "./auth/RequireRole.jsx";
import { ToastProvider } from "./components/ui/Toast.jsx";
import { AdminLayout, CandidateLayout, CompanyLayout } from "./layouts/roleLayouts.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import AdminApplicationsPage from "./pages/admin/AdminApplicationsPage.jsx";
import AdminAssessmentsPage from "./pages/admin/AdminAssessmentsPage.jsx";
import AdminCandidateDetail from "./pages/admin/AdminCandidateDetail.jsx";
import AdminCandidatesPage from "./pages/admin/AdminCandidatesPage.jsx";
import AdminCompaniesPage from "./pages/admin/AdminCompaniesPage.jsx";
import AdminCoursesPage from "./pages/admin/AdminCoursesPage.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminJobProfilesPage from "./pages/admin/AdminJobProfilesPage.jsx";
import AdminJobsPage from "./pages/admin/AdminJobsPage.jsx";
import AdminSkillsPage from "./pages/admin/AdminSkillsPage.jsx";
import AdminSubscriptionsPage from "./pages/admin/AdminSubscriptionsPage.jsx";
import AdminTestEditorPage from "./pages/admin/AdminTestEditorPage.jsx";
import ApplicationsPage from "./pages/candidate/ApplicationsPage.jsx";
import AssessmentsPage from "./pages/candidate/AssessmentsPage.jsx";
import CandidateDashboard from "./pages/candidate/CandidateDashboard.jsx";
import CourseDetailPage from "./pages/candidate/CourseDetailPage.jsx";
import CoursesPage from "./pages/candidate/CoursesPage.jsx";
import JobDetailPage from "./pages/candidate/JobDetailPage.jsx";
import JobsPage from "./pages/candidate/JobsPage.jsx";
import LearningPage from "./pages/candidate/LearningPage.jsx";
import SkillDetailPage from "./pages/candidate/SkillDetailPage.jsx";
import SkillGapsPage from "./pages/candidate/SkillGapsPage.jsx";
import SubscriptionPage from "./pages/candidate/SubscriptionPage.jsx";
import TestTakePage from "./pages/candidate/TestTakePage.jsx";
import TestsPage from "./pages/candidate/TestsPage.jsx";
import CompanyAnalyticsPage from "./pages/company/CompanyAnalyticsPage.jsx";
import CompanyApplicationsBoard from "./pages/company/CompanyApplicationsBoard.jsx";
import CompanyCandidatePage from "./pages/company/CompanyCandidatePage.jsx";
import CompanyDashboard from "./pages/company/CompanyDashboard.jsx";
import CompanyJobProfilesPage from "./pages/company/CompanyJobProfilesPage.jsx";
import CompanyJobsPage from "./pages/company/CompanyJobsPage.jsx";
import CompanyPipelinePage from "./pages/company/CompanyPipelinePage.jsx";
import CompanyProfilePage from "./pages/company/CompanyProfilePage.jsx";
import InterviewsPage from "./pages/InterviewsPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import AdminPlacementsPage from "./pages/admin/AdminPlacementsPage.jsx";
import ApplicationDetailPage from "./pages/candidate/ApplicationDetailPage.jsx";
import * as adminApi from "./services/adminApi.js";
import { listInterviews as companyListInterviews } from "./services/companyApi.js";

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/candidate"
            element={
              <RequireRole role="candidate">
                <CandidateLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CandidateDashboard />} />
            <Route path="assessments" element={<AssessmentsPage />} />
            <Route path="skill-gaps" element={<SkillGapsPage />} />
            <Route path="skill-gaps/:skillId" element={<SkillDetailPage />} />
            <Route path="learning" element={<LearningPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/:courseId" element={<CourseDetailPage />} />
            <Route path="tests" element={<TestsPage />} />
            <Route path="tests/:testId" element={<TestTakePage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="jobs/:jobId" element={<JobDetailPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="applications/:appId" element={<ApplicationDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="settings" element={<SettingsPage role="candidate" />} />
            <Route path="*" element={<NotFoundPage home="/candidate/dashboard" />} />
          </Route>

          <Route
            path="/company"
            element={
              <RequireRole role="company">
                <CompanyLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<CompanyDashboard />} />
            <Route path="profile" element={<CompanyProfilePage />} />
            <Route path="job-profiles" element={<CompanyJobProfilesPage />} />
            <Route path="jobs" element={<CompanyJobsPage />} />
            <Route path="candidates" element={<CompanyPipelinePage />} />
            <Route path="candidates/:appId" element={<CompanyCandidatePage />} />
            <Route path="applications" element={<CompanyApplicationsBoard />} />
            <Route path="interviews" element={<InterviewsPage listInterviews={companyListInterviews} detailPath="/company/candidates" />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="analytics" element={<CompanyAnalyticsPage />} />
            <Route path="settings" element={<SettingsPage role="company" />} />
            <Route path="*" element={<NotFoundPage home="/company/dashboard" />} />
          </Route>

          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminLayout />
              </RequireRole>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="companies" element={<AdminCompaniesPage />} />
            <Route path="candidates" element={<AdminCandidatesPage />} />
            <Route path="candidates/:candidateId" element={<AdminCandidateDetail />} />
            <Route path="job-profiles" element={<AdminJobProfilesPage />} />
            <Route path="skills" element={<AdminSkillsPage />} />
            <Route path="courses" element={<AdminCoursesPage />} />
            <Route path="assessments" element={<AdminAssessmentsPage />} />
            <Route path="assessments/:testId" element={<AdminTestEditorPage />} />
            <Route path="jobs" element={<AdminJobsPage />} />
            <Route path="applications" element={<AdminApplicationsPage />} />
            <Route
              path="applications/:appId"
              element={<CompanyCandidatePage backTo="/admin/applications" backLabel="Applications" api={adminApi} />}
            />
            <Route path="interviews" element={<InterviewsPage listInterviews={adminApi.listInterviews} detailPath="/admin/applications" showCompany />} />
            <Route path="placements" element={<AdminPlacementsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
            <Route path="settings" element={<SettingsPage role="admin" />} />
            <Route path="*" element={<NotFoundPage home="/admin/dashboard" />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
