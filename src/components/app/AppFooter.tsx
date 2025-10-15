import { Link } from 'react-router-dom';
import { Shield, Lock, CreditCard } from 'lucide-react';

export const AppFooter = () => {
  return (
    <footer className="border-t bg-muted/30 py-8 mt-auto">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold mb-4">Produit</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/app" className="hover:text-foreground">Fonctionnement</Link></li>
              <li><Link to="/app/mealplan" className="hover:text-foreground">Exemples</Link></li>
              <li><Link to="/app/settings" className="hover:text-foreground">Tarifs</Link></li>
              <li><Link to="/blog" className="hover:text-foreground">Blog</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Ressources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/app/support" className="hover:text-foreground">Aide</Link></li>
              <li><a href="#" className="hover:text-foreground">Guides</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Légal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/legal/cgv" className="hover:text-foreground">CGV</Link></li>
              <li><Link to="/legal/confidentialite" className="hover:text-foreground">Confidentialité</Link></li>
              <li><Link to="/legal/mentions" className="hover:text-foreground">Mentions légales</Link></li>
              <li><Link to="/legal/resiliation" className="hover:text-foreground">Résiliation</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Entreprise</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">À propos</a></li>
              <li><a href="#" className="hover:text-foreground">Contact</a></li>
              <li><a href="#" className="hover:text-foreground">RC Pro</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>RGPD OK</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Données sécurisées</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Stripe Secure</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            © 2025 NutriZen. Tous droits réservés. 🇫🇷
          </p>
        </div>
      </div>
    </footer>
  );
};
