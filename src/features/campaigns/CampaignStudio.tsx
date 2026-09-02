import { useEffect, useState } from 'react';
import { CAMPAIGN_TEMPLATES, listCampaigns } from '../../services/campaignService';
import type { Campaign } from '../../types';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';

export function CampaignStudio() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [template, setTemplate] = useState(CAMPAIGN_TEMPLATES[0]);
  const [abTest, setAbTest] = useState(false);

  useEffect(() => {
    listCampaigns().then(setCampaigns);
  }, []);

  return (
    <div>
      <p className="section-intro">
        Build, preview and manage campaigns sent from mail.nca.ke. New campaigns start as
        drafts and move to the Scheduler once content and audience are confirmed.
      </p>

      <div className="grid grid--2">
        <Card title="All campaigns">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Recipients</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="mono">{c.recipients.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="New campaign" eyebrow="Draft">
          <div className="field">
            <label htmlFor="cname">Campaign name</label>
            <input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Contractor Registration Update" />
          </div>
          <div className="field">
            <label htmlFor="subj">Subject line</label>
            <input id="subj" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What recipients see in their inbox" />
          </div>
          <div className="field">
            <label htmlFor="tpl">Template</label>
            <select id="tpl" value={template} onChange={(e) => setTemplate(e.target.value)}>
              {CAMPAIGN_TEMPLATES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input id="ab" type="checkbox" checked={abTest} onChange={(e) => setAbTest(e.target.checked)} style={{ width: 'auto' }} />
            <label htmlFor="ab" style={{ margin: 0 }}>Run an A/B test on subject line</label>
          </div>
          <button className="btn btn--primary" type="button">
            Open in designer
          </button>
        </Card>
      </div>
    </div>
  );
}
