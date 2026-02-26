import { ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export const GuaranteeCard = () => {
  return (
    <section className="py-16 md:py-20">
      <div className="container flex justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="max-w-[680px] w-full rounded-2xl border-[1.5px] border-accent/60 bg-[hsl(var(--card))] p-10 md:p-12 text-center"
          style={{ boxShadow: '0 0 40px hsl(24 95% 52% / 0.15)' }}
        >
          {/* Shield icon with glow */}
          <motion.div
            initial={{ scale: 1 }}
            whileInView={{ scale: [1, 1.1, 1] }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
            className="mx-auto mb-5 flex h-16 w-16 md:h-[64px] md:w-[64px] items-center justify-center"
            style={{ filter: 'drop-shadow(0 0 20px hsl(24 95% 52% / 0.4))' }}
          >
            <ShieldCheck className="h-12 w-12 md:h-16 md:w-16 text-accent" />
          </motion.div>

          {/* Headline */}
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
            Satisfait ou remboursé — 30&nbsp;jours, sans&nbsp;question.
          </h3>

          {/* Body */}
          <p className="mx-auto mt-5 max-w-[500px] text-base text-muted-foreground leading-[1.7]">
            Si NutriZen ne simplifie pas votre quotidien dans les 30&nbsp;premiers jours,
            nous vous remboursons intégralement. Un email suffit. Pas de formulaire.
            Pas de délai. Pas de justification demandée.
          </p>

          {/* Trust pill */}
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5">
            <span className="text-xs md:text-sm italic text-accent/80">
              ✓ Depuis 2023, moins de 1% de nos utilisateurs ont demandé un remboursement.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
