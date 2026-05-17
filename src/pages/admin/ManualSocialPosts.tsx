import { AppFooter } from '@/components/app/AppFooter';
import { useManualSocialPosts } from '@/hooks/useManualSocialPosts';
import { ManualSocialPostFilters } from '@/components/admin/social/ManualSocialPostFilters';
import { ManualSocialPostsList } from '@/components/admin/social/ManualSocialPostsList';
import { ManualSocialPostDetail } from '@/components/admin/social/ManualSocialPostDetail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, ImageIcon, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ManualSocialPosts() {
  const {
    posts,
    loading,
    error,
    filters,
    setFilters,
    selectedPost,
    selectedId,
    setSelectedId,
    fetchPosts,
    markAsPosted,
    archivePost,
    restorePost,
    updateNotes,
    generateDefaultDescription,
    counts,
    distinctBoards,
    boardDistribution,
    sortLeastFed,
    setSortLeastFed,
  } = useManualSocialPosts();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/admin"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Admin
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-sm font-medium">Posts manu RS</span>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ImageIcon className="h-8 w-8 text-primary" />
              Posts manu RS
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestion manuelle des publications réseaux sociaux
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPosts} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Status counters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Badge variant="secondary" className="px-3 py-1.5 text-sm font-medium">
            Prêts: {counts.ready}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-sm bg-primary/10 text-primary">
            Publiés: {counts.posted}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-sm">
            Archivés: {counts.archived}
          </Badge>
        </div>

        {/* Board distribution */}
        {boardDistribution.length > 0 && (
          <div className="mb-6 p-4 rounded-lg border bg-card">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
              Répartition par tableau
              <span className="text-xs text-muted-foreground font-normal">(posts prêts)</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {boardDistribution.map((b) => (
                <Badge key={b.board_slug} variant="outline" className="text-xs px-2.5 py-1">
                  {b.board_name} : {b.count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <ManualSocialPostFilters filters={filters} onChange={setFilters} boards={distinctBoards} />

        {/* Sort toggle */}
        <div className="flex items-center gap-2 mt-4">
          <Switch id="sort-least-fed" checked={sortLeastFed} onCheckedChange={setSortLeastFed} />
          <Label htmlFor="sort-least-fed" className="text-sm cursor-pointer">
            Moins alimentés d'abord
          </Label>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left: list */}
          <div className="lg:col-span-5 xl:col-span-4">
            <ManualSocialPostsList
              posts={posts}
              loading={loading}
              error={error}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onRetry={fetchPosts}
            />
          </div>
          {/* Right: detail */}
          <div className="lg:col-span-7 xl:col-span-8">
            <ManualSocialPostDetail
              post={selectedPost}
              onMarkPosted={markAsPosted}
              onArchive={archivePost}
              onRestore={restorePost}
              onUpdateNotes={updateNotes}
              onGenerateDescription={generateDefaultDescription}
            />
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
