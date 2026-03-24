import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

import type { PostStatus } from '@/hooks/useManualSocialPosts';

interface Filters {
  search: string;
  status: PostStatus | 'all';
  platform: string;
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

export function ManualSocialPostFilters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par titre…"
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>
      <Select value={filters.status} onValueChange={v => onChange({ ...filters, status: v as PostStatus | 'all' })}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="ready">Prêt</SelectItem>
          <SelectItem value="posted">Publié</SelectItem>
          <SelectItem value="archived">Archivé</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.platform} onValueChange={v => onChange({ ...filters, platform: v })}>
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="Plateforme" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          <SelectItem value="both">Les deux</SelectItem>
          <SelectItem value="pinterest">Pinterest</SelectItem>
          <SelectItem value="instagram">Instagram</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
