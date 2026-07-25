import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, LogOut, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { useAlerts } from '@/hooks/useAlerts';
import { cn } from '@/lib/utils';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useAlerts();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden flex-1 max-w-md sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search competitors, keywords..."
          className="pl-9"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              navigate('/app/competitors');
            }
          }}
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate('/app/alerts')}
          aria-label="Alerts"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-muted" aria-label="Account menu">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {user?.email?.slice(0, 2).toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{user?.email ?? 'User'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/app/settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} disabled={signingOut} className={cn(signingOut && 'opacity-60')}>
              {signingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
