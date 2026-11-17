import { useCallback, useEffect, useRef, useState } from 'react';
import i18n, { useAppLanguage } from '../i18n';
import { formatClockTimestamp } from '../i18n/formatters';
import { dataService } from '../services/dataService';
import type {
  AppUpdateItem,
  NagaraChatMessage,
  NagaraChatResponse,
  PendingToolApproval,
  UserSession,
} from '../types/citypulse';

const APPROVAL_PREF_KEY = 'nagara_ask_external_approval_v1';
const REQUEST_TIMEOUT_MS = 30000;

export type ConnectionStatus = 'idle' | 'checking' | 'connected' | 'unreachable';

const nagaraApiClient = {
  async chat(payload: Record<string, unknown>): Promise<NagaraChatResponse> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch('/api/nagara/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        const textPreview = (await response.text()).slice(0, 200);
        console.error(
          `[NagaraAI] Expected JSON from /api/nagara/chat but got ${response.status} (${contentType}):`,
          textPreview
        );
        throw new Error(i18n.t('errors:nagaraHtmlInsteadOfJson'));
      }

      const data = (await response.json()) as NagaraChatResponse;
      if (!response.ok || data.error) {
        throw new Error(data.error || `Server returned ${response.status}`);
      }
      return data;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(i18n.t('errors:nagaraTimeout'));
      }
      if (err instanceof TypeError) {
        throw new Error(i18n.t('errors:nagaraUnreachable'));
      }
      throw err;
    } finally {
      window.clearTimeout(timer);
    }
  },

  async checkHealth(): Promise<boolean> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal,
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        const textPreview = (await response.text()).slice(0, 200);
        console.error(
          `[NagaraAI] Expected JSON from /api/health but got ${response.status}:`,
          textPreview
        );
        return false;
      }
      const data = (await response.json()) as { ok?: boolean };
      return Boolean(response.ok && data?.ok);
    } catch {
      return false;
    } finally {
      window.clearTimeout(timer);
    }
  },
};

function getSessionHistoryKey(userId: string, role: string, dept?: string): string {
  return `nagara_chat_history_${role}_${dept ?? 'all'}_${userId}`;
}

function loadApprovalPref(): boolean {
  try {
    const val = localStorage.getItem(APPROVAL_PREF_KEY);
    if (val === 'false') return false;
  } catch {
    // ignore
  }
  return true;
}

