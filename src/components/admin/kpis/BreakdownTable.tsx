import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportToCsv } from '@/lib/adminKpis';

interface Column<T> {
  key: keyof T | string;
  label: string;
  format?: (value: any, row: T) => string | React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface BreakdownTableProps<T> {
  title: string;
  description?: string;
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  exportFilename?: string;
  pageSize?: number;
  cursor?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyMessage?: string;
}

export function BreakdownTable<T extends Record<string, any>>({
  title,
  description,
  data,
  columns,
  isLoading,
  exportFilename = 'export',
  pageSize = 10,
  cursor,
  hasMore,
  onLoadMore,
  emptyMessage = 'Aucune donnée disponible',
}: BreakdownTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal === bVal) return 0;
    const comparison = aVal > bVal ? 1 : -1;
    return sortDir === 'asc' ? comparison : -comparison;
  });

  // If not using cursor pagination, use local pagination
  const paginatedData = cursor !== undefined 
    ? sortedData 
    : sortedData.slice(page * pageSize, (page + 1) * pageSize);

  const totalPages = Math.ceil(data.length / pageSize);

  const handleExport = () => {
    const exportData = sortedData.map(row => {
      const obj: Record<string, any> = {};
      columns.forEach(col => {
        const key = String(col.key);
        obj[col.label] = row[key];
      });
      return obj;
    });
    exportToCsv(exportData, exportFilename);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead 
                        key={String(col.key)}
                        className={cn(
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.sortable && 'cursor-pointer hover:bg-muted/50'
                        )}
                        onClick={() => col.sortable && handleSort(String(col.key))}
                      >
                        <div className="flex items-center gap-2">
                          {col.label}
                          {col.sortable && (
                            <ArrowUpDown className={cn(
                              "h-4 w-4",
                              sortKey === col.key && "text-primary"
                            )} />
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {columns.map((col) => (
                        <TableCell 
                          key={String(col.key)}
                          className={cn(
                            col.align === 'right' && 'text-right',
                            col.align === 'center' && 'text-center'
                          )}
                        >
                          {col.format 
                            ? col.format(row[String(col.key)], row)
                            : row[String(col.key)] ?? '—'
                          }
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination controls */}
            {cursor !== undefined ? (
              // Cursor-based pagination
              hasMore && (
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" onClick={onLoadMore}>
                    Charger plus
                  </Button>
                </div>
              )
            ) : (
              // Local pagination
              totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} sur {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
