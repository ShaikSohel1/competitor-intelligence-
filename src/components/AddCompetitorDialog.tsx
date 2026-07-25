import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createCompetitor, scanCompetitor } from '@/lib/api';
import { normalizeUrl } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';

interface AddCompetitorDialogProps {
  trigger?: React.ReactNode;
  onAdded?: () => void;
}

export function AddCompetitorDialog({ trigger, onAdded }: AddCompetitorDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  function reset() {
    setName('');
    setWebsite('');
    setIndustry('');
    setDescription('');
    setKeywords('');
    setLinkedin('');
    setTwitter('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Competitor name is required.');
      return;
    }
    if (!website.trim()) {
      setError('Company website is required.');
      return;
    }

    setLoading(true);
    try {
      const social_links: Record<string, string> = {};
      if (linkedin.trim()) social_links.linkedin = normalizeUrl(linkedin);
      if (twitter.trim()) social_links.twitter = normalizeUrl(twitter);

      const competitor = await createCompetitor({
        name: name.trim(),
        website: normalizeUrl(website),
        industry: industry.trim() || undefined,
        description: description.trim() || undefined,
        social_links,
        tracked_keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      });

      toast({ title: 'Competitor added', description: `${competitor.name} is now being tracked.` });

      // Kick off initial scan in the background
      setScanning(true);
      try {
        await scanCompetitor(competitor.id);
        toast({ title: 'Initial scan complete', description: `${competitor.name} has been scanned.` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Scan failed';
        toast({ title: 'Scan queued', description: msg, variant: 'destructive' });
      } finally {
        setScanning(false);
      }

      setOpen(false);
      reset();
      onAdded?.();
      navigate(`/app/competitors/${competitor.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add competitor.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) reset();
    }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Competitor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a competitor</DialogTitle>
          <DialogDescription>
            Enter your competitor's details. We'll run an initial scan right away.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-name">Competitor name *</Label>
              <Input id="c-name" placeholder="Acme Inc." value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-website">Website *</Label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="c-website" placeholder="acme.com" className="pl-9" value={website} onChange={(e) => setWebsite(e.target.value)} disabled={loading} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-industry">Industry</Label>
            <Input id="c-industry" placeholder="SaaS, E-commerce, Fintech..." value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-desc">Description</Label>
            <Textarea id="c-desc" placeholder="Brief description of the competitor..." rows={2} value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-keywords">Tracked keywords</Label>
            <Input id="c-keywords" placeholder="crm software, sales automation, lead tracking" value={keywords} onChange={(e) => setKeywords(e.target.value)} disabled={loading} />
            <p className="text-xs text-muted-foreground">Comma-separated keywords to track for this competitor.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-linkedin">LinkedIn URL</Label>
              <Input id="c-linkedin" placeholder="linkedin.com/company/acme" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-twitter">X / Twitter URL</Label>
              <Input id="c-twitter" placeholder="x.com/acme" value={twitter} onChange={(e) => setTwitter(e.target.value)} disabled={loading} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || scanning}>
            {loading || scanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {scanning ? 'Scanning...' : 'Adding...'}
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" /> Add & Scan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
