import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useIntegrationStatus() {
  return useQuery({
    queryKey: ['integration-status'],
    queryFn: () => api.get('/integrations/status').then((r) => r.data),
    staleTime: 0,
  });
}

// Accepts a bare key (MADP-6557) or a full browse URL and extracts the key.
const jiraKeyFromInput = (s) => {
  const m = String(s).match(/[A-Za-z][A-Za-z0-9_]+-\d+/);
  return m ? m[0].toUpperCase() : String(s).trim();
};

// On-demand live fetches (used by the "test" inputs on the Integrations page).
export const fetchJiraIssue = (input) =>
  api.get(`/integrations/jira/${encodeURIComponent(jiraKeyFromInput(input))}`).then((r) => r.data);

export const fetchFigmaFile = (keyOrUrl) =>
  api.get(`/integrations/figma/${encodeURIComponent(keyOrUrl)}`).then((r) => r.data);
