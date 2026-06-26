import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useReport(projectId, params = {}) {
  return useQuery({
    queryKey: ['report', projectId, params],
    queryFn: () => api.get(`/projects/${projectId}/reports`, { params }).then((r) => r.data),
    enabled: !!projectId,
  });
}
