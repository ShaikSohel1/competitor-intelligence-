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
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-5">
          <NavLink to="/app/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-bold leading-none">CompeteIQ</p>
              <p className="text-[10px] text-muted-foreground">Competitor Intelligence</p>
            </div>
          </NavLink>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
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
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
                <span className="flex-1">{label}</span>
                {showBadge && (
                  <span className={cn(
                    'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                    isActive ? 'bg-primary-foreground text-primary' : 'bg-destructive text-destructive-foreground'
                  )}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {user?.email?.slice(0, 2).toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{user?.email ?? 'User'}</p>
              <p className="text-[10px] text-muted-foreground">Pro plan</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
