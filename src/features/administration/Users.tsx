import { useEffect, useState } from 'react';
import { listUsers } from '../../services/adminService';
import type { ManagedUser } from '../../types';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';

export function Users() {
  const [users, setUsers] = useState<ManagedUser[]>([]);

  useEffect(() => {
    listUsers().then(setUsers);
  }, []);

  return (
    <div>
      <p className="section-intro">
        Enable or disable users, and assign the access profile that controls what they can see
        and do. Every account is personal — shared logins are not permitted.
      </p>
      <Card title="NCA users" actions={<button className="btn btn--primary">Invite user</button>}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email}>
                <td>{u.name}</td>
                <td className="mono">{u.email}</td>
                <td style={{ textTransform: 'capitalize' }}>{u.role.replace('_', ' ')}</td>
                <td><StatusBadge status={u.status} /></td>
                <td><button className="btn">Manage</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
