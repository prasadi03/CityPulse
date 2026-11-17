import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Send,
  Trash2,
  SlidersHorizontal,
  WifiOff,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { useAppLanguage } from '../../i18n';
import { getDepartmentLabel } from '../../i18n/formatters';
import type {
  AppUpdateItem,
  NagaraChatMessage,
  PendingToolApproval,
  UserSession,
} from '../../types/citypulse';
import type { ConnectionStatus } from '../../hooks/useNagaraAI';
import { NagaraMonogram } from './FloatingButton';
import { UpdatesDigest } from './UpdatesDigest';
import { MessageBubble } from './MessageBubble';
import { ToolApprovalCard } from './ToolApprovalCard';

interface ChatPanelProps {
  isOpen: boolean;
  session: UserSession;
  updatesFeed: AppUpdateItem[];
  newHighlightIds: Set<string>;
  messages: NagaraChatMessage[];
  pendingApproval: PendingToolApproval | null;
  askBeforeExternalTools: boolean;
  isLoading: boolean;
  isOffline: boolean;
  connectionStatus: ConnectionStatus;
  onTestConnection: () => void;
  onClose: () => void;
  onSend: (text: string, isRetry?: boolean) => void;
  onResolveApproval: (approved: boolean) => void;
  onToggleApprovalSetting: (enabled: boolean) => void;
  onClearChat: () => void;
}

const CITIZEN_QUICK_REPLY_KEYS = [
  'nagara:quickReplies.citizen.whatsNew',
  'nagara:quickReplies.citizen.powerCuts',
  'nagara:quickReplies.citizen.waterSchedule',
  'nagara:quickReplies.citizen.weatherNow',
  'nagara:quickReplies.citizen.myReports',
] as const;

const WORKER_QUICK_REPLY_KEYS = [
  'nagara:quickReplies.worker.pending',
  'nagara:quickReplies.worker.scheduledToday',
  'nagara:quickReplies.worker.highConsumption',
  'nagara:quickReplies.worker.oldestUnresolved',
] as const;

