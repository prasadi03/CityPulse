import React, { useEffect, useState } from 'react';
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Zap,
  Droplets,
  Construction,
  TrafficCone,
  Bus,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { DepartmentId, IssuePriority, IssueSchedule, IssueStatus } from '../types/citypulse';
import { useAppLanguage } from '../i18n';
import { localizeDigits } from '../i18n/formatters';

export function useLiveDataSync() {
  const [tick, setTick] = useState(0);
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const unsub = dataService.subscribe(() => {
      setTick((t) => t + 1);
      setSecondsAgo(0);
    });

    const secTimer = window.setInterval(() => {
      const diff = Math.max(
        0,
        Math.floor((Date.now() - dataService.getLastUpdatedAt()) / 1000)
      );
      setSecondsAgo(diff);
    }, 1000);

    return () => {
      unsub();
      window.clearInterval(secTimer);
    };
  }, []);

  return {
    tick,
    secondsAgo,
    refreshNow: () => dataService.refreshLiveSnapshot(),
  };
}

export const UpdatedBadge: React.FC<{
  secondsAgo: number;
  onRefresh?: () => void;
}> = ({ secondsAgo, onRefresh }) => {
  const { language, useNativeNumerals, t } = useAppLanguage();
  return (
    <div className="inline-flex items-center gap-2 text-xs font-medium text-[#7A6A62] tabular-nums whitespace-nowrap">
      <Clock className="w-3.5 h-3.5 text-[#9C8B82]" aria-hidden="true" />
      <span>
        {localizeDigits(
          t('common:relativeTime.updatedSecAgo', { count: secondsAgo }),
          language,
          useNativeNumerals
        )}
      </span>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          aria-label={t('common:aria.refreshLiveData')}
          className="p-1.5 rounded-full hover:bg-[#FFF0E6] text-[#5A4A42] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export const IssueStatusBadge: React.FC<{
  status: IssueStatus;
  scheduled?: IssueSchedule;
}> = ({ status, scheduled }) => {
  const { t } = useAppLanguage();
  if (status === 'Waiting') {
    return (
      <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold bg-[#FFC93C] text-[#5A4A42] whitespace-nowrap shrink-0">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{t('common:status.waiting')}</span>
      </span>
    );
  }
  if (status === 'Ongoing') {
    return (
      <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold bg-[#5BB8F5] text-[#0B3552] whitespace-nowrap shrink-0">
        {scheduled ? (
          <>
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('common:status.ongoingScheduled')}</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t('common:status.ongoing')}</span>
          </>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold bg-[#5FCB8A] text-[#0D3B20] whitespace-nowrap shrink-0">
      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{t('common:status.solved')}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: IssuePriority }> = ({
  priority,
}) => {
  const { t } = useAppLanguage();
  const styles: Record<IssuePriority, { bg: string; text: string }> = {
    Low: { bg: '#FFF9F2', text: '#7A6A62' },
    Medium: { bg: '#FFF8D6', text: '#7A5400' },
    High: { bg: '#FFE8DD', text: '#964825' },
    Urgent: { bg: '#FF6B6B', text: '#FFFFFF' },
  };
  const keyMap: Record<IssuePriority, string> = {
    Low: 'common:priority.low',
    Medium: 'common:priority.medium',
    High: 'common:priority.high',
    Urgent: 'common:priority.urgent',
  };
  const s = styles[priority];
  return (
    <span
      className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 border border-[#F0E6DF]/60"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {t(keyMap[priority])}
    </span>
  );
};

export function getDepartmentVisuals(deptId: DepartmentId) {
  switch (deptId) {
    case 'electricity':
      return {
        bg: '#FFF8D6',
        fg: '#8A5D00',
        accent: '#FFC93C',
        Icon: Zap,
      };
    case 'water':
      return {
        bg: '#E8F4FD',
        fg: '#0B4F78',
        accent: '#5BB8F5',
        Icon: Droplets,
      };
    case 'roads':
      return {
        bg: '#FFF0E6',
        fg: '#964825',
        accent: '#FF9B71',
        Icon: Construction,
      };
    case 'traffic':
      return {
        bg: '#FFE8E8',
        fg: '#9E2A2B',
        accent: '#FF6B6B',
        Icon: TrafficCone,
      };
    case 'transport':
      return {
        bg: '#EAF8F0',
        fg: '#0D522D',
        accent: '#5FCB8A',
        Icon: Bus,
      };
  }
}

export const DepartmentBadge: React.FC<{
  departmentId: DepartmentId;
  label: string;
}> = ({ departmentId, label }) => {
  const v = getDepartmentVisuals(departmentId);
  const Icon = v.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
      style={{ backgroundColor: v.bg, color: v.fg }}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  const { t } = useAppLanguage();
  return (
    <div className="space-y-4" aria-busy="true" aria-label={t('common:aria.loadingContent')}>
      <div className="cp-card p-6 space-y-3 animate-pulse">
        <div className="h-5 w-44 rounded-lg bg-[#F5EDE6]" />
        <div className="h-8 w-64 rounded-lg bg-[#FFF0E6]" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="cp-card p-5 space-y-2.5 animate-pulse">
          <div className="h-4 w-3/5 rounded-lg bg-[#F5EDE6]" />
          <div className="h-4 w-2/5 rounded-lg bg-[#FFF0E6]" />
        </div>
      ))}
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="cp-card p-10 text-center space-y-3">
    <p className="text-base font-semibold text-[#5A4A42]">{title}</p>
    <p className="text-sm text-[#7A6A62] max-w-md mx-auto">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-2 h-11 px-5 rounded-full bg-[#FF9B71] hover:bg-[#FF8456] text-[#5A4A42] font-semibold text-sm transition-colors cursor-pointer"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export const ErrorState: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => {
  const { t } = useAppLanguage();
  return (
    <div
      role="alert"
      className="cp-card p-8 border-[#FF6B6B]/40 bg-[#FFF5F5] text-center space-y-3"
    >
      <div className="w-10 h-10 rounded-full bg-[#FF6B6B]/15 text-[#9E2A2B] inline-flex items-center justify-center mx-auto">
        <AlertCircle className="w-5 h-5" aria-hidden="true" />
      </div>
      <p className="text-base font-semibold text-[#5A4A42]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-10 px-5 rounded-full bg-[#FF9B71] hover:bg-[#FF8456] text-[#5A4A42] font-semibold text-sm transition-colors cursor-pointer"
        >
          {t('common:actions.tryAgain')}
        </button>
      )}
    </div>
  );
};
