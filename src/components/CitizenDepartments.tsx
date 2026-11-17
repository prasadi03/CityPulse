import React, { useState } from 'react';
import { Calendar, Megaphone } from 'lucide-react';
import { dataService } from '../services/dataService';
import { DepartmentId } from '../types/citypulse';
import {
  DepartmentBadge,
  EmptyState,
  IssueStatusBadge,
  PriorityBadge,
} from './StatusPrimitives';
import { TranslatableText } from './TranslatableText';
import { useAppLanguage } from '../i18n';
import {
  formatAffectedAreasList,
  formatDateLocalized,
  formatNumber,
  formatRelativeTimeText,
  formatTimeLocalized,
  getAreaLabel,
  getDepartmentLabel,
  getZoneLabel,
  localizeDigits,
} from '../i18n/formatters';

export const CitizenDepartments: React.FC = () => {
  const { language, useNativeNumerals, t } = useAppLanguage();
  const [selectedDept, setSelectedDept] = useState<DepartmentId | 'all'>('all');

  const departments = dataService.getDepartmentList();
  const summaries = dataService.getDepartmentSummaries();
  const announcements = dataService.getAnnouncements(selectedDept);
  const publicIssues = dataService.getPublicIssues(selectedDept);

  const visibleSummaries =
    selectedDept === 'all'
      ? summaries
      : summaries.filter((s) => s.id === selectedDept);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#5A4A42]">
          {t('departments:title')}
        </h1>
        <p className="text-sm text-[#7A6A62] mt-0.5">
          {t('departments:subtitle')}
        </p>
      </div>

      {/* Department Filter Chips Row */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label={t('departments:filterAria')}
      >
        <button
          type="button"
          onClick={() => setSelectedDept('all')}
          className={`h-10 px-4 rounded-full text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            selectedDept === 'all'
              ? 'bg-[#FF9B71] text-[#5A4A42]'
              : 'bg-white border border-[#F0E6DF] text-[#7A6A62] hover:bg-[#FFF0E6]'
          }`}
        >
          {t('departments:allDepartments')}
        </button>

        {departments.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setSelectedDept(d.id)}
            className={`h-10 px-4 rounded-full text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              selectedDept === d.id
                ? 'bg-[#FF9B71] text-[#5A4A42]'
                : 'bg-white border border-[#F0E6DF] text-[#7A6A62] hover:bg-[#FFF0E6]'
            }`}
          >
            {getDepartmentLabel(d.id, t, true)}
          </button>
        ))}
      </div>

      {/* Department Status Summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleSummaries.map((sum) => (
          <div key={sum.id} className="cp-card p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <DepartmentBadge
                departmentId={sum.id}
                label={getDepartmentLabel(sum.id, t)}
              />
              <span className="text-sm font-bold text-[#5A4A42] tabular-nums">
                {formatNumber(sum.operationalPct, language, useNativeNumerals)}%
              </span>
            </div>
            <div className="text-sm font-semibold text-[#5A4A42]">
              {sum.statusLabel.toLowerCase().includes('elevated')
                ? t('departments:elevatedLoad')
                : t('departments:operatingSmoothly')}
            </div>
            <div className="flex items-center justify-between text-xs text-[#7A6A62] pt-2 border-t border-[#F5EDE6] tabular-nums gap-2">
              <span>
                {localizeDigits(
                  t('departments:activeCrews', { count: sum.activeCrews }),
                  language,
                  useNativeNumerals
                )}
              </span>
              <span>
                {localizeDigits(
                  t('departments:avgResolution', {
                    hours: sum.avgResolutionHours,
                  }),
                  language,
                  useNativeNumerals
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Announcements: Planned Outages & Water Supply Schedules */}
      <div className="cp-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[#964825] shrink-0" aria-hidden="true" />
          <h2 className="text-lg font-bold text-[#5A4A42]">
            {t('departments:announcementsTitle')}
          </h2>
        </div>

        {announcements.length === 0 ? (
          <EmptyState
            title={t('departments:noAnnouncementsTitle')}
            description={t('departments:noAnnouncementsDesc')}
          />
        ) : (
          <div className="divide-y divide-[#F5EDE6]">
            {announcements.map((ann) => (
              <div key={ann.id} className="py-4 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <DepartmentBadge
                    departmentId={ann.departmentId}
                    label={getDepartmentLabel(ann.departmentId, t)}
                  />
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5A4A42]">
                    <Calendar className="w-3.5 h-3.5 text-[#964825]" aria-hidden="true" />
                    {localizeDigits(ann.schedule, language, useNativeNumerals)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#5A4A42]">
                  <TranslatableText text={ann.title} autoTranslate={false} />
                </h3>
                <p className="text-sm text-[#7A6A62]">
                  <TranslatableText text={ann.summary} autoTranslate={false} />
                </p>
                <div className="text-xs font-medium text-[#7A6A62]">
                  {t('departments:affectedAreas')}{' '}
                  <strong className="text-[#5A4A42]">
                    {formatAffectedAreasList(ann.affectedAreas, language)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Public Issues */}
      <div className="cp-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#5A4A42]">
            {localizeDigits(
              t('departments:publicIssuesTitle', {
                count: publicIssues.length,
              }),
              language,
              useNativeNumerals
            )}
          </h2>
        </div>

        <div className="divide-y divide-[#F5EDE6]">
          {publicIssues.slice(0, 12).map((issue) => (
            <div
              key={issue.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#7A6A62] tabular-nums">
                    {issue.id}
                  </span>
                  <DepartmentBadge
                    departmentId={issue.departmentId}
                    label={getDepartmentLabel(issue.departmentId, t, true)}
                  />
                  <PriorityBadge priority={issue.priority} />
                </div>
                <div className="text-sm font-bold text-[#5A4A42]">
                  <TranslatableText text={issue.title} autoTranslate />
                </div>
                <div className="text-xs text-[#7A6A62]">
                  {getAreaLabel(issue.areaId, language, issue.areaName)} (
                  {t('common:zoneWithLabel', {
                    zone: getZoneLabel(issue.zone, language),
                  })}
                  ) ·{' '}
                  {formatRelativeTimeText(
                    issue.createdAt,
                    t,
                    language,
                    useNativeNumerals
                  )}
                  {issue.scheduled
                    ? ` · ${t('departments:scheduledAt', {
                        date: formatDateLocalized(
                          issue.scheduled.date,
                          language,
                          useNativeNumerals
                        ),
                        time: formatTimeLocalized(
                          issue.scheduled.time,
                          language,
                          useNativeNumerals
                        ),
                      })}`
                    : ''}
                </div>
              </div>

              <IssueStatusBadge
                status={issue.status}
                scheduled={issue.scheduled}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
