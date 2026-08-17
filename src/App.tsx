import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedLayout, RequireRole } from './components/layout/ProtectedLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './components/common/Toast';
import { Spinner } from './components/common/Spinner';
import { SESSION_EXPIRED_EVENT } from './services/apiClient';

// Public routes are eager: they are the entry points.
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { WaitlistLandingPage } from './pages/public/WaitlistLandingPage';
import { UnsubscribePage } from './pages/public/UnsubscribePage';
import { AddressCapturePage } from './pages/public/AddressCapturePage';
import { BrandOrderConfirmPage } from './pages/public/BrandOrderConfirmPage';

// Q-F18: everything behind the login is code-split.
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const CreatorsPage = lazy(() =>
  import('./pages/creators/CreatorsPage').then((m) => ({ default: m.CreatorsPage })));
const CreatorDetailPage = lazy(() =>
  import('./pages/creators/CreatorDetailPage').then((m) => ({ default: m.CreatorDetailPage })));
const MatchingPage = lazy(() =>
  import('./pages/creators/MatchingPage').then((m) => ({ default: m.MatchingPage })));
const ShortlistsPage = lazy(() =>
  import('./pages/creators/ShortlistsPage').then((m) => ({ default: m.ShortlistsPage })));
const RegistrationsPage = lazy(() =>
  import('./pages/creators/RegistrationsPage').then((m) => ({ default: m.RegistrationsPage })));
const TaxonomyPage = lazy(() =>
  import('./pages/creators/TaxonomyPage').then((m) => ({ default: m.TaxonomyPage })));
const CampaignsPage = lazy(() =>
  import('./pages/campaigns/CampaignsPage').then((m) => ({ default: m.CampaignsPage })));
const BoardPage = lazy(() =>
  import('./pages/campaigns/BoardPage').then((m) => ({ default: m.BoardPage })));
const BriefBuilderPage = lazy(() =>
  import('./pages/campaigns/BriefBuilderPage').then((m) => ({ default: m.BriefBuilderPage })));
const ClauseLibraryPage = lazy(() =>
  import('./pages/campaigns/ClauseLibraryPage').then((m) => ({ default: m.ClauseLibraryPage })));
const OutreachPage = lazy(() =>
  import('./pages/OutreachPage').then((m) => ({ default: m.OutreachPage })));
const WaitlistPage = lazy(() =>
  import('./pages/marketing/WaitlistPage').then((m) => ({ default: m.WaitlistPage })));
const CoveragePage = lazy(() =>
  import('./pages/coverage/CoveragePage').then((m) => ({ default: m.CoveragePage })));
const CoverageDigestPage = lazy(() =>
  import('./pages/coverage/CoverageDigestPage').then((m) => ({ default: m.CoverageDigestPage })));
const GiftingRunsPage = lazy(() =>
  import('./pages/gifting/GiftingRunsPage').then((m) => ({ default: m.GiftingRunsPage })));
const DispatchesPage = lazy(() =>
  import('./pages/gifting/DispatchesPage').then((m) => ({ default: m.DispatchesPage })));
const ReportsPage = lazy(() =>
  import('./pages/reporting/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const ReportDetailPage = lazy(() =>
  import('./pages/reporting/ReportDetailPage').then((m) => ({ default: m.ReportDetailPage })));
const InsightsPage = lazy(() =>
  import('./pages/reporting/InsightsPage').then((m) => ({ default: m.InsightsPage })));
const KpiPage = lazy(() =>
  import('./pages/reporting/KpiPage').then((m) => ({ default: m.KpiPage })));
const FollowUpsPage = lazy(() =>
  import('./pages/outreach/FollowUpsPage').then((m) => ({ default: m.FollowUpsPage })));
const UsersPage = lazy(() =>
  import('./pages/settings/UsersPage').then((m) => ({ default: m.UsersPage })));
const AuditPage = lazy(() =>
  import('./pages/settings/AuditPage').then((m) => ({ default: m.AuditPage })));

const Simple = {
  Templates: lazy(() => import('./pages/SimplePages').then((m) => ({ default: m.TemplatesPage }))),
  SettingsGdpr: lazy(() => import('./pages/SimplePages').then((m) => ({ default: m.SettingsGdprPage }))),
  NotFound: lazy(() => import('./pages/SimplePages').then((m) => ({ default: m.NotFoundPage }))),
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Q-F22: stop every mount refetching immediately.
      staleTime: 30_000,
    },
  },
});

