import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronRight, 
  ChevronLeft, 
  Users, 
  Clock, 
  AlertTriangle, 
  Utensils, 
  Target, 
  Frown,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface QuizOption {
  id: string;
  label: string;
  emoji?: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  icon: React.ReactNode;
  options: QuizOption[];
}

const questions: QuizQuestion[] = [
  {
    id: 'household',
    question: 'Tu cuisines pour combien de personnes ?',
    icon: <Users className="w-6 h-6" />,
    options: [
      { id: '1', label: 'Juste moi', emoji: '🧑' },
      { id: '2', label: 'En couple', emoji: '👫' },
      { id: '3-4', label: 'Famille (3-4)', emoji: '👨‍👩‍👧' },
      { id: '5+', label: 'Grande famille (5+)', emoji: '👨‍👩‍👧‍👦' },
    ],
  },
  {
    id: 'time',
    question: 'Combien de temps as-tu pour cuisiner le soir ?',
    icon: <Clock className="w-6 h-6" />,
    options: [
      { id: '15', label: '15 min max', emoji: '⚡' },
      { id: '30', label: '20-30 min', emoji: '⏱️' },
      { id: '45', label: '30-45 min', emoji: '🍳' },
      { id: '60+', label: '1h ou plus', emoji: '👨‍🍳' },
    ],
  },
  {
    id: 'allergies',
    question: 'Des allergies ou restrictions à gérer ?',
    icon: <AlertTriangle className="w-6 h-6" />,
    options: [
      { id: 'none', label: 'Aucune', emoji: '✅' },
      { id: 'gluten', label: 'Sans gluten', emoji: '🌾' },
      { id: 'lactose', label: 'Sans lactose', emoji: '🥛' },
      { id: 'multiple', label: 'Plusieurs', emoji: '⚠️' },
    ],
  },
  {
    id: 'skill',
    question: 'Ton niveau en cuisine ?',
    icon: <Utensils className="w-6 h-6" />,
    options: [
      { id: 'beginner', label: 'Débutant(e)', emoji: '🥄' },
      { id: 'intermediate', label: 'Je me débrouille', emoji: '🍴' },
      { id: 'advanced', label: 'À l\'aise', emoji: '🔪' },
      { id: 'expert', label: 'Passionné(e)', emoji: '⭐' },
    ],
  },
  {
    id: 'goal',
    question: 'Ton objectif principal ?',
    icon: <Target className="w-6 h-6" />,
    options: [
      { id: 'time', label: 'Gagner du temps', emoji: '⏰' },
      { id: 'health', label: 'Manger plus sain', emoji: '🥗' },
      { id: 'budget', label: 'Réduire le budget', emoji: '💰' },
      { id: 'variety', label: 'Plus de variété', emoji: '🌈' },
    ],
  },
  {
    id: 'pain',
    question: 'Ta plus grande frustration avec les repas ?',
    icon: <Frown className="w-6 h-6" />,
    options: [
      { id: 'decide', label: 'Décider quoi faire', emoji: '🤯' },
      { id: 'picky', label: 'Enfants difficiles', emoji: '😤' },
      { id: 'shopping', label: 'Faire les courses', emoji: '🛒' },
      { id: 'cooking', label: 'Cuisiner après le travail', emoji: '😩' },
    ],
  },
];

type ProfileType = 'express' | 'perfectionist' | 'juggler' | 'explorer';

interface ProfileResult {
  type: ProfileType;
  title: string;
  emoji: string;
  description: string;
  score: number;
  tips: string[];
}

const profileResults: Record<ProfileType, Omit<ProfileResult, 'score'>> = {
  express: {
    type: 'express',
    title: 'La Jongleuse Express',
    emoji: '⚡',
    description: 'Tu as besoin de solutions ultra-rapides. Chaque minute compte.',
    tips: [
      'Privilégie les recettes en 15-20 min',
      'Le batch-cooking du dimanche peut te sauver',
      'Les menus NutriZen "Express" sont faits pour toi',
    ],
  },
  perfectionist: {
    type: 'perfectionist',
    title: 'La Perfectionniste Épuisée',
    emoji: '✨',
    description: 'Tu veux bien faire pour ta famille, mais ça te pèse.',
    tips: [
      'Autorise-toi des repas simples sans culpabilité',
      'Planifier à l\'avance réduit 80% du stress',
      'NutriZen génère des menus équilibrés ET réalistes',
    ],
  },
  juggler: {
    type: 'juggler',
    title: 'La Multi-Contraintes',
    emoji: '🎪',
    description: 'Entre allergies, goûts et emplois du temps, c\'est le casse-tête.',
    tips: [
      'Les filtres personnalisés sont tes meilleurs amis',
      'NutriZen mémorise toutes les contraintes de ta famille',
      'Plus besoin de jongler mentalement',
    ],
  },
  explorer: {
    type: 'explorer',
    title: 'L\'Exploratrice Culinaire',
    emoji: '🌍',
    description: 'Tu aimes la variété mais tu manques d\'inspiration.',
    tips: [
      'Découvre de nouvelles cuisines chaque semaine',
      'NutriZen propose +500 recettes variées',
      'Active les suggestions "découverte" dans ton profil',
    ],
  },
};

