import { Shield, Lock, CreditCard, BadgeCheck } from 'lucide-react';

export const Guarantee = () => {
  const trustItems = [
    {
      icon: CreditCard,
      text: 'Sans carte bancaire',
    },
    {
      icon: Lock,
      text: 'Paiement sécurisé Stripe',
    },
    {
      icon: Shield,
      text: 'Données protégées',
    },
    {
      icon: BadgeCheck,
      text: 'Conforme RGPD',
    },
  ];
  
  return (
    <section className="py-12 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="container">
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
          {trustItems.map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-sm">
              <item.icon className="w-5 h-5 text-primary" />
              <span className="font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
