import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { BreakdownRow } from '@/lib/adminKpis';

interface BarChartCardProps {
  title: string;
  description?: string;
  data: BreakdownRow[];
  isLoading?: boolean;
  color?: string;
  formatValue?: (value: number) => string;
  height?: number;
  horizontal?: boolean;
  stacked?: {
    data: any[];
    bars: { key: string; color: string; label: string }[];
  };
  colors?: string[];
}

const DEFAULT_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(156 62% 50%)',
  'hsl(24 95% 60%)',
  'hsl(200 80% 50%)',
  'hsl(280 70% 55%)',
];

export function BarChartCard({
  title,
  description,
  data,
  isLoading,
  color = 'hsl(var(--primary))',
  formatValue = (v) => v.toLocaleString('fr-FR'),
  height = 300,
  horizontal = false,
  stacked,
  colors = DEFAULT_COLORS,
}: BarChartCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = stacked?.data || data;

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Aucune donnée disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            layout={horizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            {horizontal ? (
              <>
                <XAxis type="number" tickFormatter={formatValue} />
                <YAxis dataKey="segment" type="category" tick={{ fontSize: 12 }} width={100} />
              </>
            ) : (
              <>
                <XAxis dataKey="segment" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatValue} />
              </>
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string) => [formatValue(value), name]}
            />
            {stacked ? (
              <>
                <Legend />
                {stacked.bars.map((bar) => (
                  <Bar
                    key={bar.key}
                    dataKey={bar.key}
                    name={bar.label}
                    fill={bar.color}
                    stackId="stack"
                  />
                ))}
              </>
            ) : (
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