function calculateProfile(answers: Record<string, string>): ProfileResult {
  // Simple scoring logic based on answers
  let score = 65; // Base score
  let type: ProfileType = 'juggler';
  
  // Time-constrained + decide pain = express
  if ((answers.time === '15' || answers.time === '30') && answers.pain === 'decide') {
    type = 'express';
    score = 72;
  }
  // Health goal + cooking pain = perfectionist
  else if (answers.goal === 'health' && (answers.pain === 'cooking' || answers.pain === 'decide')) {
    type = 'perfectionist';
    score = 68;
  }
  // Multiple allergies or picky kids = juggler
  else if (answers.allergies === 'multiple' || answers.pain === 'picky') {
    type = 'juggler';
    score = 58;
  }
  // Variety goal + advanced skill = explorer
  else if (answers.goal === 'variety' && (answers.skill === 'advanced' || answers.skill === 'expert')) {
    type = 'explorer';
    score = 75;
  }
  
  // Adjust score based on time available
  if (answers.time === '15') score -= 10;
  if (answers.time === '60+') score += 8;
  
  // Large family = harder
  if (answers.household === '5+') score -= 5;
  
  return {
    ...profileResults[type],
    score: Math.max(30, Math.min(90, score)),
  };
}

export const ProfileQuiz = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<ProfileResult | null>(null);
  const navigate = useNavigate();
  
  const progress = ((currentStep + 1) / questions.length) * 100;
  const currentQuestion = questions[currentStep];
  
  const handleAnswer = (optionId: string) => {
    const newAnswers = { ...answers, [currentQuestion.id]: optionId };
    setAnswers(newAnswers);
    
    if (currentStep < questions.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    } else {
      // Calculate and show result
      const profileResult = calculateProfile(newAnswers);
      setResult(profileResult);
      setTimeout(() => setShowResult(true), 300);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleGetMenu = () => {
    navigate('/auth/signup');
  };
  
  if (showResult && result) {
    return (
      <section id="quiz-profil" className="py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="max-w-2xl mx-auto p-8 md:p-12 shadow-glow border-primary/20">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">{result.emoji}</div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Tu es : {result.title}
                </h2>
                <p className="text-muted-foreground text-lg">
                  {result.description}
                </p>
              </div>
              
              {/* Score Zen */}
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">Ton Score Sérénité Repas</span>
                  <span className="text-2xl font-bold text-primary">{result.score}/100</span>
                </div>
                <Progress value={result.score} className="h-3" />
                <p className="text-sm text-muted-foreground mt-3">
                  {result.score < 50 && "🔴 Niveau critique — NutriZen peut vraiment t'aider !"}
                  {result.score >= 50 && result.score < 70 && "🟠 Marge d'amélioration — tu mérites plus de sérénité."}
                  {result.score >= 70 && "🟢 Pas mal ! Mais on peut encore optimiser."}
                </p>
              </div>
              
              {/* Tips */}
              <div className="space-y-3 mb-8">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  Nos conseils pour toi :
                </h3>
                {result.tips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <span className="text-primary font-bold">{index + 1}.</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
              
              {/* CTA */}
              <div className="space-y-4">
                <Button
                  onClick={handleGetMenu}
                  size="lg"
                  className="w-full bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] shadow-glow text-lg py-6"
                >
                  Voir mon menu personnalisé
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Gratuit, sans carte bancaire — Menu généré en 30 secondes
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
    );
  }
  
  return (
    <section id="quiz-profil" className="py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container">
        <Card className="max-w-2xl mx-auto p-6 md:p-10 shadow-glow border-primary/10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full text-sm mb-4">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="font-medium">Quiz 2 minutes</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Découvre ton Profil Repas Famille
            </h2>
            <p className="text-muted-foreground">
              Comprends pourquoi les repas te stressent — et comment en sortir.
            </p>
          </div>
          
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Question {currentStep + 1}/{questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {currentQuestion.icon}
                </div>
                <h3 className="text-xl font-semibold">{currentQuestion.question}</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(option.id)}
                    className={`
                      p-4 rounded-xl border-2 text-left transition-all
                      hover:border-primary hover:bg-primary/5 hover:scale-[1.02]
                      ${answers[currentQuestion.id] === option.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{option.emoji}</span>
                      <span className="font-medium">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Navigation */}
          {currentStep > 0 && (
            <div className="mt-6 pt-6 border-t">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Question précédente
              </Button>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};