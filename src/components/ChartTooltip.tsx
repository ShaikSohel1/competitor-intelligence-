import { type TooltipProps } from 'recharts';

interface ChartTooltipProps extends TooltipProps<number, string> {
  labelFormatter?: (label: unknown) => string;
}

export function ChartTooltip({ active, payload, label, labelFormatter }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <p className="mb-1.5 font-medium text-foreground">{labelFormatter ? labelFormatter(label) : String(label)}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium tabular-nums text-foreground">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : String(entry.value ?? '')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
