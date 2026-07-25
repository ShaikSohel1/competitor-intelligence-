import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, TrendingUp, Eye, Target, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      navigate('/app/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      if (msg.toLowerCase().includes('invalid login')) {
        setError('Incorrect email or password. If you are new, switch to Sign Up.');
      } else if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
        setError('An account with this email already exists. Switch to Sign In.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Radar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none">CompeteIQ</p>
            <p className="text-xs text-primary-foreground/70">Competitor Intelligence</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="max-w-md text-3xl font-bold leading-tight">
            Know what your competitors are doing — before they do.
          </h1>
          <p className="max-w-md text-sm text-primary-foreground/80">
            Track competitor websites, SEO, social media, pricing, and advertising in one place.
            AI turns raw signals into actionable intelligence, alerts, and weekly reports.
          </p>
          <div className="grid max-w-md grid-cols-2 gap-4 pt-4">
            {[
              { icon: Eye, label: 'Website monitoring' },
              { icon: TrendingUp, label: 'SEO & keyword tracking' },
              { icon: Target, label: 'Pricing intelligence' },
              { icon: Radar, label: 'AI-powered insights' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-sm">
                <Icon className="h-4 w-4 text-accent" />
                <span className="text-primary-foreground/90">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
          Built for hackathon demonstration. Data is illustrative.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Radar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none">CompeteIQ</p>
              <p className="text-xs text-muted-foreground">Competitor Intelligence</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === 'signin'
              ? 'Sign in to access your competitor dashboard.'
              : 'Start monitoring your competitors in minutes.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              className={cn('font-medium text-accent hover:underline', 'underline-offset-4')}
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              disabled={loading}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
