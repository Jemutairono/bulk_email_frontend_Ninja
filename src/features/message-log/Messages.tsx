import { useEffect, useState } from 'react';
import { listMessages } from '../../services/messageService';
import { LOCALE } from '../../config/constants';
import type { MessageLogEntry } from '../../types';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';

export function Messages() {
  const [messages, setMessages] = useState<MessageLogEntry[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    listMessages().then(setMessages);
  }, []);

  const filtered = messages.filter(
    (m) =>
      m.recipient.toLowerCase().includes(query.toLowerCase()) ||
      m.campaignName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <p className="section-intro">
        Individual message events across every campaign. Use this when you need to trace what
        happened to one recipient rather than a campaign's aggregate numbers.
      </p>
      <Card
        title="Message events"
        actions={
          <input
            placeholder="Search recipient or campaign"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ fontSize: 13, padding: '6px 10px', border: '1px solid var(--line-strong)', borderRadius: 3 }}
          />
        }
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Campaign</th>
              <th>Status</th>
              <th>Timestamp</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td className="mono">{m.recipient}</td>
                <td>{m.campaignName}</td>
                <td><StatusBadge status={m.status} /></td>
                <td className="mono">{new Date(m.timestamp).toLocaleString(LOCALE)}</td>
                <td style={{ color: 'var(--alert)' }}>{m.failureReason ?? ''}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="empty-state">No messages match "{query}".</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
