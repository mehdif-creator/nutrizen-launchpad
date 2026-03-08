import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: 'sm' | 'default';
  className?: string;
}

export function FavoriteButton({ isFavorite, onClick, size = 'sm', className }: FavoriteButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'rounded-full transition-all',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        isFavorite ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-400',
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick(e);
      }}
    >
      <Heart
        className={cn(
          size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
          isFavorite && 'fill-current'
        )}
      />
    </Button>
  );
}
