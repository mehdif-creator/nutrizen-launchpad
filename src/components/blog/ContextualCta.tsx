import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { resolveContextualCtaCopy } from '@/lib/blog/cta';

/**
 * Contextual NutriZen CTA inserted inside long articles.
 * The copy adapts to the article topic (search intent) instead of a
 * generic "Essayez NutriZen".
 */
interface ContextualCtaProps {
  /** Article title / keyword used to infer the search intent. */
  topic?: string | null;
  className?: string;
}

export function ContextualCta({ topic, className = '' }: ContextualCtaProps) {
  const copy = resolveContextualCtaCopy(topic);

  return (
    <aside
      className={`my-10 rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-accent/10 p-6 ${className}`}
    >
      <p className="mb-2 text-lg font-bold text-foreground">{copy.headline}</p>
      <p className="mb-4 text-muted-foreground">{copy.body}</p>
      <Link to={copy.to}>
        <Button>{copy.action}</Button>
      </Link>
    </aside>
  );
}
