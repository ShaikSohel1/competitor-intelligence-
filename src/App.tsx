import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AuthPage } from '@/pages/AuthPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { CompetitorsPage } from '@/pages/CompetitorsPage';
import { CompetitorDetailPage } from '@/pages/CompetitorDetailPage';
import { WebsiteMonitoringPage } from '@/pages/WebsiteMonitoringPage';
import { SeoKeywordsPage } from '@/pages/SeoKeywordsPage';
import { SocialMediaPage } from '@/pages/SocialMediaPage';
import { PricingIntelligencePage } from '@/pages/PricingIntelligencePage';
import { AdvertisingTrendsPage } from '@/pages/AdvertisingTrendsPage';
import { AiInsightsPage } from '@/pages/AiInsightsPage';
import { AiAssistantPage } from '@/pages/AiAssistantPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="competitors" element={<CompetitorsPage />} />
            <Route path="competitors/:id" element={<CompetitorDetailPage />} />
            <Route path="website" element={<WebsiteMonitoringPage />} />
            <Route path="seo" element={<SeoKeywordsPage />} />
            <Route path="social" element={<SocialMediaPage />} />
            <Route path="pricing" element={<PricingIntelligencePage />} />
            <Route path="advertising" element={<AdvertisingTrendsPage />} />
            <Route path="insights" element={<AiInsightsPage />} />
            <Route path="assistant" element={<AiAssistantPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
