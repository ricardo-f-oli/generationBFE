import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { CreatorsPage } from './pages/CreatorsPage';
import { ShortlistPage } from './pages/ShortlistPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { BriefBuilderPage } from './pages/BriefBuilderPage';
import { OutreachPage } from './pages/OutreachPage';
import { CoveragePage } from './pages/CoveragePage';
import { GiftingPage } from './pages/GiftingPage';
import { ReportingPage } from './pages/ReportingPage';
import { SettingsPage } from './pages/SettingsPage';
import { RegisterPage } from './pages/RegisterPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Standalone Route */}
          <Route path="/register" element={<RegisterPage />} />

          {/* Authenticated / App Shell Routes */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/creators" element={<CreatorsPage />} />
            <Route path="/shortlist" element={<ShortlistPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/brief" element={<BriefBuilderPage />} />
            <Route path="/outreach" element={<OutreachPage />} />
            <Route path="/coverage" element={<CoveragePage />} />
            <Route path="/gifting" element={<GiftingPage />} />
            <Route path="/reporting" element={<ReportingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
