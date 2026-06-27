import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import {
  AuthSkeleton,
  DashboardSkeleton,
  ListPageSkeleton,
  ProjectViewSkeleton,
  DetailSkeleton,
  IntegrationsSkeleton,
  TeamSkeleton,
} from './components/common/Skeleton.jsx';

// Route-level code splitting: each page downloads on first visit, then caches.
const Login = lazy(() => import('./pages/Login.jsx'));
const Signup = lazy(() => import('./pages/Signup.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const AdminUsers = lazy(() => import('./pages/AdminUsers.jsx'));
const TeamManagement = lazy(() => import('./pages/TeamManagement.jsx'));
const ProjectView = lazy(() => import('./pages/ProjectView.jsx'));
const Integrations = lazy(() => import('./pages/Integrations.jsx'));
const TaskDetail = lazy(() => import('./pages/TaskDetail.jsx'));
const SubtaskDetail = lazy(() => import('./pages/SubtaskDetail.jsx'));
const TestCaseDetail = lazy(() => import('./pages/TestCaseDetail.jsx'));

/** Wrap a lazy element with a page-matched skeleton while its chunk loads. */
const page = (el, fallback) => <Suspense fallback={fallback}>{el}</Suspense>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={page(<Login />, <AuthSkeleton />)} />
      <Route path="/signup" element={page(<Signup />, <AuthSkeleton />)} />
      <Route
        path="/"
        element={
          <ProtectedRoute>{page(<Dashboard />, <DashboardSkeleton />)}</ProtectedRoute>
        }
      />
      <Route
        path="/integrations"
        element={
          <ProtectedRoute>{page(<Integrations />, <IntegrationsSkeleton />)}</ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={['admin']}>
            {page(<AdminUsers />, <ListPageSkeleton />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute roles={['lead', 'admin']}>
            {page(<TeamManagement />, <TeamSkeleton />)}
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>{page(<ProjectView />, <ProjectViewSkeleton />)}</ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/tasks/:taskId"
        element={
          <ProtectedRoute>{page(<TaskDetail />, <DetailSkeleton />)}</ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/tasks/:taskId/subtasks/:subtaskId"
        element={
          <ProtectedRoute>{page(<SubtaskDetail />, <DetailSkeleton />)}</ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/testcases/:testCaseId"
        element={
          <ProtectedRoute>{page(<TestCaseDetail />, <DetailSkeleton />)}</ProtectedRoute>
        }
      />
    </Routes>
  );
}
