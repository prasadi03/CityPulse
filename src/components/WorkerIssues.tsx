import React, { useMemo, useState } from 'react';
import {
  Search,
  Send,
  Calendar,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import {
  CityIssue,
  IssuePriority,
  IssueStatus,
  UserSession,
} from '../types/citypulse';
import {
  EmptyState,
  ErrorState,
  IssueStatusBadge,
  PriorityBadge,
} from './StatusPrimitives';
import { TranslatableText } from './TranslatableText';
import { useAppLanguage } from '../i18n';
import {
  areaMatchesSearch,
  formatNumber,
  formatRelativeTimeText,
  getAreaLabel,
  getCategoryLabel,
  getDepartmentLabel,
  getZoneLabel,
  localizeDigits,
} from '../i18n/formatters';

interface WorkerIssuesProps {
  session: UserSession;
  initialIssueId?: string | null;
}

export const WorkerIssues: React.FC<WorkerIssuesProps> = ({
  session,
  initialIssueId = null,
}) => {
  const { language, useNativeNumerals, t } = useAppLanguage();

  if (session.role !== 'worker') {
    return <ErrorState message={t('errors:unauthorizedWorker')} />;
  }

  const allDeptIssues = dataService.getWorkerIssues(session);
  const areas = dataService.getAreas();
  const deptLabel = session.departmentId
    ? getDepartmentLabel(session.departmentId, t)
    : session.department || '';

  const [statusFilter, setStatusFilter] = useState<'All' | IssueStatus>('All');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'All' | IssuePriority>(
    'All'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialIssueId ?? allDeptIssues[0]?.id ?? null
  );

  // Action states for selected issue
  const [replyText, setReplyText] = useState('');
  const [schedDate, setSchedDate] = useState('2026-11-17');
  const [schedTime, setSchedTime] = useState('14:00');
  const [schedEta, setSchedEta] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  React.useEffect(() => {
    if (initialIssueId) {
      setSelectedId(initialIssueId);
    }
  }, [initialIssueId]);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allDeptIssues.filter((issue) => {
      if (statusFilter !== 'All' && issue.status !== statusFilter) return false;
      if (areaFilter !== 'all' && issue.areaId !== areaFilter) return false;
      if (priorityFilter !== 'All' && issue.priority !== priorityFilter)
        return false;
      if (q) {
        const matchesId = issue.id.toLowerCase().includes(q);
        const matchesTitle = issue.title.toLowerCase().includes(q);
        const matchesArea = areaMatchesSearch(issue.areaId, q);
        const matchesCategory =
          issue.category.toLowerCase().includes(q) ||
          getCategoryLabel(issue.category, t).toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesArea && !matchesCategory) {
          return false;
        }
      }
      return true;
    });
  }, [allDeptIssues, statusFilter, areaFilter, priorityFilter, searchQuery, t]);

  const activeIssue: CityIssue | null =
    filteredIssues.find((i) => i.id === selectedId) ??
    filteredIssues[0] ??
    null;

  const notifyAction = (msg: string) => {
    setFeedbackMsg(msg);
    window.setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const getStatusLabel = (st: IssueStatus) => {
    if (st === 'Waiting') return t('common:status.waiting');
    if (st === 'Ongoing') return t('common:status.ongoing');
    return t('common:status.solved');
  };

  const handleStatusChange = (nextStatus: IssueStatus) => {
    if (!activeIssue) return;
    const res = dataService.updateIssueAsWorker(session, activeIssue.id, {
      status: nextStatus,
    });
    if (res.ok) {
      notifyAction(
        t('worker:toastStatusChanged', { status: getStatusLabel(nextStatus) })
      );
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIssue || !replyText.trim()) return;
    const res = dataService.updateIssueAsWorker(session, activeIssue.id, {
      reply: replyText,
    });
    if (res.ok) {
      setReplyText('');
      notifyAction(t('worker:toastReplySent'));
    }
  };

  const handleScheduleWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIssue || !schedDate || !schedTime) return;
    const res = dataService.updateIssueAsWorker(session, activeIssue.id, {
      schedule: {
        date: schedDate,
        time: schedTime,
        etaNote: schedEta.trim() || undefined,
      },
    });
    if (res.ok) {
      setSchedEta('');
      notifyAction(t('worker:toastScheduled'));
    }
  };

  const handleAddInternalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIssue || !internalNoteText.trim()) return;
    const res = dataService.updateIssueAsWorker(session, activeIssue.id, {
      internalNote: internalNoteText,
    });
    if (res.ok) {
      setInternalNoteText('');
      notifyAction(t('worker:toastNoteSaved'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#5A4A42]">
            {t('worker:issuesTitle', { department: deptLabel })}
          </h1>
          <p className="text-sm text-[#7A6A62]">
            {localizeDigits(
              t('worker:issuesSubtitle', {
                department: deptLabel,
                shown: filteredIssues.length,
                total: allDeptIssues.length,
              }),
              language,
              useNativeNumerals
            )}
          </p>
        </div>

        {feedbackMsg && (
          <div className="h-9 px-4 rounded-full bg-[#EAF8F0] text-[#0D3B20] text-xs font-semibold inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#5FCB8A] shrink-0" aria-hidden="true" />
            <span>{feedbackMsg}</span>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="cp-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['All', 'Waiting', 'Ongoing', 'Solved'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`h-9 px-3.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#FF9B71] border-[#FF9B71] text-[#5A4A42]'
                  : 'bg-[#FFF9F2] border-[#F0E6DF] text-[#7A6A62]'
              }`}
            >
              {st === 'All' ? t('worker:filterAll') : getStatusLabel(st)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label={t('worker:filterAreaAria')}
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="cp-input px-3 text-sm cursor-pointer"
          >
            <option value="all">{t('common:allAreas')}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {getAreaLabel(a.id, language, a.name)}
              </option>
            ))}
          </select>

          <select
            aria-label={t('worker:filterPriorityAria')}
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as 'All' | IssuePriority)
            }
            className="cp-input px-3 text-sm cursor-pointer"
          >
            <option value="All">{t('worker:allPriorities')}</option>
            <option value="Urgent">{t('common:priority.urgent')}</option>
            <option value="High">{t('common:priority.high')}</option>
            <option value="Medium">{t('common:priority.medium')}</option>
            <option value="Low">{t('common:priority.low')}</option>
          </select>

          <div className="relative flex-1 sm:w-56">
            <Search
              className="w-4 h-4 text-[#9C8B82] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('worker:searchPlaceholder')}
              className="cp-input w-full pl-9 pr-3 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Table + Detail Panel */}
      {filteredIssues.length === 0 ? (
        <EmptyState
          title={t('worker:emptyTitle')}
          description={t('worker:emptyDesc')}
          actionLabel={t('common:actions.resetFilters')}
          onAction={() => {
            setStatusFilter('All');
            setAreaFilter('all');
            setPriorityFilter('All');
            setSearchQuery('');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Compact Issues Table */}
          <div className="lg:col-span-7 cp-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#F5EDE6] bg-[#FFF9F2] text-xs font-semibold text-[#7A6A62]">
                    <th className="py-3 pl-4 pr-2">{t('worker:colId')}</th>
                    <th className="py-3 px-2">{t('worker:colCategoryArea')}</th>
                    <th className="py-3 px-2">{t('worker:colPriority')}</th>
                    <th className="py-3 px-2 text-right">{t('worker:colAge')}</th>
                    <th className="py-3 pl-2 pr-4 text-right">{t('worker:colStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5EDE6]">
                  {filteredIssues.map((issue) => {
                    const selected = activeIssue?.id === issue.id;
                    return (
                      <tr
                        key={issue.id}
                        onClick={() => setSelectedId(issue.id)}
                        className={`cursor-pointer transition-colors ${
                          selected ? 'bg-[#FFF0E6]/65' : 'hover:bg-[#FFF9F2]'
                        }`}
                      >
                        <td className="py-3 pl-4 pr-2 font-bold text-[#5A4A42] tabular-nums whitespace-nowrap">
                          {issue.id}
                        </td>
                        <td className="py-3 px-2">
                          <div className="font-semibold text-[#5A4A42]">
                            {getCategoryLabel(issue.category, t)}
                          </div>
                          <div className="text-xs text-[#7A6A62]">
                            {getAreaLabel(issue.areaId, language, issue.areaName)}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <PriorityBadge priority={issue.priority} />
                        </td>
                        <td className="py-3 px-2 text-right text-xs font-semibold text-[#7A6A62] tabular-nums whitespace-nowrap">
                          {formatNumber(
                            issue.ageHours,
                            language,
                            useNativeNumerals
                          )}
                          {localizeDigits(
                            t('worker:ageHoursShort', {
                              count: issue.ageHours,
                            }).replace(String(issue.ageHours), ''),
                            language,
                            useNativeNumerals
                          )}
                        </td>
                        <td className="py-3 pl-2 pr-4 text-right">
                          <IssueStatusBadge
                            status={issue.status}
                            scheduled={issue.scheduled}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Issue Detail & Worker Actions Panel */}
          <div className="lg:col-span-5">
            {activeIssue && (
              <div className="cp-card p-5 space-y-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#7A6A62] tabular-nums">
                      {activeIssue.id} ·{' '}
                      {getAreaLabel(
                        activeIssue.areaId,
                        language,
                        activeIssue.areaName
                      )}{' '}
                      ({getZoneLabel(activeIssue.zone, language)})
                    </div>
                    <h2 className="text-lg font-bold text-[#5A4A42] mt-0.5">
                      <TranslatableText text={activeIssue.title} autoTranslate />
                    </h2>
                    <div className="text-xs text-[#7A6A62] mt-1">
                      {t('worker:reportedBy')}{' '}
                      <strong className="text-[#5A4A42]">
                        {activeIssue.reporterName}
                      </strong>{' '}
                      ·{' '}
                      {formatRelativeTimeText(
                        activeIssue.createdAt,
                        t,
                        language,
                        useNativeNumerals
                      )}
                    </div>
                  </div>
                  <IssueStatusBadge
                    status={activeIssue.status}
                    scheduled={activeIssue.scheduled}
                  />
                </div>

                <p className="text-sm text-[#5A4A42] leading-relaxed bg-[#FFF9F2] p-3.5 rounded-xl border border-[#F5EDE6]">
                  <TranslatableText
                    text={activeIssue.description}
                    autoTranslate
                  />
                </p>

                {activeIssue.photoDataUrl && (
                  <img
                    src={activeIssue.photoDataUrl}
                    alt={t('worker:citizenAttachmentAlt')}
                    className="w-full max-h-40 object-cover rounded-xl border border-[#F0E6DF]"
                  />
                )}

                {/* Action 2: Status Dropdown */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="worker-status-select"
                    className="block text-xs font-bold text-[#5A4A42]"
                  >
                    {t('worker:changeStatusLabel')}
                  </label>
                  <select
                    id="worker-status-select"
                    value={activeIssue.status}
                    onChange={(e) =>
                      handleStatusChange(e.target.value as IssueStatus)
                    }
                    className="cp-input w-full px-3.5 text-sm font-semibold cursor-pointer"
                  >
                    <option value="Waiting">{t('common:status.waiting')}</option>
                    <option value="Ongoing">{t('common:status.ongoing')}</option>
                    <option value="Solved">{t('common:status.solved')}</option>
                  </select>
                </div>

                {/* Action 3: Schedule Work */}
                <form
                  onSubmit={handleScheduleWork}
                  className="rounded-xl bg-[#E8F4FD]/45 border border-[#5BB8F5]/30 p-3.5 space-y-2.5"
                >
                  <div className="text-xs font-bold text-[#0B4F78] inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('worker:scheduleTitle')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      aria-label={t('worker:scheduleDateAria')}
                      value={schedDate}
                      onChange={(e) => setSchedDate(e.target.value)}
                      className="cp-input px-2.5 text-xs"
                    />
                    <input
                      type="time"
                      aria-label={t('worker:scheduleTimeAria')}
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                      className="cp-input px-2.5 text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={schedEta}
                      onChange={(e) => setSchedEta(e.target.value)}
                      placeholder={t('worker:etaPlaceholder')}
                      className="cp-input flex-1 px-3 text-xs"
                    />
                    <button
                      type="submit"
                      className="h-11 px-4 rounded-full bg-[#5BB8F5] text-[#0B3552] text-xs font-bold whitespace-nowrap cursor-pointer"
                    >
                      {t('worker:scheduleBtn')}
                    </button>
                  </div>
                </form>

                {/* Action 1: Reply to Citizen */}
                <form onSubmit={handleSendReply} className="space-y-1.5">
                  <label
                    htmlFor="worker-reply-input"
                    className="block text-xs font-bold text-[#5A4A42]"
                  >
                    {t('worker:publicReplyLabel')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="worker-reply-input"
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={t('worker:replyPlaceholder')}
                      className="cp-input flex-1 px-3 text-sm"
                    />
                    <button
                      type="submit"
                      className="h-11 px-4 rounded-full bg-[#FF9B71] hover:bg-[#FF8456] text-[#5A4A42] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t('common:actions.reply')}</span>
                    </button>
                  </div>
                </form>

                {/* Public Timeline */}
                <div className="space-y-2 pt-2 border-t border-[#F5EDE6]">
                  <div className="text-xs font-bold text-[#5A4A42]">
                    {t('worker:activityTimeline')}
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {activeIssue.timeline.map((ev) => (
                      <div key={ev.id} className="text-xs space-y-0.5">
                        <div className="flex justify-between gap-2">
                          <span className="font-semibold text-[#5A4A42]">
                            {ev.actorName}
                          </span>
                          <span className="text-[#7A6A62] tabular-nums">
                            {formatRelativeTimeText(
                              ev.timestamp,
                              t,
                              language,
                              useNativeNumerals
                            )}
                          </span>
                        </div>
                        <p className="text-[#7A6A62]">
                          <TranslatableText text={ev.message} autoTranslate />
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action 4: Internal Notes (Worker-only) */}
                <div className="rounded-xl bg-[#FFF8D6]/55 border border-[#FFC93C]/40 p-3.5 space-y-2.5">
                  <div className="text-xs font-bold text-[#8A5D00] inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('worker:internalNotesTitle')}</span>
                  </div>

                  {activeIssue.internalNotes.length > 0 && (
                    <div className="space-y-1.5">
                      {activeIssue.internalNotes.map((n) => (
                        <div
                          key={n.id}
                          className="text-xs text-[#5A4A42] bg-white/80 rounded-lg px-2.5 py-1.5"
                        >
                          <span className="font-semibold">{n.authorName}: </span>
                          <span>
                            <TranslatableText text={n.text} autoTranslate />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleAddInternalNote} className="flex gap-2">
                    <input
                      type="text"
                      value={internalNoteText}
                      onChange={(e) => setInternalNoteText(e.target.value)}
                      placeholder={t('worker:internalNotePlaceholder')}
                      className="cp-input flex-1 px-3 text-xs"
                    />
                    <button
                      type="submit"
                      className="h-11 px-3.5 rounded-full bg-white border border-[#F0E6DF] hover:bg-[#FFF0E6] text-xs font-bold text-[#5A4A42] cursor-pointer whitespace-nowrap"
                    >
                      {t('worker:saveNote')}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
