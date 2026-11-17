import { useEffect, useState } from 'react';
import { dataService } from './services/dataService';
import {
  CitizenTab,
  ConsumptionMetric,
  UserSession,
  WorkerTab,
} from './types/citypulse';
import { LoginScreen } from './components/LoginScreen';
import { AppShell } from './components/AppShell';
import { CitizenHome } from './components/CitizenHome';
import { CitizenDepartments } from './components/CitizenDepartments';
import { CitizenReport } from './components/CitizenReport';
import { HeatmapView } from './components/HeatmapView';
import { WorkerDashboard } from './components/WorkerDashboard';
import { WorkerIssues } from './components/WorkerIssues';
import {
  ErrorState,
  LoadingSkeleton,
  useLiveDataSync,
} from './components/StatusPrimitives';
import { NagaraAIWidget } from './components/NagaraAI';
import { useAppLanguage } from './i18n';
import { getDepartmentLabel } from './i18n/formatters';

const CITIZEN_TABS: CitizenTab[] = ['home', 'heatmap', 'departments', 'report'];
const WORKER_TABS: WorkerTab[] = ['dashboard', 'issues', 'data'];

export default function App() {
  const { t } = useAppLanguage();
  const [session, setSession] = useState<UserSession | null>(() =>
    dataService.getSession()
  );
  const [citizenTab, setCitizenTab] = useState<CitizenTab>('home');
  const [citizenHeatmapMetric, setCitizenHeatmapMetric] =
    useState<ConsumptionMetric>('electricity');
  const [workerTab, setWorkerTab] = useState<WorkerTab>('dashboard');
  const [selectedWorkerIssueId, setSelectedWorkerIssueId] = useState<
    string | null
  >(null);
  const [isHydrating, setIsHydrating] = useState(true);

  const { secondsAgo, refreshNow } = useLiveDataSync();

  useEffect(() => {
    const timer = window.setTimeout(() => setIsHydrating(false), 180);
    return () => window.clearTimeout(timer);
  }, []);

  // Keep session synchronized with dataService changes (e.g., My Area updates)
  useEffect(() => {
    return dataService.subscribe(() => {
      setSession(dataService.getSession());
    });
  }, []);

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    if (newSession.role === 'worker') {
      setWorkerTab('dashboard');
    } else {
      setCitizenTab('home');
    }
  };

  const handleLogout = () => {
    dataService.logout();
    setSession(null);
    setSelectedWorkerIssueId(null);
  };

  if (!session) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Strict Route Guards
  const isWorker = session.role === 'worker';
  const activeTab: CitizenTab | WorkerTab = isWorker ? workerTab : citizenTab;

  const handleSelectTab = (tab: CitizenTab | WorkerTab) => {
    if (isWorker) {
      if ((WORKER_TABS as string[]).includes(tab)) {
        // Prevent non-Electricity / non-Water / non-Traffic workers from entering Data tab
        if (tab === 'data' && !dataService.getWorkerAllowedMetric(session)) {
          setWorkerTab('dashboard');
          return;
        }
        setWorkerTab(tab as WorkerTab);
      }
    } else {
      if ((CITIZEN_TABS as string[]).includes(tab)) {
        setCitizenTab(tab as CitizenTab);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => {
    if (isHydrating) {
      return <LoadingSkeleton rows={3} />;
    }

    if (isWorker) {
      if (workerTab === 'dashboard') {
        return (
          <WorkerDashboard
            session={session}
            onSelectIssue={(id) => {
              setSelectedWorkerIssueId(id);
              setWorkerTab('issues');
            }}
            onNavigateTab={(tab) => handleSelectTab(tab)}
          />
        );
      }
      if (workerTab === 'issues') {
        return (
          <WorkerIssues
            session={session}
            initialIssueId={selectedWorkerIssueId}
          />
        );
      }
      if (workerTab === 'data') {
        try {
          const workerHeatmap = dataService.getWorkerHeatmapData(session);
          const deptLabel = session.departmentId
            ? getDepartmentLabel(session.departmentId, t)
            : session.department || '';
          return (
            <HeatmapView
              metrics={workerHeatmap.metrics}
              lockedMetric={workerHeatmap.metric}
              title={t('heatmap:workerTitle', { department: deptLabel })}
              subtitle={t('heatmap:workerSubtitle', {
                metric: t(`common:metrics.${workerHeatmap.metric}`),
              })}
            />
          );
        } catch {
          return (
            <ErrorState
              message={t('errors:accessDeniedDept')}
              onRetry={() => setWorkerTab('dashboard')}
            />
          );
        }
      }
      return null;
    }

    // Citizen / Guest Route Views
    if (citizenTab === 'home') {
      return (
        <CitizenHome
          session={session}
          onNavigateTab={(t, focusMetric) => {
            if (focusMetric) {
              setCitizenHeatmapMetric(focusMetric);
            }
            handleSelectTab(t);
          }}
        />
      );
    }
    if (citizenTab === 'heatmap') {
      const citizenMetrics = dataService.getCitizenHeatmapMetrics(session);
      return (
        <HeatmapView
          metrics={citizenMetrics}
          initialMetric={citizenHeatmapMetric}
        />
      );
    }
    if (citizenTab === 'departments') {
      return <CitizenDepartments />;
    }
    if (citizenTab === 'report') {
      return (
        <CitizenReport
          session={session}
          onRequestSignIn={handleLogout}
        />
      );
    }
    return null;
  };

  return (
    <>
      <AppShell
        session={session}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onLogout={handleLogout}
        secondsAgo={secondsAgo}
        onRefresh={refreshNow}
      >
        {renderContent()}
      </AppShell>
      <NagaraAIWidget session={session} />
    </>
  );
}
