import { Link } from "react-router-dom";
import { Shield, Lock, CreditCard } from "lucide-react";

export const AppFooter = () => {
  return (
    <footer className="border-t bg-muted/30 py-8 mt-auto">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8">
          <div>
            <div className="flex items-center mb-4">
              <img
                src={new URL("@/assets/nutrizen-main-logo.png", import.meta.url).href}
                alt="NutriZen Logo"
                className="h-12 w-auto"
              />
            </div>
            <p className="text-sm text-muted-foreground">L'assistant qui organise tes repas en 30 secondes.</p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Ressources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/blog" className="hover:text-foreground">
                  Blog
                </Link>
              </li>
              <li>
                <a href="/#faq" className="hover:text-foreground">
                  FAQ
                </a>
              </li>
              <li>
                <Link to="/contact" className="hover:text-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Légal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/legal/cgv" className="hover:text-foreground">
                  CGV
                </Link>
              </li>
              <li>
                <Link to="/legal/confidentialite" className="hover:text-foreground">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link to="/legal/mentions" className="hover:text-foreground">
                  Mentions légales
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Entreprise</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/a-propos" className="hover:text-foreground">
                  À propos
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Nos offres</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/fit" className="hover:text-foreground">
                  NutriZen Fit
                </Link>
              </li>
              <li>
                <Link to="/mum" className="hover:text-foreground">
                  NutriZen Mum
                </Link>
              </li>
              <li>
                <Link to="/pro" className="hover:text-foreground">
                  NutriZen Pro
                </Link>
              </li>
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

          <p className="text-sm text-muted-foreground">© 2026 NutriZen. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};
