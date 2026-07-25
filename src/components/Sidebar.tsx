import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Globe,
  Search,
  Share2,
  DollarSign,
  Megaphone,
  Sparkles,
  Bot,
  Bell,
  FileText,
  Settings,
  Radar,
  X,
  GitCompareArrows,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useAlerts } from '@/hooks/useAlerts';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/competitors', label: 'Competitors', icon: Users },
  { to: '/app/website', label: 'Website Monitoring', icon: Globe },
  { to: '/app/seo', label: 'SEO & Keywords', icon: Search },
  { to: '/app/social', label: 'Social Media', icon: Share2 },
  { to: '/app/pricing', label: 'Pricing Intelligence', icon: DollarSign },
  { to: '/app/advertising', label: 'Advertising Trends', icon: Megaphone },
  { to: '/app/comparison', label: 'Comparison', icon: GitCompareArrows },
  { to: '/app/insights', label: 'AI Insights', icon: Sparkles },
  { to: '/app/assistant', label: 'AI Assistant', icon: Bot },
  { to: '/app/alerts', label: 'Alerts', icon: Bell },
  { to: '/app/reports', label: 'Reports', icon: FileText },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useAlerts();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-transparent bg-brand-dark-900 text-on-primary transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <NavLink to="/app/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary shadow-sm">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold leading-none text-white tracking-[-0.2px]">Radar</p>
              <p className="text-[10px] text-primary-subdued mt-1">Intelligence Platform</p>
            </div>
          </NavLink>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-primary-subdued hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to || (to !== '/app/dashboard' && location.pathname.startsWith(to));
            const showBadge = to === '/app/alerts' && unreadCount > 0;
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-primary-subdued hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-on-primary' : 'text-primary-subdued group-hover:text-white')} />
                <span className="flex-1">{label}</span>
                {showBadge && (
                  <span className={cn(
                    'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                    isActive ? 'bg-on-primary text-primary' : 'bg-ruby text-white'
                  )}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5 transition-colors cursor-pointer">
            <Avatar className="h-9 w-9 border border-white/20">
              <AvatarFallback className="bg-primary/20 text-xs font-semibold text-white">
                {user?.email?.slice(0, 2).toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white">{user?.email ?? 'User'}</p>
              <p className="text-[11px] text-primary-subdued">Pro plan</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
