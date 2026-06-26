/**
 * aiGen.js — calls Claude to generate test cases from requirement/design context.
 * Uses the official Anthropic SDK, model claude-opus-4-8 (configurable), adaptive
 * thinking, streaming (avoids HTTP timeouts), and structured output (json_schema)
 * so the result is guaranteed parseable.
 */
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';

export const isConfigured = () => Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN);

/** How the client is authenticating — for the Integrations status display. */
export const authMode = () =>
  env.ANTHROPIC_API_KEY ? 'api_key' : env.ANTHROPIC_AUTH_TOKEN ? 'oauth' : 'none';

/**
 * Build the Anthropic client. API key wins if present; otherwise use the OAuth
 * Bearer token (which requires the oauth beta header on /v1/messages).
 */
function makeClient() {
  if (env.ANTHROPIC_API_KEY) {
    return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return new Anthropic({
    authToken: env.ANTHROPIC_AUTH_TOKEN,
    defaultHeaders: { 'anthropic-beta': 'oauth-2025-04-20' },
  });
}

// JSON-schema for structured output (enums mirror the app's test-case fields).
const TESTCASES_SCHEMA = {
  type: 'object',
  properties: {
    testCases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          testCaseName: { type: 'string' },
          module: { type: 'string', enum: ['UI', 'API', 'DB', 'Performance', 'Security'] },
          priority: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          tags: { type: 'array', items: { type: 'string' } },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: { action: { type: 'string' }, expected: { type: 'string' } },
              required: ['action', 'expected'],
              additionalProperties: false,
            },
          },
        },
        required: ['testCaseName', 'module', 'priority', 'tags', 'steps'],
        additionalProperties: false,
      },
    },
  },
  required: ['testCases'],
  additionalProperties: false,
};

const SYSTEM = `You are a senior QA engineer writing test cases for a test-management tool.
From the supplied requirements/design documents, produce clear, atomic, executable test cases.
Rules:
- Name each test case concisely with a "TC_" prefix (e.g. TC_Login_InvalidPassword).
- Pick the most fitting module: UI, API, DB, Performance, or Security.
- Set a sensible priority: CRITICAL, HIGH, MEDIUM, or LOW.
- Add 1-4 short, relevant tags (e.g. smoke, regression, negative, edge).
- Each test case has ordered steps; every step is one action with its expected result.
- Cover happy paths, negative/error cases, and meaningful edge cases.
- Be specific to the documents provided — do not invent unrelated features.
- Write step text in the same language as the source documents when possible.`;

/**
 * @param {{contextText:string, count?:number, instructions?:string}} opts
 * @returns {Promise<Array>} array of { testCaseName, module, priority, tags[], steps[] }
 */
export async function generateTestCases({ contextText, count = 8, instructions = '' }) {
  if (!isConfigured()) throw Object.assign(new Error('AI not configured'), { status: 400 });
  const client = makeClient();

  const user = `Generate up to ${count} test cases from the documents below.` +
    (instructions ? `\nAdditional instructions: ${instructions}` : '') +
    `\n\n=== SOURCE DOCUMENTS ===\n${contextText}`;

  const stream = client.messages.stream({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: TESTCASES_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') {
    throw Object.assign(new Error('AI declined to generate for this content'), { status: 422 });
  }
  const text = message.content.find((b) => b.type === 'text')?.text || '{"testCases":[]}';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw Object.assign(new Error('AI returned unparseable output'), { status: 502 });
  }
  return Array.isArray(parsed.testCases) ? parsed.testCases : [];
}
