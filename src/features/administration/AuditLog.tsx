import { useEffect, useState } from 'react';
import { listAuditLog } from '../../services/auditService';
import { LOCALE } from '../../config/constants';
import type { AuditLogEntry } from '../../types';
import { Card } from '../../components/ui/Card';

export function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    listAuditLog().then(setEntries);
  }, []);

  return (
    <div>
      <p className="section-intro">
        Immutable record of every message and administrative action on this tenant. Export for
        offline review or SIEM ingestion.
      </p>
      <Card title="Recent activity" actions={<button className="btn">Download log</button>}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="mono">{new Date(e.timestamp).toLocaleString(LOCALE)}</td>
                <td className="mono">{e.actor}</td>
                <td>{e.action}</td>
                <td>{e.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
