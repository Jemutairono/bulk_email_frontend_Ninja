import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  createCampaignDraft,
  deleteCampaign,
  getCampaign,
  getCampaignHistory,
  getCampaignHistoryEmails,
  listCampaigns,
  sendCampaign,
  scheduleCampaign,
  sendTestEmail,
  updateCampaign,
  type CampaignHistoryEntry,
  type CampaignHistorySummary,
  type CampaignEmailEntry,
} from '../../services/campaignservice';
import { getTemplate, listTemplates } from '../../services/templateService';
import {
  getContactCountForGroup,
  listGroups,
} from '../../services/contactService';
import type { Campaign, EmailTemplate } from '../../types';
import { Card } from '../../components/ui/Card';
import './CampaignStudio.css';

type CampaignDisplay = Campaign & {
  sentAt?: string | null;
  emailStatus?: string | null;
  deliveryStatus?: string | null;
};

export function CampaignStudio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isNewCampaign = searchParams.get('new') === '1';
  const editId = searchParams.get('edit');
  const historyId = searchParams.get('history');
  const isEditing = Boolean(editId);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);

  // Draft form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [templateId, setTemplateId] = useState<string>('');
  const [targetGroup, setTargetGroup] = useState('All Subscribers');
  const [customTarget, setCustomTarget] = useState('');
  const [abTest, setAbTest] = useState(false);
  const [body, setBody] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [sender, setSender] = useState('');
  const [contentMode, setContentMode] = useState<'text' | 'template'>('text');
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [scheduleChoice, setScheduleChoice] = useState<'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | ''>('');
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [showSendPreview, setShowSendPreview] = useState(false);
  const [pendingAction, setPendingAction] = useState<'send' | 'schedule' | null>(null);
  const [recipientEstimate, setRecipientEstimate] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isLoadingEditor, setIsLoadingEditor] = useState(false);
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<CampaignHistoryEntry[]>([]);
  const [historySummary, setHistorySummary] = useState<CampaignHistorySummary | null>(null);
  const [historyCampaign, setHistoryCampaign] = useState<CampaignDisplay | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyEmailEntry, setHistoryEmailEntry] = useState<CampaignHistoryEntry | null>(null);
  const [historyEmails, setHistoryEmails] = useState<CampaignEmailEntry[]>([]);
  const [historyEmailLoading, setHistoryEmailLoading] = useState(false);
  const [historyEmailError, setHistoryEmailError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedGroupFilter, setSelectedGroupFilter] =
    useState<string>('all');
  const [sortBy, setSortBy] = useState<
    'newest' | 'name' | 'recipients'
  >('newest');

  async function reloadCampaigns() {
    const loaded = await listCampaigns();
    setCampaigns(loaded);
    return loaded;
  }

  useEffect(() => {
    reloadCampaigns();
    listGroups().then(setAvailableGroups);
  }, []);

  useEffect(() => {
    listTemplates().then((loaded) => {
      setTemplates(loaded);
      const requested = searchParams.get('templateId');
      if (requested) {
        const initial = loaded.find((t) => t.id === requested);
        if (initial) {
          setTemplateId(initial.id);
          setContentMode('template');
          setSubject(initial.subjectPreview);
          setBody(initial.bodyPreview);
        }
      }
    });
  }, [searchParams]);

  useEffect(() => {
    if (!editId) return;

    setIsLoadingEditor(true);
    setFeedbackMessage(null);

    getCampaign(editId)
      .then((campaign) => {
        setName(campaign.name);
        setSubject(campaign.subject);
        setBody(campaign.body || '');
        setFromEmail(campaign.fromEmail || '');
        setSender(campaign.sender || '');
        setTargetGroup(campaign.targetGroup || 'All Subscribers');
        setCustomTarget('');
        setAbTest(false);
        setContentMode(campaign.template ? 'template' : 'text');
        setTemplateId('');
      })
      .catch((error) => {
        alert(error instanceof Error ? error.message : 'Could not load campaign for editing.');
        navigate({ search: '' }, { replace: true });
      })
      .finally(() => setIsLoadingEditor(false));
  }, [editId, navigate]);

  useEffect(() => {
    if (!historyId || historyCampaign?.id === historyId) return;

    const existing = campaigns.find((campaign) => campaign.id === historyId);
    if (existing) {
      handleSendHistory(existing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyId, campaigns]);

  // Update recipient estimate when target group changes
  useEffect(() => {
    const activeGroup =
      targetGroup === '__custom__'
        ? customTarget.trim()
        : targetGroup;

    if (!activeGroup) {
      setRecipientEstimate(0);
      return;
    }

    if (activeGroup.includes('@')) {
      setRecipientEstimate(1);
    } else {
      getContactCountForGroup(activeGroup).then(setRecipientEstimate);
    }
  }, [targetGroup, customTarget]);

  const selectedTemplate = templates.find(
    (t) => t.id === templateId
  );

  const htmlToPlainText = (value: string): string => {
    if (!value) return '';

    // Templates may come from the API as HTML. Convert common block/line
    // elements into readable newlines before stripping the remaining tags.
    const withBreaks = value
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\s*\/(p|div|section|article|h[1-6]|li)\s*>/gi, '\n')
      .replace(/<\s*(p|div|section|article|h[1-6]|li)(?:\s[^>]*)?>/gi, '');

    const parser = new DOMParser();
    const doc = parser.parseFromString(withBreaks, 'text/html');
    return (doc.body.textContent ?? '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: campaigns.length,
    };

    campaigns.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });

    return counts;
  }, [campaigns]);

  // Filtered & sorted campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns
      .filter((c) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();

          const matchName = c.name.toLowerCase().includes(q);
          const matchSubject = c.subject
            .toLowerCase()
            .includes(q);

          const matchGroup = c.targetGroup
            ? c.targetGroup.toLowerCase().includes(q)
            : false;

          if (!matchName && !matchSubject && !matchGroup) {
            return false;
          }
        }

        if (
          selectedStatus !== 'all' &&
          c.status !== selectedStatus
        ) {
          return false;
        }

        if (selectedGroupFilter !== 'all') {
          if (
            !c.targetGroup ||
            c.targetGroup.toLowerCase() !==
              selectedGroupFilter.toLowerCase()
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }

        if (sortBy === 'recipients') {
          return b.recipients - a.recipients;
        }

        return (b.createdAt || '').localeCompare(
          a.createdAt || ''
        );
      });
  }, [
    campaigns,
    searchQuery,
    selectedStatus,
    selectedGroupFilter,
    sortBy,
  ]);

  async function handleSaveDraft() {
    if (!name.trim() || !subject.trim()) {
      alert('Please enter a campaign name and subject line.');
      return;
    }

    const finalGroup =
      targetGroup === '__custom__'
        ? customTarget.trim()
        : targetGroup;

    setIsSaving(true);

    try {
      const payload = {
        name,
        subject,
        body,
        fromEmail,
        sender,
        template: contentMode === 'template' ? templateId : '',
        targetGroup: finalGroup || 'All Subscribers',
        abTest,
      };

      const saved = editId
        ? await updateCampaign(editId, payload)
        : await createCampaignDraft(payload, recipientEstimate ?? 0);

      setFeedbackMessage(
        editId
          ? `Campaign "${saved.name}" updated successfully.`
          : `Campaign "${saved.name}" saved as draft. You can now continue editing, schedule it, or send it.`
      );

      await reloadCampaigns();

      if (!editId) {
        navigate(`?edit=${encodeURIComponent(saved.id)}`, { replace: true });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save campaign.';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  }

  function resolveSchedule(): { scheduledFor: string; startDate: string; endDate: string } | null {
    const endDate = scheduleChoice === 'once' ? scheduleStartDate : scheduleEndDate;
    if (!scheduleChoice || !scheduleStartDate || !endDate || !scheduleTime) return null;
    const scheduledFor = new Date(`${scheduleStartDate}T${scheduleTime}`).toISOString();
    return { scheduledFor, startDate: scheduleStartDate, endDate };
  }

  async function ensureCampaignId(): Promise<string | null> {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      alert('Please complete the campaign name, subject and email content first.');
      return null;
    }

    const payload = {
      name,
      subject,
      body,
      fromEmail,
      sender,
      template: contentMode === 'template' ? templateId : '',
      targetGroup: targetGroup === '__custom__' ? customTarget.trim() : targetGroup,
      abTest,
    };

    if (editId) {
      const saved = await updateCampaign(editId, payload);
      setCampaigns((current) => current.map((c) => (c.id === saved.id ? saved : c)));
      return saved.id;
    }

    const saved = await createCampaignDraft(payload, recipientEstimate ?? 0);
    setCampaigns((current) => [saved, ...current]);
    return saved.id;
  }

  function handleSendNow() {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      alert('Complete the campaign name, subject and email content first.');
      return;
    }
    setPendingAction('send');
    setShowSendPreview(true);
  }

  function handleSchedule() {
    const resolved = resolveSchedule();
    if (!resolved) {
      alert(scheduleChoice === 'once' ? 'Choose a date and time.' : 'Choose a schedule type, start date, end date and time.');
      return;
    }
    if (new Date(resolved.endDate) < new Date(resolved.startDate)) {
      alert('The end date cannot be before the start date.');
      return;
    }
    setPendingAction('schedule');
    setShowSendPreview(true);
  }

  async function confirmPendingAction() {
    const action = pendingAction;
    if (!action) return;
    const id = await ensureCampaignId();
    if (!id) return;
    setIsSubmittingCampaign(true);
    try {
      if (action === 'send') {
        await sendCampaign(id);
        setFeedbackMessage('Campaign sent successfully.');
      } else {
        const resolved = resolveSchedule();
        if (!resolved) throw new Error('Schedule details are incomplete.');
        await scheduleCampaign(id, { ...resolved, scheduleType: scheduleChoice as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' });
        setFeedbackMessage('Campaign scheduled successfully.');
      }
      await reloadCampaigns();
      setShowSendPreview(false);
      setPendingAction(null);
      navigate({ search: '' }, { replace: true });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not complete the campaign action.');
    } finally {
      setIsSubmittingCampaign(false);
    }
  }

  function cancelPendingAction() {
    setShowSendPreview(false);
    setPendingAction(null);
  }

  async function handleSendTest() {
    if (!testEmail.trim()) {
      alert('Enter a test recipient email address.');
      return;
    }
    if (!subject.trim()) {
      alert('Enter a subject line before sending a test.');
      return;
    }
    if (!body.trim()) {
      alert('Enter email content before sending a test.');
      return;
    }
    setIsSendingTest(true);
    try {
      await sendTestEmail({ to: testEmail.trim(), subject: subject.trim(), html: body });
      setFeedbackMessage(`Test email sent to ${testEmail.trim()}.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not send test email.');
    } finally {
      setIsSendingTest(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this campaign?')) {
      await deleteCampaign(id);
      reloadCampaigns();
    }
  }

  function clearFilters() {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedGroupFilter('all');
    setSortBy('newest');
  }

  function formatDateTime(value?: string | null) {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  function formatHistoryDateTime(value?: string | null) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function getEmailStatus(campaign: CampaignDisplay) {
    return (
      campaign.emailStatus ||
      campaign.status ||
      'inactive'
    );
  }

  function getDeliveryStatus(campaign: CampaignDisplay) {
    if (campaign.deliveryStatus) {
      return campaign.deliveryStatus;
    }

    if (campaign.sentAt) {
      return 'sent';
    }

    if (
      campaign.status === 'sending' ||
      campaign.status === 'scheduled'
    ) {
      return 'pending';
    }

    return 'not sent';
  }

  function getStatusClass(status: string) {
    const normalized = status.toLowerCase();

    if (
      normalized === 'active' ||
      normalized === 'sent' ||
      normalized === 'delivered'
    ) {
      return 'campaign-studio__status campaign-studio__status--success';
    }

    if (
      normalized === 'sending' ||
      normalized === 'scheduled' ||
      normalized === 'pending'
    ) {
      return 'campaign-studio__status campaign-studio__status--pending';
    }

    if (
      normalized === 'paused' ||
      normalized === 'inactive' ||
      normalized === 'not sent'
    ) {
      return 'campaign-studio__status campaign-studio__status--neutral';
    }

    if (
      normalized === 'failed' ||
      normalized === 'bounced' ||
      normalized === 'error'
    ) {
      return 'campaign-studio__status campaign-studio__status--danger';
    }

    return 'campaign-studio__status';
  }

  function handleEdit(campaign: CampaignDisplay) {
    setFeedbackMessage(null);
    navigate(`?edit=${encodeURIComponent(campaign.id)}`);
  }

  async function handleSendHistory(campaign: CampaignDisplay) {
    setHistoryCampaign(campaign);
    setHistoryEntries([]);
    setHistorySummary(null);
    setHistoryError(null);
    navigate(`?history=${encodeURIComponent(campaign.id)}`);

    try {
      const response = await getCampaignHistory(campaign.id);
      setHistoryEntries(response.entries);
      setHistorySummary(response.summary);
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : 'Campaign history is not available from the API.'
      );
    }
  }

  async function handleHistoryEmails(entry: CampaignHistoryEntry) {
    setHistoryEmailEntry(entry);
    setHistoryEmails([]);
    setHistoryEmailError(null);
    setHistoryEmailLoading(true);

    try {
      const emails = await getCampaignHistoryEmails(entry.id);
      setHistoryEmails(emails);
    } catch (error) {
      setHistoryEmailError(error instanceof Error ? error.message : 'Could not load emails for this send.');
    } finally {
      setHistoryEmailLoading(false);
    }
  }

  function closeHistoryEmails() {
    setHistoryEmailEntry(null);
    setHistoryEmails([]);
    setHistoryEmailError(null);
    setHistoryEmailLoading(false);
  }

  function closeOverlay() {
    if (historyEmailEntry) {
      closeHistoryEmails();
      return;
    }
    navigate({ search: '' }, { replace: true });
    setHistoryCampaign(null);
    setHistoryEntries([]);
    setHistorySummary(null);
    setHistoryError(null);
  }

  function handleExportExcel(campaign: CampaignDisplay) {
    const rows = [
      [
        'Campaign Name',
        'Created At',
        'Sent At',
        'Subject',
        'Target Group',
        'Email Status',
        'Delivery Status',
        'Recipients',
      ],
      [
        campaign.name,
        campaign.createdAt || '',
        campaign.sentAt || '',
        campaign.subject,
        campaign.targetGroup || 'All Subscribers',
        getEmailStatus(campaign),
        getDeliveryStatus(campaign),
        String(campaign.recipients ?? 0),
      ],
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const safeValue = String(value ?? '')
              .replace(/"/g, '""');

            return `"${safeValue}"`;
          })
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${campaign.name
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'campaign'}-export.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  }

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedStatus !== 'all' ||
    selectedGroupFilter !== 'all';

  return (
    <div className="campaign-studio">
      {/* Header */}
      <div className="campaign-studio__header">
        <div className="campaign-studio__header-content">
          <h1 className="campaign-studio__title">
            {isNewCampaign
              ? 'New campaign'
              : isEditing
                ? 'Edit campaign'
                : historyCampaign
                  ? 'Campaign history'
                  : 'Campaign Studio'}
          </h1>

          <p className="campaign-studio__intro">
            {isNewCampaign
              ? 'Create and configure a new campaign before sending it to your audience.'
              : isEditing
                ? 'Update the campaign details, save the changes, then schedule or send it.'
                : historyCampaign
                  ? 'Review the campaign status and delivery events returned by the API.'
                  : 'Build, preview and manage campaigns sent from mail.nca.ke. Target campaigns to specific subscriber groups or direct emails, filter active batches, or schedule new sends.'}
          </p>

          {selectedTemplate &&
            searchParams.get('templateId') && (
              <p className="campaign-studio__template-note">
                Starting from{' '}
                <strong>{selectedTemplate.name}</strong> —
                customize the content below, or{' '}
                <Link to="/templates">
                  choose a different template
                </Link>
                .
              </p>
            )}
        </div>

        {!isNewCampaign && !isEditing && !historyCampaign ? (
          <Link
            to="?new=1"
            className="btn btn--primary campaign-studio__new-btn"
          >
            <span className="campaign-studio__new-btn-icon">
              +
            </span>
            New Campaign
          </Link>
        ) : (
          <button
            type="button"
            className="btn campaign-studio__back-btn"
            onClick={closeOverlay}
          >
            ← Back to Campaigns
          </button>
        )}
      </div>

      {/* Feedback */}
      {feedbackMessage && !historyCampaign && (
        <div className="campaign-studio__alert">
          <span>✓ {feedbackMessage}</span>

          <button
            type="button"
            className="campaign-studio__alert-close"
            onClick={() => setFeedbackMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Campaign List */}
      {!isNewCampaign && !isEditing && !historyCampaign ? (
        <div className="campaign-studio__layout campaign-studio__layout--list">
          <Card
            className="campaign-studio__card"
            title={`All campaigns (${filteredCampaigns.length}${
              filteredCampaigns.length !== campaigns.length
                ? ` of ${campaigns.length}`
                : ''
            })`}
          >
            <div className="campaign-studio__controls">
              {/* Search */}
              <div className="campaign-studio__search-bar">
                <input
                  className="campaign-studio__search-input"
                  placeholder="Search campaigns by name, subject, or group…"
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(e.target.value)
                  }
                />

                {hasActiveFilters && (
                  <button
                    type="button"
                    className="campaign-studio__clear-btn"
                    onClick={clearFilters}
                    title="Clear all filters"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Filters */}
              <div className="campaign-studio__pills">
                {(
                  [
                    'all',
                    'draft',
                    'scheduled',
                    'sending',
                    'sent',
                    'paused',
                  ] as const
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`campaign-studio__pill ${
                      selectedStatus === st
                        ? 'campaign-studio__pill--active'
                        : ''
                    }`}
                    onClick={() => setSelectedStatus(st)}
                  >
                    <span>{st}</span>

                    <span className="campaign-studio__pill-badge">
                      {statusCounts[st] || 0}
                    </span>
                  </button>
                ))}
              </div>

              {/* Group + Sort */}
              <div className="campaign-studio__filter-row">
                <div className="campaign-studio__filter-control">
                  <label
                    className="campaign-studio__filter-label"
                    htmlFor="filter-group"
                  >
                    Group:
                  </label>

                  <select
                    id="filter-group"
                    className="campaign-studio__filter-select"
                    value={selectedGroupFilter}
                    onChange={(e) =>
                      setSelectedGroupFilter(
                        e.target.value
                      )
                    }
                  >
                    <option value="all">
                      All Groups
                    </option>

                    <option value="All Subscribers">
                      All Subscribers
                    </option>

                    {availableGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campaign-studio__filter-control campaign-studio__filter-control--sort">
                  <label
                    className="campaign-studio__filter-label"
                    htmlFor="sort-by"
                  >
                    Sort:
                  </label>

                  <select
                    id="sort-by"
                    className="campaign-studio__filter-select"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as
                          | 'newest'
                          | 'name'
                          | 'recipients'
                      )
                    }
                  >
                    <option value="newest">
                      Newest first
                    </option>

                    <option value="name">
                      Name (A-Z)
                    </option>

                    <option value="recipients">
                      Recipients (high to low)
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Campaign Table */}
            <div className="campaign-studio__table-wrap">
              <table className="data-table campaign-studio__table">
                <thead>
                  <tr>
                    <th>Created At</th>
                    <th>Sent At</th>
                    <th>Campaign Subject</th>
                    <th>Target Group</th>
                    <th>Email Status</th>
                    <th>Delivery Status</th>
                    <th className="campaign-studio__actions-cell">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCampaigns.map((rawCampaign) => {
                    const campaign =
                      rawCampaign as CampaignDisplay;

                    const emailStatus =
                      getEmailStatus(campaign);

                    const deliveryStatus =
                      getDeliveryStatus(campaign);

                    return (
                      <tr key={campaign.id}>
                        {/* Created */}
                        <td className="campaign-studio__date-cell">
                          {formatDateTime(
                            campaign.createdAt
                          )}
                        </td>

                        {/* Sent */}
                        <td className="campaign-studio__date-cell">
                          {formatDateTime(
                            campaign.sentAt
                          )}
                        </td>

                        {/* Subject */}
                        <td>
                          <span className="campaign-studio__campaign-name">
                            {campaign.name}
                          </span>

                          <span className="campaign-studio__campaign-subject">
                            {campaign.subject}
                          </span>
                        </td>

                        {/* Group */}
                        <td>
                          <span
                            className="campaign-studio__group-tag"
                            title={
                              campaign.targetGroup ||
                              'All Subscribers'
                            }
                          >
                            👥{' '}
                            {campaign.targetGroup ||
                              'All Subscribers'}
                          </span>
                        </td>

                        {/* Email Status */}
                        <td>
                          <span
                            className={getStatusClass(
                              emailStatus
                            )}
                          >
                            {emailStatus}
                          </span>
                        </td>

                        {/* Delivery Status */}
                        <td>
                          <span
                            className={getStatusClass(
                              deliveryStatus
                            )}
                          >
                            {deliveryStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="campaign-studio__actions-cell">
                          <div className="campaign-studio__row-actions">
                            <button
                              type="button"
                              className="campaign-studio__icon-btn"
                              title="Edit campaign"
                              aria-label="Edit campaign"
                              onClick={() =>
                                handleEdit(campaign)
                              }
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              className="campaign-studio__icon-btn"
                              title="Export to Excel"
                              aria-label="Export to Excel"
                              onClick={() =>
                                handleExportExcel(
                                  campaign
                                )
                              }
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                                <path d="M14 2v6h6" />
                                <path d="M8 13l4 4" />
                                <path d="m12 13-4 4" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              className="campaign-studio__icon-btn"
                              title="Send history"
                              aria-label="Send history"
                              onClick={() =>
                                handleSendHistory(
                                  campaign
                                )
                              }
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 12a9 9 0 1 0 3-6.7" />
                                <path d="M3 4v5h5" />
                                <path d="M12 7v5l3 2" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              className="campaign-studio__icon-btn campaign-studio__icon-btn--danger"
                              title="Delete campaign"
                              aria-label="Delete campaign"
                              onClick={() =>
                                handleDelete(campaign.id)
                              }
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v5" />
                                <path d="M14 11v5" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredCampaigns.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="empty-state"
                      >
                        {hasActiveFilters ? (
                          <>
                            No campaigns match your
                            search/filters.{' '}
                            <button
                              type="button"
                              onClick={clearFilters}
                              className="campaign-studio__reset-link"
                            >
                              Reset filters
                            </button>
                          </>
                        ) : (
                          <div className="campaign-studio__empty">
                            <div className="campaign-studio__empty-icon">
                              ✉
                            </div>

                            <strong>
                              No campaigns yet
                            </strong>

                            <span>
                              Create your first campaign to
                              start reaching your audience.
                            </span>

                            <Link
                              to="?new=1"
                              className="btn btn--primary"
                            >
                              + Create Campaign
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        /* New / Edit Campaign Page */
        <div className="campaign-studio__new-page">
          <Card
            className="campaign-studio__card campaign-studio__new-card"
            title={isEditing ? 'Edit campaign' : 'New campaign'}
            eyebrow={isEditing ? 'Draft / edit' : 'Draft'}
          >
            <div className="campaign-studio__new-page-intro">
              <div className="campaign-studio__new-page-icon">
                ✉
              </div>

              <div>
                <h2>{isEditing ? 'Edit campaign' : 'Create a new campaign'}</h2>

                <p>
                  Configure your campaign details, audience and
                  template. Save the draft first, then continue
                  editing or submit it for sending/scheduling.
                </p>
              </div>
            </div>

            <div className="campaign-studio__form">
              {isLoadingEditor && (
                <div className="campaign-studio__alert">Loading campaign from the API…</div>
              )}
              <div className="field">
                <label htmlFor="cname">
                  Campaign name
                </label>

                <input
                  id="cname"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="e.g. Contractor Registration Renewal Notice"
                />
              </div>

              <div className="field">
                <label htmlFor="subj">
                  Subject line
                </label>

                <input
                  id="subj"
                  value={subject}
                  onChange={(e) =>
                    setSubject(e.target.value)
                  }
                  placeholder="What recipients see in their inbox"
                />
              </div>

              <div className="field">
                <label htmlFor="target-group">
                  Target Audience / Group
                </label>

                <select
                  id="target-group"
                  value={targetGroup}
                  onChange={(e) =>
                    setTargetGroup(e.target.value)
                  }
                >
                  <option value="All Subscribers">
                    All Subscribers (Whole Audience)
                  </option>

                  {availableGroups.map((g) => (
                    <option key={g} value={g}>
                      Group: {g}
                    </option>
                  ))}

                  <option value="__custom__">
                    + Direct Email or Custom Group Name…
                  </option>
                </select>
              </div>

              {targetGroup === '__custom__' && (
                <div className="field campaign-studio__custom-target">
                  <label htmlFor="custom-target">
                    Enter Email or Custom Group
                  </label>

                  <input
                    id="custom-target"
                    placeholder="e.g. contractor@nca.go.ke or VIP Contractors"
                    value={customTarget}
                    onChange={(e) =>
                      setCustomTarget(e.target.value)
                    }
                  />

                  <span className="campaign-studio__helper">
                    You can send directly to a single email
                    address or define a custom segment.
                  </span>
                </div>
              )}

              {recipientEstimate !== null && (
                <div className="campaign-studio__audience-preview">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>

                  <span>
                    Estimated Audience:{' '}
                    <strong>
                      {recipientEstimate.toLocaleString()}
                    </strong>{' '}
                    recipient
                    {recipientEstimate === 1
                      ? ''
                      : 's'}
                  </span>
                </div>
              )}

              <div className="campaign-studio__content-choice">
                <span className="campaign-studio__section-label">Email content</span>
                <div className="campaign-studio__choice-tabs">
                  <button type="button" className={`btn ${contentMode === 'text' ? 'btn--primary' : ''}`} onClick={() => setContentMode('text')}>Write from scratch</button>
                  <button type="button" className={`btn ${contentMode === 'template' ? 'btn--primary' : ''}`} onClick={() => setContentMode('template')}>Use a template</button>
                </div>
              </div>

              {contentMode === 'template' && (
                <div className="field">
                  <label htmlFor="tpl">Template</label>
                  <select id="tpl" value={templateId} onChange={async (e) => {
                    const id = e.target.value;
                    setTemplateId(id);
                    if (!id) return;
                    try {
                      const t = await getTemplate(id);
                      setName(t.name);
                      setSubject(t.subjectPreview);
                      setBody(htmlToPlainText(t.bodyPreview));
                    } catch (error) {
                      alert(error instanceof Error ? error.message : 'Could not load the selected template.');
                    }
                  }}>
                    <option value="">Select a template…</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {selectedTemplate && <div className="campaign-studio__template-preview"><strong>{selectedTemplate.name}</strong><p>Template content has been loaded into the editable email body below. Campaign name and subject can also be changed.</p></div>}
                  <div className="campaign-studio__template-links">
                    {templateId && <Link to={`/templates?preview=${encodeURIComponent(templateId)}`}>Preview selected template</Link>}
                    <Link to="/templates">Browse templates</Link>
                  </div>
                </div>
              )}

              <div className="field">
                <label htmlFor="campaign-body">Email content {contentMode === 'template' ? '(editable template)' : ''}</label>
                <textarea id="campaign-body" rows={16} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your email here…" />
              </div>

              <div className="campaign-studio__sender-grid">
                <div className="field">
                  <label htmlFor="from-email">From email</label>
                  <input id="from-email" type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="news@example.com" />
                </div>
                <div className="field">
                  <label htmlFor="sender-name">Sender</label>
                  <input id="sender-name" value={sender} onChange={(e) => setSender(e.target.value)} placeholder="Example Co" />
                </div>
              </div>

              <div className="campaign-studio__checkbox-row">
                <input
                  id="ab"
                  type="checkbox"
                  checked={abTest}
                  onChange={(e) =>
                    setAbTest(e.target.checked)
                  }
                />

                <label htmlFor="ab">
                  Run an A/B test on subject line
                </label>
              </div>

              <div className="campaign-studio__actions campaign-studio__composer-actions">
                <div className="campaign-studio__test-row">
                  <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="Test recipient email" aria-label="Test recipient email" />
                  <button className="btn" type="button" onClick={handleSendTest} disabled={isSendingTest || isSaving || isSubmittingCampaign}>{isSendingTest ? 'Sending…' : 'Send Test Email'}</button>
                </div>

                <div className="campaign-studio__action-row">
                  <button className="btn btn--primary" type="button" onClick={handleSaveDraft} disabled={isSaving || isLoadingEditor || isSubmittingCampaign}>{isSaving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Draft'}</button>
                  <button className="btn" type="button" onClick={closeOverlay} disabled={isSaving || isSubmittingCampaign}>Cancel</button>
                  <div className="campaign-studio__schedule-control">
                    <select value={scheduleChoice} onChange={(e) => setScheduleChoice(e.target.value as typeof scheduleChoice)} aria-label="Schedule option">
                      <option value="">Schedule…</option>
                      <option value="once">Once</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="custom">Custom</option>
                    </select>
                    {scheduleChoice && (
                      <>
                        <input type="date" value={scheduleStartDate} onChange={(e) => setScheduleStartDate(e.target.value)} aria-label={scheduleChoice === 'once' ? 'Schedule date' : 'Schedule start date'} title={scheduleChoice === 'once' ? 'Date' : 'Start date'} />
                        {scheduleChoice !== 'once' && (
                          <input type="date" value={scheduleEndDate} onChange={(e) => setScheduleEndDate(e.target.value)} aria-label="Schedule end date" title="End date" />
                        )}
                        <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} aria-label="Schedule time" title="Time" />
                      </>
                    )}
                    <button className="btn" type="button" onClick={handleSchedule} disabled={isSaving || isSubmittingCampaign || !scheduleChoice}>Schedule</button>
                  </div>
                  <button className="btn btn--primary" type="button" onClick={handleSendNow} disabled={isSaving || isSubmittingCampaign}>Send Now</button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showSendPreview && (
        <div className="campaign-studio__history-overlay" role="dialog" aria-modal="true" aria-labelledby="campaign-send-preview-title">
          <div className="campaign-studio__history-dialog">
            <div className="campaign-studio__history-header">
              <div>
                <span className="campaign-studio__eyebrow">Confirmation</span>
                <h2 id="campaign-send-preview-title">Review before {pendingAction === 'schedule' ? 'scheduling' : 'sending'}</h2>
                <p>Check the final details before the API request is sent.</p>
              </div>
              <button type="button" className="campaign-studio__alert-close" onClick={cancelPendingAction} aria-label="Close preview">×</button>
            </div>
            <div className="campaign-studio__history-summary">
              <span>Campaign: <strong>{name}</strong></span>
              <span>Subject: <strong>{subject}</strong></span>
              <span>Audience: <strong>{targetGroup === '__custom__' ? customTarget : targetGroup}</strong></span>
              <span>Recipients: <strong>{(recipientEstimate ?? 0).toLocaleString()}</strong></span>
              {pendingAction === 'schedule' && scheduleChoice && <span>Schedule: <strong>{scheduleChoice}</strong></span>}
              {pendingAction === 'schedule' && scheduleStartDate && <span>Start: <strong>{scheduleStartDate} {scheduleTime}</strong></span>}
              {pendingAction === 'schedule' && scheduleChoice !== 'once' && scheduleEndDate && <span>End: <strong>{scheduleEndDate}</strong></span>}
            </div>
            <div className="campaign-studio__template-preview">
              <strong>Email preview</strong>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{body}</div>
            </div>
            <div className="campaign-studio__action-row" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
              <button className="btn" type="button" onClick={cancelPendingAction} disabled={isSubmittingCampaign}>Back to edit</button>
              <button className="btn btn--primary" type="button" onClick={confirmPendingAction} disabled={isSubmittingCampaign}>{isSubmittingCampaign ? 'Processing…' : pendingAction === 'schedule' ? 'Confirm & Schedule' : 'Confirm & Send Now'}</button>
            </div>
          </div>
        </div>
      )}

      {historyCampaign && (
        <div className="campaign-studio__history-overlay" role="dialog" aria-modal="true" aria-labelledby="campaign-history-title">
          <div className="campaign-studio__history-dialog campaign-studio__history-dialog--wide">
            <div className="campaign-studio__history-header campaign-studio__history-header--purple">
              <div className="campaign-studio__history-header-content">
                <span className="campaign-studio__eyebrow">↻</span>
                <div>
                  <h2 id="campaign-history-title">Send History</h2>
                  <p>{historyCampaign.name}</p>
                </div>
              </div>
              <button type="button" className="campaign-studio__alert-close campaign-studio__history-close" onClick={closeOverlay} aria-label="Close history">×</button>
            </div>

            {!historyError && historySummary && (
              <div className="campaign-studio__history-stats">
                <div><span>Total Sends</span><strong>{historySummary.totalSends.toLocaleString()}</strong></div>
                <div><span>Total Blasted</span><strong>{historySummary.totalBlasted.toLocaleString()}</strong></div>
                <div><span>Total Sent</span><strong className="is-green">{historySummary.totalSent.toLocaleString()}</strong></div>
                <div><span>Total Bounced</span><strong>{historySummary.totalBounced.toLocaleString()}</strong></div>
                <div><span>Total Opened</span><strong className="is-blue">{historySummary.totalOpened.toLocaleString()}</strong></div>
                <div><span>Total Clicked</span><strong className="is-purple">{historySummary.totalClicked.toLocaleString()}</strong></div>
              </div>
            )}

            {historyError ? (
              <div className="campaign-studio__alert campaign-studio__history-body-message">
                <strong>History API response unavailable.</strong> {historyError}
              </div>
            ) : historyEntries.length === 0 ? (
              <div className="campaign-studio__history-empty">Loading history…</div>
            ) : (
              <div className="campaign-studio__table-wrap campaign-studio__history-table-wrap">
                <table className="data-table campaign-studio__table campaign-studio__history-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Sent At</th>
                      <th>Status</th>
                      <th>List</th>
                      <th>Blasted</th>
                      <th>Sent</th>
                      <th>Bounced</th>
                      <th>Clicked</th>
                      <th>Opened</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyEntries.map((entry) => (
                      <tr key={String(entry.id)}>
                        <td>{entry.id}</td>
                        <td>{formatHistoryDateTime(entry.timestamp)}</td>
                        <td><span className={getStatusClass(entry.status)}>{entry.status}</span></td>
                        <td>{entry.listName || historyCampaign.targetGroup || '—'}</td>
                        <td><span className="campaign-studio__metric-pill">{entry.blasted.toLocaleString()}</span></td>
                        <td><span className="campaign-studio__metric-pill campaign-studio__metric-pill--green">{entry.sent.toLocaleString()}</span></td>
                        <td><span className="campaign-studio__metric-pill">{entry.bounced.toLocaleString()}</span></td>
                        <td><span className="campaign-studio__metric-pill campaign-studio__metric-pill--purple">{entry.clicked.toLocaleString()}</span></td>
                        <td><span className="campaign-studio__metric-pill campaign-studio__metric-pill--blue">{entry.opened.toLocaleString()}</span></td>
                        <td className="campaign-studio__actions-cell">
                          <button
                            type="button"
                            className="campaign-studio__icon-btn"
                            title={`View emails for send #${entry.id}`}
                            aria-label={`View emails for send #${entry.id}`}
                            onClick={() => handleHistoryEmails(entry)}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M3.5 6.5h17v11h-17z" />
                              <path d="m4 7 8 6 8-6" />
                              <path d="M15 4.5h4" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {historyEmailEntry && (
            <div className="campaign-studio__history-overlay campaign-studio__history-overlay--nested" role="dialog" aria-modal="true" aria-labelledby="campaign-email-history-title">
              <div className="campaign-studio__history-dialog campaign-studio__history-dialog--email">
                <div className="campaign-studio__history-header campaign-studio__history-header--purple">
                  <div className="campaign-studio__history-header-content">
                    <span className="campaign-studio__eyebrow">✉</span>
                    <div>
                      <h2 id="campaign-email-history-title">Emails for Send #{historyEmailEntry.id}</h2>
                    </div>
                  </div>
                  <button type="button" className="campaign-studio__alert-close campaign-studio__history-close" onClick={closeHistoryEmails} aria-label="Close email details">×</button>
                </div>

                {historyEmailError ? (
                  <div className="campaign-studio__alert campaign-studio__history-body-message">
                    <strong>Email history unavailable.</strong> {historyEmailError}
                  </div>
                ) : historyEmailLoading ? (
                  <div className="campaign-studio__history-empty">Loading emails…</div>
                ) : historyEmails.length === 0 ? (
                  <div className="campaign-studio__history-empty">No emails found for this send.</div>
                ) : (
                  <div className="campaign-studio__table-wrap campaign-studio__history-table-wrap">
                    <table className="data-table campaign-studio__table campaign-studio__history-table">
                      <thead>
                        <tr><th>Recipient</th><th>Sent</th><th>Delivered</th><th>Opened</th><th>Clicked</th></tr>
                      </thead>
                      <tbody>
                        {historyEmails.map((email, index) => (
                          <tr key={email.id == null ? `${email.recipient}-${index}` : String(email.id)}>
                            <td>{email.recipient}</td>
                            <td>{email.sent}</td>
                            <td>{email.delivered}</td>
                            <td>{email.opened}</td>
                            <td>{email.clicked}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}