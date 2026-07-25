import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { GradientMesh } from '@/components/GradientMesh';
import { useAlerts } from '@/hooks/useAlerts';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { refresh } = useAlerts();

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="relative min-h-screen bg-canvas text-ink">
      <GradientMesh />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 lg:pl-64">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
