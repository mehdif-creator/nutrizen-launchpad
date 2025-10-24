import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Signup() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSignup = () => {
    // Redirect to home page with pricing section
    window.location.href = '/#tarifs';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-primary/10 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-card p-8 border">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{t('signup.title')}</h1>
            <p className="text-muted-foreground">
              {t('signup.subtitle')}
            </p>
          </div>

          <div className="space-y-6">
            <div className="text-center space-y-2 mb-6 p-4 bg-accent/10 rounded-lg">
              <p className="text-sm">
                {t('signup.info')}
              </p>
              <p className="text-sm font-semibold text-primary">
                {t('signup.benefit')}
              </p>
            </div>

            <Button
              onClick={handleSignup}
              className="w-full"
              size="lg"
            >
              {t('signup.viewPlans')}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {t('signup.hasAccount')}{' '}
              <a href="/auth/login" className="text-primary hover:underline">
                {t('signup.login')}
              </a>
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
            {t('signup.backHome')}
          </a>
        </div>
      </div>
    </div>
  );
}
