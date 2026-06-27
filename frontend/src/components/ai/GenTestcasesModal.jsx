import { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';
import Badge from '../common/Badge.jsx';
import { priorityBadge } from '../../lib/constants.js';
import { useGenTestcases } from '../../hooks/useAi.js';
import { useCreateTestCase } from '../../hooks/useTestCases.js';
import { apiErrorMessage } from '../../lib/api.js';

const SOURCE_META = [
  { key: 'jira', label: '🔗 Jira', field: 'jiraKey' },
  { key: 'confluence', label: '📄 Confluence', field: 'confluenceUrl' },
  { key: 'figma', label: '🎨 Figma', field: 'figmaUrl' },
];

/**
 * AI test-case generation: choose document sources -> preview generated list -> save selected.
 * `entity` is the task or subtask (carries jiraKey / confluenceUrl / figmaUrl).
 */
export default function GenTestcasesModal({ open, onClose, projectId, taskId, subtaskId, entity }) {
  const available = SOURCE_META.filter((s) => entity?.[s.field]);
  const genMut = useGenTestcases(projectId, taskId, subtaskId);
  const createMut = useCreateTestCase(projectId);

  const [step, setStep] = useState('choose');
  const [sources, setSources] = useState([]);
  const [count, setCount] = useState(8);
  const [instructions, setInstructions] = useState('');
  const [generated, setGenerated] = useState([]);
  const [selected, setSelected] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('choose');
      setSources(available.map((s) => s.key)); // default: all available selected
      setCount(8);
      setInstructions('');
      setGenerated([]);
      setSelected({});
      setWarnings([]);
      setError('');
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleSource = (k) =>
    setSources((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const onGenerate = async () => {
    setError('');
    try {
      const data = await genMut.mutateAsync({ sources, count, instructions });
      setGenerated(data.testCases || []);
      setWarnings(data.warnings || []);
      setSelected(Object.fromEntries((data.testCases || []).map((_, i) => [i, true])));
      setStep('preview');
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const onSave = async () => {
    setError('');
    setSaving(true);
    try {
      const toSave = generated.filter((_, i) => selected[i]);
      for (const tc of toSave) {
        await createMut.mutateAsync({
          testCaseName: tc.testCaseName,
          module: tc.module,
          priority: tc.priority,
          status: 'ACTIVE',
          assignedTo: '',
          tags: tc.tags || [],
          stepsJSON: JSON.stringify((tc.steps || []).map((s, i) => ({ step: i + 1, action: s.action, expected: s.expected }))),
          taskId,
          subtaskId: subtaskId || '',
        });
      }
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <Modal open={open} onClose={onClose} title="✨ Gen Testcase with AI">
      {step === 'choose' && (
        <div className="space-y-4">
          {available.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This task/subtask has no document links yet (Jira / Confluence / Figma). Add a link, then try again.
            </p>
          ) : (
            <>
              <div>
                <label className="label">Document sources for the AI to read</label>
                <div className="space-y-1">
                  {available.map((s) => (
                    <label key={s.key} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={sources.includes(s.key)} onChange={() => toggleSource(s.key)} />
                      {s.label}
                      <span className="truncate text-xs text-gray-400">{entity[s.field]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Maximum count</label>
                  <input type="number" min="1" max="20" className="input" value={count} onChange={(e) => setCount(Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label className="label">Additional instructions (optional)</label>
                <textarea rows={2} className="input" placeholder="e.g. focus on error cases and authorization" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
              </div>
            </>
          )}

          {error && <p className="field-error whitespace-pre-line">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={genMut.isPending || sources.length === 0} onClick={onGenerate}>
              {genMut.isPending ? 'Generating… (may take ~30s)' : 'Generate'}
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          {warnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
            </div>
          )}

          {generated.length === 0 ? (
            <p className="text-sm text-gray-500">The AI could not generate any test cases from the selected documents.</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">The AI suggested <strong>{generated.length}</strong> test case(s). Select the ones you want to save:</p>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {generated.map((tc, i) => (
                  <label key={i} className="flex gap-2 rounded-md border border-gray-200 p-3 hover:bg-gray-50">
                    <input type="checkbox" className="mt-1" checked={!!selected[i]} onChange={() => setSelected((s) => ({ ...s, [i]: !s[i] }))} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{tc.testCaseName}</span>
                        <Badge className={priorityBadge[tc.priority]}>{tc.priority}</Badge>
                        <span className="badge bg-gray-100 text-gray-600">{tc.module}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(tc.tags || []).map((t) => <Badge key={t} className="bg-gray-100 text-gray-500">{t}</Badge>)}
                      </div>
                      <ol className="mt-1 list-decimal pl-5 text-xs text-gray-500">
                        {(tc.steps || []).map((s, k) => <li key={k}>{s.action} → <em>{s.expected}</em></li>)}
                      </ol>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {error && <p className="field-error whitespace-pre-line">{error}</p>}

          <div className="flex justify-between gap-2 pt-2">
            <button className="btn-secondary" onClick={() => setStep('choose')} disabled={saving}>← Regenerate</button>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={onClose} disabled={saving}>Close</button>
              <button className="btn-primary" onClick={onSave} disabled={saving || selectedCount === 0}>
                {saving ? 'Saving…' : `Save ${selectedCount} test case(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
