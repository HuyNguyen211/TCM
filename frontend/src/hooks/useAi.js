import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/** Generate a PREVIEW list of test cases from a task's (or subtask's) linked docs. */
export function useGenTestcases(projectId, taskId, subtaskId) {
  const url = subtaskId
    ? `/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}/gen-testcases`
    : `/projects/${projectId}/tasks/${taskId}/gen-testcases`;
  return useMutation({
    mutationFn: (body) => api.post(url, body).then((r) => r.data),
  });
}
