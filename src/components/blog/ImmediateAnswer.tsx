/**
 * "Réponse rapide" block — answers the search query immediately,
 * before the long-form content. Rendered only when the article actually
 * provides a summary (never fabricated).
 */
interface ImmediateAnswerProps {
  /** 2–4 useful sentences summarising the answer. */
  answer?: string | null;
  className?: string;
}

export function ImmediateAnswer({ answer, className = '' }: ImmediateAnswerProps) {
  const text = (answer || '').trim();
  if (text.length < 60) return null;

  return (
    <aside
      className={`mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 ${className}`}
      aria-label="Réponse rapide"
    >
      <h2 className="mb-2 text-base font-bold uppercase tracking-wide text-primary">
        Réponse rapide
      </h2>
      <p className="text-base leading-relaxed text-foreground">{text}</p>
    </aside>
  );
}
