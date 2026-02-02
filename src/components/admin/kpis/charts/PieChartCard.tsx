import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BreakdownRow } from '@/lib/adminKpis';

interface PieChartCardProps {
  title: string;
  description?: string;
  data: BreakdownRow[];
  isLoading?: boolean;
  formatValue?: (value: number) => string;
  height?: number;
  colors?: string[];
  showPercentage?: boolean;
}

const DEFAULT_COLORS = [
  'hsl(156 62% 45%)',
  'hsl(24 95% 55%)',
  'hsl(200 80% 50%)',
  'hsl(280 70% 55%)',
  'hsl(45 90% 50%)',
  'hsl(340 70% 55%)',
];

export function PieChartCard({
  title,
  description,
  data,
  isLoading,
  formatValue = (v) => v.toLocaleString('fr-FR'),
  height = 300,
  colors = DEFAULT_COLORS,
  showPercentage = true,
}: PieChartCardProps) {
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

  if (!data || data.length === 0) {
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
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              dataKey="value"
              nameKey="segment"
              label={({ name, percent }) => 
                showPercentage ? `${name}: ${(percent * 100).toFixed(0)}%` : name
              }
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string) => [
                `${formatValue(value)} (${data.find(d => d.segment === name)?.percentage?.toFixed(1)}%)`,
                name
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
