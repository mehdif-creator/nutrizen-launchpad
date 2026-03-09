import { Facebook, Twitter, Instagram, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SocialShareButtonsProps {
  url: string;
  text: string;
}

export function SocialShareButtons({ url, text }: SocialShareButtonsProps) {
  const { toast } = useToast();

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const handleInstagram = async () => {
    await navigator.clipboard.writeText(url);
    toast({
      title: 'Lien copié ! 📸',
      description: 'Colle-le dans ta story Instagram.',
    });
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button size="icon" variant="outline" className="rounded-full h-10 w-10">
          <Facebook className="h-4 w-4" />
        </Button>
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button size="icon" variant="outline" className="rounded-full h-10 w-10">
          <Twitter className="h-4 w-4" />
        </Button>
      </a>
      <Button
        size="icon"
        variant="outline"
        className="rounded-full h-10 w-10"
        onClick={handleInstagram}
      >
        <Instagram className="h-4 w-4" />
      </Button>
      <a
        href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button size="icon" variant="outline" className="rounded-full h-10 w-10">
          <MessageCircle className="h-4 w-4" />
        </Button>
      </a>
    </div>
  );
}
