import { Users } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Competitor } from '@/types';

interface CompetitorFilterProps {
  competitors: Competitor[];
  value: string;
  onChange: (value: string) => void;
}

export function CompetitorFilter({ competitors, value, onChange }: CompetitorFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-56">
        <Users className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="All competitors" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All competitors</SelectItem>
        {competitors.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
