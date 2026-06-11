import { Linkedin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface AuthorBioProps {
  name?: string;
  title?: string;
  avatarUrl?: string;
  bio?: string;
  linkedinUrl?: string;
}

/**
 * Discreet author block displayed at the bottom of a blog article to
 * reinforce E-E-A-T signals. Pure presentational — uses semantic tokens.
 */
export function AuthorBio({
  name = 'Équipe NutriZen',
  title = 'Experts en nutrition & coachs santé',
  avatarUrl = '/icons/icon-192.png',
  bio = "L'équipe NutriZen réunit nutritionnistes et coachs sportifs pour concevoir des menus personnalisés, équilibrés et adaptés à votre quotidien.",
  linkedinUrl,
}: AuthorBioProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      aria-label="À propos de l'auteur"
      className="mt-12 rounded-2xl border border-border bg-muted/30 p-6"
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 shrink-0 ring-2 ring-background">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Écrit par
              </p>
              <h3 className="text-base font-bold text-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
            {linkedinUrl && (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                aria-label={`Profil LinkedIn de ${name}`}
              >
                <Linkedin className="h-4 w-4" />
                <span className="hidden sm:inline">LinkedIn</span>
              </a>
            )}
          </div>
          {bio && <p className="mt-3 text-sm leading-relaxed text-foreground/80">{bio}</p>}
        </div>
      </div>
    </aside>
  );
}
