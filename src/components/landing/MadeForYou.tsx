import { Card } from '@/components/ui/card';

const columns = [
  {
    emoji: '🕐',
    title: 'Vous perdez du temps à décider',
    text: 'Vous passez plus de temps à décider quoi cuisiner qu\'à cuisiner. Chaque soir c\'est la même question sans bonne réponse.',
  },
  {
    emoji: '🛒',
    title: 'Vous jetez de la nourriture',
    text: 'Des légumes au fond du frigo, des restes oubliés... Vous achetez sans plan et vous gaspillez sans le vouloir.',
  },
  {
    emoji: '🤷',
    title: 'Vous mangez toujours la même chose',
    text: 'Vous avez 5 recettes en rotation depuis 3 ans. Pas par manque de goût — par manque de temps pour chercher.',
  },
];

export const MadeForYou = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          NutriZen est fait pour vous si...
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
          Si vous vous reconnaissez dans l'un de ces cas — NutriZen a été conçu pour vous.
        </p>
      </div>
    </section>
  );
};
