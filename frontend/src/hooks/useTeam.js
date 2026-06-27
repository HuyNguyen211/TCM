import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

/** Lead/admin. GET /api/team -> { members[], available[] } */
export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/team').then((r) => r.data),
  });
}

export function useAddTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.post('/team/members', { userId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useRemoveTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.delete(`/team/members/${userId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}
