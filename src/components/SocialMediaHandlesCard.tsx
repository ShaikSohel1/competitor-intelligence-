import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Linkedin,
  Youtube,
  Instagram,
  Facebook,
  ExternalLink,
  Users,
  Edit2,
  Save,
  X,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { scanCompetitor } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { formatRelativeTime } from '@/lib/format';
import type { SocialProfile } from '@/types';
import { supabase } from '@/lib/supabase';

interface SocialMediaHandlesCardProps {
  competitor: {
    id: string;
    name: string;
    social_links: Record<string, string> | null;
  };
  socialProfiles: SocialProfile[];
  onRefresh?: () => void;
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { id: 'twitter', label: 'X (Twitter)', isCustom: true, color: 'currentColor' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: '#FF0000' },
];

export function SocialMediaHandlesCard({
  competitor,
  socialProfiles,
  onRefresh,
}: SocialMediaHandlesCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [handles, setHandles] = useState<Record<string, string>>(
    competitor.social_links || {}
  );
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Filter out empty handles
      const cleanedHandles = Object.fromEntries(
        Object.entries(handles).filter(([_, v]) => v.trim() !== '')
      );
      
      const { error } = await supabase
        .from('competitors')
        .update({ social_links: cleanedHandles })
        .eq('id', competitor.id);
        
      if (error) throw error;
      
      toast({
        title: 'Social handles saved',
        description: 'The competitor social links have been updated.',
      });
      setIsEditing(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast({
        title: 'Error saving handles',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await scanCompetitor(competitor.id);
      toast({
        title: 'Scan completed',
        description: 'Social profiles data has been updated.',
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast({
        title: 'Error scanning',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Social Media Profiles</CardTitle>
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleScan}
                disabled={isScanning}
              >
                {isScanning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Scan Profiles
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Handles
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setHandles(competitor.social_links || {});
                  setIsEditing(false);
                }}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLATFORMS.map((platform) => (
              <div key={platform.id} className="space-y-2">
                <Label htmlFor={`handle-${platform.id}`} className="flex items-center space-x-2">
                  {platform.isCustom ? (
                    <svg viewBox="0 0 24 24" fill={platform.color} className="h-4 w-4">
                      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                    </svg>
                  ) : platform.icon && (
                    <platform.icon className="h-4 w-4" style={{ color: platform.color }} />
                  )}
                  <span>{platform.label}</span>
                </Label>
                <Input
                  id={`handle-${platform.id}`}
                  placeholder="https://..."
                  value={handles[platform.id] || ''}
                  onChange={(e) =>
                    setHandles((prev) => ({ ...prev, [platform.id]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLATFORMS.map((platform) => {
              const handle = competitor.social_links?.[platform.id];
              const profile = socialProfiles.find((p) => p.platform === platform.id);

              return (
                <div
                  key={platform.id}
                  className="flex flex-col space-y-2 p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {platform.isCustom ? (
                        <svg viewBox="0 0 24 24" fill={platform.color} className="h-5 w-5">
                          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                        </svg>
                      ) : platform.icon && (
                        <platform.icon className="h-5 w-5" style={{ color: platform.color }} />
                      )}
                      <span className="font-medium text-sm">{platform.label}</span>
                    </div>
                    {profile?.data_source === 'live' && (
                      <Badge variant="outline" className="text-success border-success bg-success/10 text-[10px]">
                        Live
                      </Badge>
                    )}
                  </div>
                  
                  {handle ? (
                    <>
                      <a
                        href={handle}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline flex items-center space-x-1 truncate"
                        title={handle}
                      >
                        <span className="truncate">{handle.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                      
                      {profile ? (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t text-sm">
                          <div className="flex items-center space-x-1 font-semibold">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{formatCompactNumber(profile.followers || 0)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatRelativeTime(profile.captured_at)}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 pt-2 border-t text-sm text-muted-foreground text-xs italic">
                          Not yet scraped
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-2 pt-2 border-t text-sm text-muted-foreground text-xs italic">
                      Not configured
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