function loadSessionMessages(key: string): NagaraChatMessage[] {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as NagaraChatMessage[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function useNagaraAI(session: UserSession) {
  const { language, useNativeNumerals, t } = useAppLanguage();
  const deptParam =
    session.role === 'worker' ? session.departmentId : null;
  const historyKey = getSessionHistoryKey(
    session.userId,
    session.role,
    deptParam ?? undefined
  );

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [updatesFeed, setUpdatesFeed] = useState<AppUpdateItem[]>(() =>
    dataService.getUpdatesFeed(session.role, deptParam, session.userId)
  );
  const [newHighlightIds, setNewHighlightIds] = useState<Set<string>>(
    () => new Set()
  );

  const [messages, setMessages] = useState<NagaraChatMessage[]>(() =>
    loadSessionMessages(historyKey)
  );
  const [pendingApproval, setPendingApproval] =
    useState<PendingToolApproval | null>(null);
  const [askBeforeExternalTools, setAskBeforeExternalTools] = useState<boolean>(
    () => loadApprovalPref()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('idle');

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const seenUpdateIdsRef = useRef<Set<string>>(
    new Set(updatesFeed.map((u) => u.id))
  );

  useEffect(() => {
    const freshFeed = dataService.getUpdatesFeed(
      session.role,
      deptParam,
      session.userId
    );
    setUpdatesFeed(freshFeed);
    seenUpdateIdsRef.current = new Set(freshFeed.map((u) => u.id));
    setNewHighlightIds(new Set());
    setUnreadCount(0);
    setMessages(loadSessionMessages(historyKey));
    setPendingApproval(null);
  }, [historyKey, session.role, deptParam, session.userId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(historyKey, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [historyKey, messages]);

  const toggleAskBeforeExternalTools = useCallback((nextVal: boolean) => {
    setAskBeforeExternalTools(nextVal);
    try {
      localStorage.setItem(APPROVAL_PREF_KEY, String(nextVal));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    return dataService.subscribe(() => {
      const latest = dataService.getUpdatesFeed(
        session.role,
        deptParam,
        session.userId
      );
      setUpdatesFeed(latest);

      const newlyArrived = latest.filter(
        (item) => !seenUpdateIdsRef.current.has(item.id)
      );

      if (newlyArrived.length > 0) {
        newlyArrived.forEach((item) => seenUpdateIdsRef.current.add(item.id));
        setNewHighlightIds((prev) => {
          const next = new Set(prev);
          newlyArrived.forEach((item) => next.add(item.id));
          return next;
        });

        if (!isOpenRef.current) {
          setUnreadCount((prev) => prev + newlyArrived.length);
        }

        window.setTimeout(() => {
          setNewHighlightIds((prev) => {
            const next = new Set(prev);
            newlyArrived.forEach((item) => next.delete(item.id));
            return next;
          });
        }, 4500);
      }
    });
  }, [session.role, deptParam, session.userId]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const openPanel = useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setPendingApproval(null);
    setIsLoading(false);
    try {
      sessionStorage.removeItem(historyKey);
    } catch {
      // ignore
    }
  }, [historyKey]);

  const testConnection = useCallback(async () => {
    setConnectionStatus('checking');
    const ok = await nagaraApiClient.checkHealth();
    setConnectionStatus(ok ? 'connected' : 'unreachable');
  }, []);

  const handleServerResponse = useCallback(
    (data: NagaraChatResponse) => {
      if (data.weatherUpdate) {
        dataService.recordWeatherUpdate(
          data.weatherUpdate.city,
          data.weatherUpdate.summary
        );
      }

      if (
        (data.status === 'approval_required' ||
          (data.toolRequests && data.toolRequests.length > 0)) &&
        data.pendingApproval
      ) {
        setPendingApproval(data.pendingApproval);
        return;
      }

      setPendingApproval(null);
      const replyText =
        data.reply?.trim() || t('errors:nagaraEmptyReply');
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          timestamp: formatClockTimestamp(Date.now(), language, useNativeNumerals),
          sources: data.sources,
        },
      ]);
    },
    [language, useNativeNumerals, t]
  );

  const sendMessage = useCallback(
    async (rawText: string, isRetry = false) => {
      const text = rawText.trim();
      if (!text || isLoading) return;

      const nowLabel = formatClockTimestamp(
        Date.now(),
        language,
        useNativeNumerals
      );

      if (isOffline) {
        setMessages((prev) => [
          ...prev,
          ...(isRetry
            ? []
            : [
                {
                  id: `usr-${Date.now()}`,
                  role: 'user' as const,
                  content: text,
                  timestamp: nowLabel,
                },
              ]),
          {
            id: `off-${Date.now()}`,
            role: 'assistant',
            content: t('errors:nagaraOffline'),
            timestamp: nowLabel,
            isError: true,
            retryPayload: text,
          },
        ]);
        return;
      }

      const userMsg: NagaraChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: nowLabel,
      };

      const nextHistory = isRetry
        ? messages.filter((m) => !m.isError)
        : [...messages.filter((m) => !m.isError), userMsg];

      if (!isRetry) {
        setMessages((prev) => [...prev, userMsg]);
      } else {
        setMessages((prev) => prev.filter((m) => !m.isError));
      }

      setPendingApproval(null);
      setIsLoading(true);

      try {
        const data = await nagaraApiClient.chat({
          messages: nextHistory.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          appSnapshot: dataService.getNagaraAppSnapshot(session),
          askBeforeExternalTools,
          language,
        });

        handleServerResponse(data);
      } catch (err) {
        const errMsg =
          err instanceof Error
            ? err.message
            : t('errors:nagaraUnreachable');
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: errMsg,
            timestamp: formatClockTimestamp(
              Date.now(),
              language,
              useNativeNumerals
            ),
            isError: true,
            retryPayload: text,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      isOffline,
      messages,
      session,
      askBeforeExternalTools,
      language,
      useNativeNumerals,
      t,
      handleServerResponse,
    ]
  );

  const resolveApproval = useCallback(
    async (approved: boolean) => {
      if (!pendingApproval || isLoading) return;
      const currentPending = pendingApproval;
      setPendingApproval(null);
      setIsLoading(true);

      try {
        const data = await nagaraApiClient.chat({
          approvalDecision: {
            approved,
            toolCallId: currentPending.toolCallId,
            pendingState: currentPending.pendingState,
          },
          appSnapshot: dataService.getNagaraAppSnapshot(session),
          askBeforeExternalTools,
          language,
        });

        handleServerResponse(data);
      } catch (err) {
        const errMsg =
          err instanceof Error
            ? err.message
            : t('errors:nagaraApprovalFailed');
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: errMsg,
            timestamp: formatClockTimestamp(
              Date.now(),
              language,
              useNativeNumerals
            ),
            isError: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      pendingApproval,
      isLoading,
      session,
      askBeforeExternalTools,
      language,
      useNativeNumerals,
      t,
      handleServerResponse,
    ]
  );

  return {
    isOpen,
    openPanel,
    closePanel,
    unreadCount,
    updatesFeed,
    newHighlightIds,
    messages,
    pendingApproval,
    askBeforeExternalTools,
    toggleAskBeforeExternalTools,
    isLoading,
    isOffline,
    connectionStatus,
    testConnection,
    sendMessage,
    resolveApproval,
    clearChat,
  };
}
