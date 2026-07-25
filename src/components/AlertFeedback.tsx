import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { updateAlertFeedback } from '@/lib/api';

interface AlertFeedbackProps {
  alertId: string;
  initialFeedback?: 'relevant' | 'not_relevant' | null;
}

export function AlertFeedback({ alertId, initialFeedback = null }: AlertFeedbackProps) {
  const [feedback, setFeedback] = useState<'relevant' | 'not_relevant' | null>(initialFeedback);
  const [isLoading, setIsLoading] = useState(false);

  const handleFeedback = async (type: 'relevant' | 'not_relevant') => {
    // If clicking the already selected feedback, we might want to un-select it, 
    // but the requirements say "call the API and update local state to highlight the selected button".
    // We'll just ignore clicks if already selected for simplicity, or we could toggle.
    if (feedback === type || isLoading) return;
    
    setIsLoading(true);
    try {
      await updateAlertFeedback(alertId, type);
      setFeedback(type);
    } catch (error) {
      console.error('Failed to update feedback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-1">
      <span className="text-xs text-muted-foreground mr-2">Was this helpful?</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${feedback === 'relevant' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
              onClick={() => handleFeedback('relevant')}
              disabled={isLoading}
            >
              <ThumbsUp className={`h-4 w-4 ${feedback === 'relevant' ? 'fill-current' : ''}`} />
              <span className="sr-only">Helpful</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Helpful</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 ${feedback === 'not_relevant' ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground'}`}
              onClick={() => handleFeedback('not_relevant')}
              disabled={isLoading}
            >
              <ThumbsDown className={`h-4 w-4 ${feedback === 'not_relevant' ? 'fill-current' : ''}`} />
              <span className="sr-only">Not helpful</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Not helpful</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
