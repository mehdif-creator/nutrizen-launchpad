import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

/**
 * Calculateur de quantité de pâtes (article /blog/combien-pates-par-personne).
 *
 * Progressive enhancement : le tableau de référence de l'article reste visible
 * sans JavaScript, ce composant ne fait qu'appliquer ces mêmes repères.
 * Les valeurs sont des repères culinaires indicatifs, pas des besoins
 * nutritionnels médicaux.
 */

type Role = 'plat' | 'accompagnement';
type Kind = 'seches' | 'fraiches';

/** Repères en grammes de pâtes sèches, par personne. */
const DRY_REFERENCE: Record<Role, { adult: [number, number]; child: [number, number] }> = {
  plat: { adult: [80, 100], child: [40, 60] },
  accompagnement: { adult: [50, 60], child: [30, 40] },
};

/** Les pâtes fraîches contiennent déjà de l'eau : il en faut davantage au poids. */
const FRESH_FACTOR = 1.25;

const clampInt = (value: string, min: number, max: number) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

export function PastaCalculator() {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [role, setRole] = useState<Role>('plat');
  const [kind, setKind] = useState<Kind>('seches');

  const result = useMemo(() => {
    const ref = DRY_REFERENCE[role];
    const factor = kind === 'fraiches' ? FRESH_FACTOR : 1;
    // Repères culinaires : on arrondit à 5 g près pour éviter une fausse précision.
    const round5 = (n: number) => Math.round(n / 5) * 5;
    const low = round5((adults * ref.adult[0] + children * ref.child[0]) * factor);
    const high = round5((adults * ref.adult[1] + children * ref.child[1]) * factor);
    // Rendement approximatif à la cuisson pour les pâtes sèches (x2 à x2,5).
    const cookedLow = kind === 'seches' ? Math.round(low * 2) : null;
    const cookedHigh = kind === 'seches' ? Math.round(high * 2.5) : null;
    return { low, high, cookedLow, cookedHigh };
  }, [adults, children, role, kind]);

  const people = adults + children;

  return (
    <section
      className="my-10 rounded-2xl border border-border bg-muted/40 p-5 md:p-6"
      aria-label="Calculateur de quantité de pâtes"
    >
      <h2 className="mb-1 text-xl font-bold">Calculateur : quelle quantité de pâtes prévoir ?</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Indiquez le nombre de convives et le rôle du plat. Le résultat est un repère de cuisine
        indicatif, à ajuster selon l’appétit et le reste du repas.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pasta-adults">Adultes</Label>
          <Input
            id="pasta-adults"
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={adults}
            onChange={(e) => setAdults(clampInt(e.target.value, 0, 20))}
            className="mt-1 text-base"
          />
        </div>
        <div>
          <Label htmlFor="pasta-children">Enfants (environ 4–10 ans)</Label>
          <Input
            id="pasta-children"
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            value={children}
            onChange={(e) => setChildren(clampInt(e.target.value, 0, 20))}
            className="mt-1 text-base"
          />
        </div>
        <div>
          <Label htmlFor="pasta-role">Rôle des pâtes</Label>
          <select
            id="pasta-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          >
            <option value="plat">Plat principal</option>
            <option value="accompagnement">Accompagnement</option>
          </select>
        </div>
        <div>
          <Label htmlFor="pasta-kind">Type de pâtes</Label>
          <select
            id="pasta-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          >
            <option value="seches">Pâtes sèches (paquet)</option>
            <option value="fraiches">Pâtes fraîches</option>
          </select>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4" aria-live="polite">
        {people === 0 ? (
          <p className="text-base font-medium">Indiquez au moins une personne.</p>
        ) : (
          <>
            <p className="text-lg font-bold text-foreground" data-testid="pasta-result">
              {result.low === result.high
                ? `${result.low} g`
                : `${result.low} à ${result.high} g`}{' '}
              de pâtes {kind === 'fraiches' ? 'fraîches' : 'sèches'}
            </p>
            <p className="text-sm text-muted-foreground">
              pour {people} personne{people > 1 ? 's' : ''}
              {result.cookedLow
                ? ` — soit environ ${result.cookedLow} à ${result.cookedHigh} g de pâtes cuites`
                : ''}
              .
            </p>
          </>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Repères culinaires indicatifs. Ce calculateur ne remplace pas un avis diététique
        personnalisé.
      </p>
    </section>
  );
}
