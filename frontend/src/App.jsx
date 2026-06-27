import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import TeamManagement from './pages/TeamManagement.jsx';
import ProjectView from './pages/ProjectView.jsx';
import Integrations from './pages/Integrations.jsx';
import TaskDetail from './pages/TaskDetail.jsx';
import SubtaskDetail from './pages/SubtaskDetail.jsx';
import TestCaseDetail from './pages/TestCaseDetail.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/integrations"
        element={
          <ProtectedRoute>
            <Integrations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute roles={['lead', 'admin']}>
            <TeamManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <ProjectView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/tasks/:taskId"
        element={
          <ProtectedRoute>
            <TaskDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/tasks/:taskId/subtasks/:subtaskId"
        element={
          <ProtectedRoute>
            <SubtaskDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/testcases/:testCaseId"
        element={
          <ProtectedRoute>
            <TestCaseDetail />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