function getRoleChipLabel(session: UserSession, t: TFunction): string {
  if (session.role === 'worker') {
    const shortDept = getDepartmentLabel(session.departmentId, t, true);
    return t('nagara:deptChip', { dept: shortDept });
  }
  return session.role === 'guest'
    ? t('common:roles.guest')
    : t('common:roles.citizen');
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  session,
  updatesFeed,
  newHighlightIds,
  messages,
  pendingApproval,
  askBeforeExternalTools,
  isLoading,
  isOffline,
  connectionStatus,
  onTestConnection,
  onClose,
  onSend,
  onResolveApproval,
  onToggleApprovalSetting,
  onClearChat,
}) => {
  const { t } = useAppLanguage();
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, messages.length, pendingApproval, isLoading]);

  if (!isOpen) return null;

  const isWorker = session.role === 'worker';
  const roleChip = getRoleChipLabel(session, t);
  const quickReplyKeys = isWorker
    ? WORKER_QUICK_REPLY_KEYS
    : CITIZEN_QUICK_REPLY_KEYS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || pendingApproval) return;
    onSend(input);
    setInput('');
  };

  return (
    <>
      {/* Subtle warm backdrop on mobile */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="md:hidden fixed inset-0 z-40 bg-[#5A4A42]/15 backdrop-blur-[1px]"
      />

      <section
        role="dialog"
        aria-label={t('nagara:dialogAria')}
        className="fixed inset-x-2 bottom-2 h-[80vh] max-h-[82vh] md:inset-x-auto md:right-6 md:bottom-6 md:w-[390px] md:h-[580px] md:max-h-[calc(100vh-3rem)] z-50 bg-white border border-[#F0E6DF] rounded-[20px] shadow-[0_18px_48px_-8px_rgba(90,74,66,0.24)] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]"
      >
        {/* Header */}
        <header className="px-4 py-3 bg-white border-b border-[#F5EDE6] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF9B71] to-[#FFC93C] flex items-center justify-center shrink-0 shadow-sm">
              <NagaraMonogram size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-[#5A4A42] truncate">
                  NagaraAI
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EAF8F0] text-[#0D3B20] text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5FCB8A]" />
                  <span>{t('nagara:live')}</span>
                </span>
              </div>
              <div className="mt-0.5">
                <span className="inline-flex items-center px-2 py-0.2 rounded-full bg-[#FFF0E6] text-[#964825] text-[10px] font-semibold">
                  {roleChip}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setShowSettings((prev) => !prev)}
              aria-label={t('nagara:settingsAria')}
              aria-expanded={showSettings}
              title={t('nagara:settingsTitle')}
              className={`w-8 h-8 rounded-full inline-flex items-center justify-center transition-colors cursor-pointer ${
                showSettings
                  ? 'bg-[#FFF0E6] text-[#964825]'
                  : 'text-[#7A6A62] hover:bg-[#FFF9F2] hover:text-[#5A4A42]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClearChat}
              aria-label={t('nagara:clearChat')}
              title={t('nagara:clearChat')}
              className="w-8 h-8 rounded-full text-[#7A6A62] hover:bg-[#FFF9F2] hover:text-[#5A4A42] inline-flex items-center justify-center transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('nagara:closeAria')}
              className="w-8 h-8 rounded-full text-[#7A6A62] hover:bg-[#FFF0E6] hover:text-[#5A4A42] inline-flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Settings Bar */}
        {showSettings && (
          <div className="px-4 py-2.5 bg-[#FFF9F2] border-b border-[#F0E6DF] space-y-2.5 text-xs shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-[#5A4A42]">
                  {t('nagara:askBeforeExternal')}
                </div>
                <div className="text-[11px] text-[#7A6A62]">
                  {t('nagara:askBeforeExternalDesc')}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={askBeforeExternalTools}
                aria-label={t('nagara:askBeforeExternal')}
                onClick={() =>
                  onToggleApprovalSetting(!askBeforeExternalTools)
                }
                className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                  askBeforeExternalTools ? 'bg-[#5FCB8A]' : 'bg-[#E5D7CE]'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    askBeforeExternalTools ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="pt-2 border-t border-[#F0E6DF] flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={connectionStatus === 'checking'}
                onClick={onTestConnection}
                className="h-8 px-3 rounded-full bg-white hover:bg-[#FFF0E6] border border-[#F0E6DF] text-xs font-semibold text-[#5A4A42] disabled:opacity-60 cursor-pointer transition-colors"
              >
                {connectionStatus === 'checking'
                  ? t('nagara:testingConnection')
                  : t('nagara:testConnection')}
              </button>

              {connectionStatus === 'connected' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF8F0] border border-[#BCEAD0] text-[11px] font-semibold text-[#0D3B20]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5FCB8A]" />
                  <span>{t('nagara:connected')}</span>
                </span>
              )}
              {connectionStatus === 'unreachable' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF1EE] border border-[#FFC4B8] text-[11px] font-semibold text-[#9E2A2B]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E05252]" />
                  <span>{t('nagara:notReachable')}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Offline Banner */}
        {isOffline && (
          <div className="px-4 py-2 bg-[#FFF8D6] border-b border-[#F3DC75] text-xs font-semibold text-[#8A5D00] flex items-center gap-2 shrink-0">
            <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{t('nagara:offlineBanner')}</span>
          </div>
        )}

        {/* Message & Updates Feed Stream */}
        <div className="flex-1 overflow-y-auto bg-[#FFF9F2] p-3.5 space-y-3">
          {/* Automatic "What's new" digest from dataService.getUpdatesFeed */}
          <UpdatesDigest
            updates={updatesFeed}
            newHighlightIds={newHighlightIds}
            roleLabel={roleChip}
          />

          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onRetry={(payload) => onSend(payload, true)}
            />
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-[#FFF4E8] border border-[#F0E6DF] px-4 py-3 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF9B71] animate-bounce" />
                <span
                  className="w-2 h-2 rounded-full bg-[#FFC93C] animate-bounce"
                  style={{ animationDelay: '120ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-[#5FCB8A] animate-bounce"
                  style={{ animationDelay: '240ms' }}
                />
                <span className="sr-only">{t('nagara:typingSr')}</span>
              </div>
            </div>
          )}

          {/* Inline Human Approval Card */}
          {pendingApproval && (
            <ToolApprovalCard
              approval={pendingApproval}
              disabled={isLoading}
              onApprove={() => onResolveApproval(true)}
              onDeny={() => onResolveApproval(false)}
            />
          )}

          <div ref={scrollEndRef} />
        </div>

        {/* Role-Scoped Quick-Reply Chips */}
        <div className="px-3 py-2 bg-white border-t border-[#F5EDE6] flex items-center gap-1.5 overflow-x-auto shrink-0">
          {quickReplyKeys.map((key) => {
            const label = t(key);
            return (
              <button
                key={key}
                type="button"
                disabled={isLoading || Boolean(pendingApproval)}
                onClick={() => onSend(label)}
                className="h-8 px-3 rounded-full bg-[#FFF9F2] hover:bg-[#FFF0E6] border border-[#F0E6DF] disabled:opacity-50 text-xs font-semibold text-[#5A4A42] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Input Composer */}
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-white border-t border-[#F5EDE6] flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || Boolean(pendingApproval)}
            placeholder={
              pendingApproval
                ? t('nagara:placeholderPending')
                : isWorker
                ? t('nagara:placeholderWorker', { dept: roleChip })
                : t('nagara:placeholderCitizen')
            }
            aria-label={t('nagara:inputAria')}
            className="cp-input flex-1 min-h-[42px] px-3.5 text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || Boolean(pendingApproval)}
            aria-label={t('nagara:sendAria')}
            className="w-[42px] h-[42px] rounded-full bg-[#FF9B71] hover:bg-[#FF8456] disabled:opacity-45 text-white inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </section>
    </>
  );
};
