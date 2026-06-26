import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useExecutions(projectId, testCaseId) {
  return useQuery({
    queryKey: ['executions', projectId, testCaseId],
    queryFn: () =>
      api.get(`/projects/${projectId}/testcases/${testCaseId}/executions`).then((r) => r.data),
    enabled: !!projectId && !!testCaseId,
  });
}

export function useCreateExecution(projectId, testCaseId) {
  const qc = useQueryClient();
  return useMutation({
    // payload mapped: { executionStatus, failureReason, notes, duration, evidenceUrls[] }
    mutationFn: (payload) =>
      api.post(`/projects/${projectId}/testcases/${testCaseId}/execute`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['executions', projectId, testCaseId] });
      qc.invalidateQueries({ queryKey: ['testcases', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['report', projectId] });
    },
  });
}
