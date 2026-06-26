import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useTestCases(projectId, params = {}) {
  return useQuery({
    queryKey: ['testcases', projectId, params],
    queryFn: () => api.get(`/projects/${projectId}/testcases`, { params }).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useTestCase(projectId, testCaseId) {
  return useQuery({
    queryKey: ['testcase', projectId, testCaseId],
    queryFn: () => api.get(`/projects/${projectId}/testcases/${testCaseId}`).then((r) => r.data),
    enabled: !!projectId && !!testCaseId,
  });
}

function invalidateProjectScope(qc, projectId) {
  qc.invalidateQueries({ queryKey: ['testcases', projectId] });
  qc.invalidateQueries({ queryKey: ['project', projectId] });
  qc.invalidateQueries({ queryKey: ['projects'] });
  qc.invalidateQueries({ queryKey: ['report', projectId] });
  // test-case counts live on tasks/subtasks too
  qc.invalidateQueries({ queryKey: ['tasks', projectId] });
  qc.invalidateQueries({ queryKey: ['subtasks', projectId] });
}

export function useCreateTestCase(projectId) {
  const qc = useQueryClient();
  return useMutation({
    // payload already mapped: { testCaseName, module, priority, status, assignedTo, tags[], stepsJSON }
    mutationFn: (payload) =>
      api.post(`/projects/${projectId}/testcases`, payload).then((r) => r.data),
    onSuccess: () => invalidateProjectScope(qc, projectId),
  });
}

export function useUpdateTestCase(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ testCaseId, ...payload }) =>
      api.put(`/projects/${projectId}/testcases/${testCaseId}`, payload).then((r) => r.data),
    onSuccess: (_d, vars) => {
      invalidateProjectScope(qc, projectId);
      qc.invalidateQueries({ queryKey: ['testcase', projectId, vars.testCaseId] });
    },
  });
}

export function useDeleteTestCase(projectId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (testCaseId) =>
      api.delete(`/projects/${projectId}/testcases/${testCaseId}`).then((r) => r.data),
    onSuccess: () => invalidateProjectScope(qc, projectId),
  });
}
