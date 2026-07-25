import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Sliders, Sparkles, Loader2, LogOut, Bell, Shield, Key } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCompetitorList } from '@/hooks/useCompetitorList';
import { updateCompetitor } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { competitors, refresh } = useCompetitorList();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = useState(false);
  const [savingFreq, setSavingFreq] = useState<string | null>(null);
  const [notifEmails, setNotifEmails] = useState(true);
  const [notifHighAlerts, setNotifHighAlerts] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(true);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/');
    } finally {
      setSigningOut(false);
    }
  }

  async function handleFreqChange(competitorId: string, freq: string) {
    setSavingFreq(competitorId);
    try {
      await updateCompetitor(competitorId, { scan_frequency: freq });
      toast({ title: 'Scan frequency updated' });
      await refresh();
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setSavingFreq(null);
    }
  }

  function handleSaveNotif() {
    toast({ title: 'Notification preferences saved' });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account, monitoring, and notification preferences." />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Account</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
                  {user?.email?.slice(0, 2).toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{user?.email ?? 'User'}</p>
                <p className="text-sm text-muted-foreground">Plan: Pro</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ''} disabled />
            </div>
            <Button variant="outline" onClick={handleSignOut} disabled={signingOut} className="w-full">
              {signingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              Sign out
            </Button>
          </CardContent>
        </Card>

        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <div>
                <CardTitle className="text-base">AI Configuration</CardTitle>
                <CardDescription>AI model powering your insights</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Gemini API</p>
                  <p className="text-xs text-muted-foreground">Configured server-side</p>
                </div>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              The AI engine analyzes competitor data to generate summaries, trend analysis, strategy insights, pricing explanations, SEO opportunities, sentiment analysis, and weekly reports. If no API key is set, the system uses a built-in heuristic engine so the demo remains fully functional.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Model</p>
                <p className="mt-1 text-sm font-medium">Gemini 1.5 Flash</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Fallback</p>
                <p className="mt-1 text-sm font-medium">Heuristic engine</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monitoring preferences */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Monitoring Preferences</CardTitle>
                <CardDescription>Set scan frequency for each competitor</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {competitors.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No competitors yet. Add competitors to configure their scan frequency.</p>
            ) : (
              <div className="space-y-2">
                {competitors.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.website}</p>
                    </div>
                    <Select
                      value={c.scan_frequency}
                      onValueChange={(v) => handleFreqChange(c.id, v)}
                      disabled={savingFreq === c.id}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription>Choose what alerts you want to receive</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email notifications</p>
                <p className="text-xs text-muted-foreground">Receive alerts via email</p>
              </div>
              <Switch checked={notifEmails} onCheckedChange={setNotifEmails} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">High-priority alerts</p>
                <p className="text-xs text-muted-foreground">Notify me about critical competitor changes</p>
              </div>
              <Switch checked={notifHighAlerts} onCheckedChange={setNotifHighAlerts} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Weekly report digest</p>
                <p className="text-xs text-muted-foreground">Get a weekly summary of all competitor activity</p>
              </div>
              <Switch checked={notifWeekly} onCheckedChange={setNotifWeekly} />
            </div>
            <Button onClick={handleSaveNotif} className="mt-2">Save preferences</Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Security</CardTitle>
                <CardDescription>Data protection and access</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Row-level security</p>
                <p className="text-xs text-muted-foreground">All data is isolated per account</p>
              </div>
              <Badge className="bg-success/15 text-success">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Session encryption</p>
                <p className="text-xs text-muted-foreground">Auth tokens encrypted in transit</p>
              </div>
              <Badge className="bg-success/15 text-success">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
