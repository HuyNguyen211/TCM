import { useState } from 'react';

/**
 * Controlled multi-select chip input. value is a string[], onChange(string[]).
 * Add with Enter or comma; remove with the × or Backspace on an empty field.
 */
export default function TagInput({ value = [], onChange, placeholder = 'Add tag and press Enter' }) {
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const t = raw.trim().replace(/,$/, '');
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };

  const remove = (t) => onChange(value.filter((x) => x !== t));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-300 px-2 py-1.5 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
      {value.map((t) => (
        <span key={t} className="badge bg-brand-50 text-brand-700">
          {t}
          <button type="button" className="ml-1 text-brand-500 hover:text-brand-700" onClick={() => remove(t)}>×</button>
        </span>
      ))}
      <input
        className="min-w-[8rem] flex-1 border-0 p-1 text-sm outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft && add(draft)}
        placeholder={value.length ? '' : placeholder}
      />
    </div>
  );
}
