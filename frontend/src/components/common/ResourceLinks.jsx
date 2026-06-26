/** Renders Confluence / Figma link chips for a task or subtask. Hidden if none set. */
export default function ResourceLinks({ confluenceUrl, figmaUrl }) {
  if (!confluenceUrl && !figmaUrl) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {confluenceUrl && (
        <a href={confluenceUrl} target="_blank" rel="noreferrer" className="badge bg-sky-50 text-sky-700 hover:bg-sky-100">
          📄 Confluence ↗
        </a>
      )}
      {figmaUrl && (
        <a href={figmaUrl} target="_blank" rel="noreferrer" className="badge bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100">
          🎨 Figma ↗
        </a>
      )}
    </div>
  );
}
