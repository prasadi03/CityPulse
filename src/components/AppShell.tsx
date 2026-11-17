import React, { useEffect, useRef, useState } from 'react';
import {
  Home,
  LayoutGrid,
  Building2,
  ClipboardPlus,
  LayoutDashboard,
  ListChecks,
  Database,
  LogOut,
  UserCircle2,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { CitizenTab, UserSession, WorkerTab } from '../types/citypulse';
import { UpdatedBadge } from './StatusPrimitives';
import { LanguageSwitcher, LanguagesSettingsSection } from './LanguageSwitcher';
import { useAppLanguage } from '../i18n';
import { getDepartmentLabel } from '../i18n/formatters';

interface AppShellProps {
  session: UserSession;
  activeTab: CitizenTab | WorkerTab;
  onSelectTab: (tab: CitizenTab | WorkerTab) => void;
  onLogout: () => void;
  secondsAgo: number;
  onRefresh: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  session,
  activeTab,
  onSelectTab,
  onLogout,
  secondsAgo,
  onRefresh,
  children,
}) => {
  const { t } = useAppLanguage();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [profileOpen]);

  const isWorker = session.role === 'worker';
  const showWorkerDataTab =
    isWorker &&
    (session.departmentId === 'electricity' ||
      session.departmentId === 'water' ||
      session.departmentId === 'traffic');

  const deptLabel = isWorker
    ? getDepartmentLabel(session.departmentId, t)
    : '';

  const navItems: {
    id: CitizenTab | WorkerTab;
    label: string;
    Icon: React.FC<{ className?: string }>;
  }[] = isWorker
    ? [
        { id: 'dashboard', label: t('common:nav.dashboard'), Icon: LayoutDashboard },
        { id: 'issues', label: t('common:nav.issues'), Icon: ListChecks },
        ...(showWorkerDataTab
          ? [{ id: 'data' as WorkerTab, label: t('common:nav.data'), Icon: Database }]
          : []),
      ]
    : [
        { id: 'home', label: t('common:nav.home'), Icon: Home },
        { id: 'heatmap', label: t('common:nav.heatmap'), Icon: LayoutGrid },
        { id: 'departments', label: t('common:nav.departments'), Icon: Building2 },
        { id: 'report', label: t('common:nav.report'), Icon: ClipboardPlus },
      ];

  return (
    <div className="min-h-screen bg-[#FFF9F2] text-[#7A6A62] flex flex-col md:flex-row">
      {/* Desktop Slim Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 bg-white border-r border-[#F0E6DF] p-5 justify-between sticky top-0 h-screen">
        <div className="space-y-8">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-9 h-9 rounded-xl bg-[#FF9B71]/25 text-[#964825] inline-flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-[#5A4A42] leading-tight truncate">
                CityPulse
              </div>
            </div>
          </div>

          <nav aria-label={t('common:aria.mainNavigation')} className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.Icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full h-11 px-3.5 rounded-2xl text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#FFF0E6] text-[#5A4A42]'
                      : 'text-[#7A6A62] hover:bg-[#FFF9F2] hover:text-[#5A4A42]'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      active ? 'text-[#964825]' : 'text-[#9C8B82]'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-[#F5EDE6] space-y-2 px-2">
          <div className="text-xs font-semibold text-[#5A4A42]">
            {isWorker
              ? deptLabel
              : session.role === 'guest'
              ? t('common:roles.guestViewOnly')
              : t('common:roles.citizenPortal')}
          </div>
          <UpdatedBadge secondsAgo={secondsAgo} onRefresh={onRefresh} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-[#FFF9F2]/95 backdrop-blur-sm border-b border-[#F0E6DF] px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="md:hidden font-bold text-base text-[#5A4A42] whitespace-nowrap">
              CityPulse
            </span>
            {isWorker ? (
              <span className="inline-flex items-center h-8 px-3.5 rounded-full bg-[#FFF0E6] text-[#5A4A42] text-xs sm:text-sm font-semibold truncate">
                {deptLabel}
              </span>
            ) : (
              <span className="hidden sm:inline-block text-sm font-medium text-[#7A6A62] truncate">
                {t('common:tagline')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden lg:block">
              <UpdatedBadge secondsAgo={secondsAgo} onRefresh={onRefresh} />
            </div>

            <LanguageSwitcher />

            {/* Profile & Settings Menu */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="h-10 px-3 sm:px-3.5 rounded-full bg-white border border-[#F0E6DF] hover:bg-[#FFF0E6] text-sm font-semibold text-[#5A4A42] inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <UserCircle2 className="w-4 h-4 text-[#964825] shrink-0" aria-hidden="true" />
                <span className="max-w-[90px] sm:max-w-[120px] truncate">{session.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#7A6A62] shrink-0" aria-hidden="true" />
              </button>

              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-68 bg-white border border-[#F0E6DF] rounded-2xl shadow-lg p-3 space-y-2 z-30"
                >
                  <div className="px-2 py-1 border-b border-[#F5EDE6]">
                    <div className="text-sm font-semibold text-[#5A4A42]">
                      {session.name}
                    </div>
                    <div className="text-xs text-[#7A6A62]">
                      {isWorker
                        ? `${session.employeeId} · ${deptLabel}`
                        : session.role === 'guest'
                        ? t('common:roles.guestModeViewOnly')
                        : session.contact}
                    </div>
                  </div>

                  <LanguagesSettingsSection />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
                    }}
                    className="w-full h-10 px-3 rounded-xl text-left text-sm font-semibold text-[#9E2A2B] hover:bg-[#FFF5F5] flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span>{t('common:actions.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tabs */}
      <nav
        aria-label={t('common:aria.mobileNavigation')}
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#F0E6DF] px-2 py-1.5 flex items-center justify-around"
      >
        {navItems.map((item) => {
          const Icon = item.Icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[48px] flex-1 min-w-0 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                active ? 'text-[#964825] bg-[#FFF0E6]/60' : 'text-[#7A6A62]'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-full whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
