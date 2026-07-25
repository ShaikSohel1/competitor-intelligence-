import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Globe, Linkedin, Youtube, Instagram, Facebook, DollarSign } from 'lucide-react';
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
  const [pricingUrl, setPricingUrl] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [youtube, setYoutube] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSocials, setShowSocials] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  function reset() {
    setName('');
    setWebsite('');
    setIndustry('');
    setDescription('');
    setKeywords('');
    setPricingUrl('');
    setLinkedin('');
    setTwitter('');
    setInstagram('');
    setFacebook('');
    setYoutube('');
    setError(null);
    setShowSocials(false);
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
      if (instagram.trim()) social_links.instagram = normalizeUrl(instagram);
      if (facebook.trim()) social_links.facebook = normalizeUrl(facebook);
      if (youtube.trim()) social_links.youtube = normalizeUrl(youtube);

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
        toast({ title: 'Initial scan complete', description: `${competitor.name} has been scanned with live data.` });
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

  const XIcon = () => (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a competitor</DialogTitle>
          <DialogDescription>
            Enter your competitor's details. We'll run a comprehensive scan across website, SEO, social media, pricing, and advertising.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-industry">Industry</Label>
              <Input id="c-industry" placeholder="SaaS, E-commerce, Fintech..." value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-pricing-url">Pricing page URL</Label>
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="c-pricing-url" placeholder="acme.com/pricing" className="pl-9" value={pricingUrl} onChange={(e) => setPricingUrl(e.target.value)} disabled={loading} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-desc">Description</Label>
            <Textarea id="c-desc" placeholder="Brief description of the competitor..." rows={2} value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-keywords">Tracked keywords</Label>
            <Input id="c-keywords" placeholder="crm software, sales automation, lead tracking" value={keywords} onChange={(e) => setKeywords(e.target.value)} disabled={loading} />
            <p className="text-xs text-muted-foreground">Comma-separated keywords to track for SERP rankings.</p>
          </div>

          {/* Social Media Handles */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowSocials(!showSocials)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className={`h-3.5 w-3.5 transition-transform ${showSocials ? 'rotate-45' : ''}`} />
              {showSocials ? 'Hide' : 'Add'} social media handles
            </button>

            {showSocials && (
              <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4 animate-in slide-in-from-top-2">
                <p className="text-xs text-muted-foreground">Add social media profiles to scrape real follower counts, posts, and engagement data.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="c-linkedin" className="flex items-center gap-1.5 text-xs">
                      <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" /> LinkedIn
                    </Label>
                    <Input id="c-linkedin" placeholder="linkedin.com/company/acme" className="h-8 text-sm" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-twitter" className="flex items-center gap-1.5 text-xs">
                      <span className="text-foreground"><XIcon /></span> X / Twitter
                    </Label>
                    <Input id="c-twitter" placeholder="x.com/acme" className="h-8 text-sm" value={twitter} onChange={(e) => setTwitter(e.target.value)} disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-instagram" className="flex items-center gap-1.5 text-xs">
                      <Instagram className="h-3.5 w-3.5 text-[#E4405F]" /> Instagram
                    </Label>
                    <Input id="c-instagram" placeholder="instagram.com/acme" className="h-8 text-sm" value={instagram} onChange={(e) => setInstagram(e.target.value)} disabled={loading} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="c-facebook" className="flex items-center gap-1.5 text-xs">
                      <Facebook className="h-3.5 w-3.5 text-[#1877F2]" /> Facebook
                    </Label>
                    <Input id="c-facebook" placeholder="facebook.com/acme" className="h-8 text-sm" value={facebook} onChange={(e) => setFacebook(e.target.value)} disabled={loading} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="c-youtube" className="flex items-center gap-1.5 text-xs">
                      <Youtube className="h-3.5 w-3.5 text-[#FF0000]" /> YouTube
                    </Label>
                    <Input id="c-youtube" placeholder="youtube.com/@acme or channel ID" className="h-8 text-sm" value={youtube} onChange={(e) => setYoutube(e.target.value)} disabled={loading} />
                  </div>
                </div>
              </div>
            )}
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
