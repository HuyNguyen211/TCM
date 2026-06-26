import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useSubtasks(projectId, taskId) {
  return useQuery({
    queryKey: ['subtasks', projectId, taskId],
    queryFn: () => api.get(`/projects/${projectId}/tasks/${taskId}/subtasks`).then((r) => r.data),
    enabled: !!projectId && !!taskId,
  });
}

export function useSubtask(projectId, taskId, subtaskId) {
  return useQuery({
    queryKey: ['subtask', projectId, taskId, subtaskId],
    queryFn: () =>
      api.get(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`).then((r) => r.data),
    enabled: !!projectId && !!taskId && !!subtaskId,
  });
}

export function useCreateSubtask(projectId, taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      api.post(`/projects/${projectId}/tasks/${taskId}/subtasks`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subtasks', projectId, taskId] });
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}

export function useUpdateSubtask(projectId, taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subtaskId, ...payload }) =>
      api.put(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`, payload).then((r) => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['subtasks', projectId, taskId] });
      qc.invalidateQueries({ queryKey: ['subtask', projectId, taskId, vars.subtaskId] });
    },
  });
}

export function useDeleteSubtask(projectId, taskId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subtaskId) =>
      api.delete(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subtasks', projectId, taskId] });
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
}
