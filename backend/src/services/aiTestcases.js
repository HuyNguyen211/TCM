/**
 * aiTestcases.js — assembles document context from a task/subtask's linked sources
 * (Jira / Confluence / Figma) and asks Claude to generate test cases.
 * Returns the generated list WITHOUT saving — the UI previews and the user picks
 * which to create (reusing the normal POST /testcases path).
 */
import { atlassian } from '../integrations/atlassian.js';
import { confluence } from '../integrations/confluence.js';
import { figma } from '../integrations/figma.js';
import { generateTestCases, isConfigured } from './aiGen.js';

export { isConfigured };

/** Build a single context string from the selected sources, collecting warnings. */
async function buildContext(entity, sources) {
  const parts = [];
  const used = [];
  const warnings = [];

  const title = entity.taskName || entity.subtaskName || '';
  if (title || entity.description) {
    parts.push(`# ${title}\n${entity.description || ''}`.trim());
  }

  if (sources.includes('jira') && entity.jiraKey) {
    try {
      const j = await atlassian.getIssueContext(entity.jiraKey);
      parts.push(`## Jira ${j.key} — ${j.summary}\nType: ${j.issueType} | Priority: ${j.priority}\n${j.description}`.trim());
      used.push('jira');
    } catch (e) {
      warnings.push(`Jira: ${e.message}`);
    }
  }

  if (sources.includes('confluence') && entity.confluenceUrl) {
    try {
      const c = await confluence.getPageContent(entity.confluenceUrl);
      parts.push(`## Confluence — ${c.title}\n${c.text}`.trim());
      used.push('confluence');
    } catch (e) {
      warnings.push(`Confluence: ${e.message}`);
    }
  }

  if (sources.includes('figma') && entity.figmaUrl) {
    try {
      const f = await figma.getDesignText(entity.figmaUrl);
      parts.push(
        `## Figma design — ${f.name}\nScreens/frames: ${f.frames.join(', ')}\nText in design:\n${f.texts.join('\n')}`.trim()
      );
      used.push('figma');
    } catch (e) {
      warnings.push(`Figma: ${e.message}`);
    }
  }

  return { contextText: parts.join('\n\n'), used, warnings };
}

/**
 * @param entity task or subtask object (carries jiraKey/confluenceUrl/figmaUrl + name + description)
 * @param body { sources: string[], count?: number, instructions?: string }
 */
export async function genTestcases(entity, { sources = [], count = 8, instructions = '' }) {
  const { contextText, used, warnings } = await buildContext(entity, sources);
  if (!contextText.trim()) {
    return { testCases: [], used, warnings: [...warnings, 'Không có nội dung tài liệu nào để đọc.'] };
  }
  const testCases = await generateTestCases({ contextText, count, instructions });
  return { testCases, used, warnings };
}