/** Q-F7: session expiry navigates through the router rather than assigning window.location. */
const SessionWatcher: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const onExpired = () => {
      queryClient.clear();
      navigate('/login', { replace: true });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [navigate]);

  return null;
};

export const App: React.FC = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <SessionWatcher />
            <Suspense fallback={<Spinner fullPage label="Loading" />}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/join" element={<WaitlistLandingPage />} />
                <Route path="/unsubscribe" element={<UnsubscribePage />} />
                {/* Requirement #41 and #43: token-only, no login. */}
                <Route path="/gifting/address/:token" element={<AddressCapturePage />} />
                <Route path="/gifting/brand-order/:token" element={<BrandOrderConfirmPage />} />

                {/* Authenticated */}
                <Route element={<ProtectedLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />

                  {/* Creators */}
                  <Route path="/creators" element={<CreatorsPage />} />
                  <Route path="/creators/matching" element={<MatchingPage />} />
                  <Route path="/creators/shortlists" element={<ShortlistsPage />} />
                  <Route path="/creators/registrations" element={<RegistrationsPage />} />
                  <Route path="/creators/taxonomy" element={<TaxonomyPage />} />
                  <Route path="/creators/:id" element={<CreatorDetailPage />} />

                  {/* Campaigns */}
                  <Route path="/campaigns" element={<CampaignsPage />} />
                  <Route path="/campaigns/board" element={<BoardPage />} />
                  <Route path="/campaigns/brief" element={<BriefBuilderPage />} />
                  <Route path="/campaigns/clauses" element={<ClauseLibraryPage />} />

                  {/* Outreach */}
                  <Route path="/outreach" element={<OutreachPage />} />
                  <Route path="/outreach/templates" element={<Simple.Templates />} />
                  <Route path="/outreach/follow-ups" element={<FollowUpsPage />} />

                  {/* Coverage */}
                  <Route path="/coverage" element={<CoveragePage />} />
                  <Route path="/coverage/digest" element={<CoverageDigestPage />} />

                  {/* Gifting */}
                  <Route path="/gifting" element={<GiftingRunsPage />} />
                  <Route path="/gifting/dispatches" element={<DispatchesPage />} />

                  {/* Marketing */}
                  <Route path="/marketing/waitlist" element={<WaitlistPage />} />

                  {/* Reporting */}
                  <Route path="/reporting" element={<ReportsPage />} />
                  <Route path="/reporting/insights" element={<InsightsPage />} />
                  <Route path="/reporting/kpi" element={<KpiPage />} />
                  <Route path="/reporting/:id" element={<ReportDetailPage />} />

                  {/* Settings — admin only (Q-F17) */}
                  <Route
                    path="/settings"
                    element={
                      <RequireRole roles={['ADMIN']}>
                        <UsersPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/settings/gdpr"
                    element={
                      <RequireRole roles={['ADMIN']}>
                        <Simple.SettingsGdpr />
                      </RequireRole>
                    }
                  />
                  {/* Requirement #36: directors read the audit trail too. */}
                  <Route
                    path="/settings/audit"
                    element={
                      <RequireRole roles={['ADMIN', 'DIRECTOR']}>
                        <AuditPage />
                      </RequireRole>
                    }
                  />

                  {/* Q-F16: a real 404, not a silent redirect to the dashboard. */}
                  <Route path="*" element={<Simple.NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);
