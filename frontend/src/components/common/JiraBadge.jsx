/**
 * JiraBadge — shows a task/subtask's Jira reference.
 * If the value is a URL it renders a clickable link (text = extracted issue key);
 * a bare key renders as a plain chip. Hidden if empty.
 */
function issueKey(v) {
  const m = String(v).match(/[A-Za-z][A-Za-z0-9_]+-\d+/);
  return m ? m[0].toUpperCase() : v;
}

export default function JiraBadge({ value }) {
  if (!value) return null;
  const isUrl = /^https?:\/\//i.test(value);
  const text = `🔗 ${issueKey(value)}`;
  if (isUrl) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="badge bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
        title={value}
      >
        {text} ↗
      </a>
    );
  }
  return <span className="badge bg-indigo-50 text-indigo-700">{text}</span>;
}
