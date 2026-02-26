import { Card } from '@/components/ui/card';

const columns = [
  {
    emoji: '🧠',
    title: 'La question du dîner vous épuise',
    text: "Avant même d'ouvrir le frigo, la question « on mange quoi ce soir ? » est déjà une source de stress. Et elle revient tous les jours.",
  },
  {
    emoji: '🗑️',
    title: 'Vous jetez des aliments chaque semaine',
    text: "Des légumes oubliés, des restes que personne n'a mangés, des produits achetés sans plan précis. Vous gaspillez sans le vouloir.",
  },
  {
    emoji: '👨‍👩‍👧‍👦',
    title: 'Vous cuisinez 3 versions différentes',
    text: "L'un ne mange pas de légumes, l'autre est allergique, votre conjoint préfère autre chose. Vous gérez tout ça seule, soir après soir.",
  },
];

export const MumMadeForYou = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          NutriZen Mum est fait pour vous si...
        </h2>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
          {columns.map((col) => (
            <Card key={col.title} className="p-6 text-center border-border">
              <div className="text-4xl mb-4">{col.emoji}</div>
              <h3 className="font-bold text-lg mb-2">{col.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{col.text}</p>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground italic">
          Si vous vous reconnaissez — NutriZen Mum a été conçu précisément pour vous.
        </p>
      </div>
    </section>
  );
};
