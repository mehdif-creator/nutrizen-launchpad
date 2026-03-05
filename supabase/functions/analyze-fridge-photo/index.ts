import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { withSecurity, SecurityContext, Logger } from '../_shared/security.ts';

interface AnalyzeFridgeBody {
  image: string; // base64 data URL
}

const SYSTEM_PROMPT = `Tu es un chef cuisinier expert et nutritionniste. 
Ton rôle est d'analyser une photo de frigo ou d'ingrédients, puis de proposer des recettes réalisables.

INSTRUCTIONS :
- Identifie précisément tous les ingrédients visibles sur la photo avec leur quantité estimée.
- Propose entre 2 et 4 recettes réalisables UNIQUEMENT avec ces ingrédients (sel, poivre, huile, eau autorisés).
- Chaque recette doit être simple, pratique et détaillée.
- Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour.

FORMAT DE RÉPONSE OBLIGATOIRE :
{
  "ingredients_identifies": [
    { "nom": "string", "quantite": "string" }
  ],
  "recettes": [
    {
      "nom": "string",
      "description": "string (1 phrase accrocheuse)",
      "difficulte": "Facile | Moyen | Difficile",
      "temps_preparation": "string (ex: 10 min)",
      "temps_cuisson": "string (ex: 20 min)",
      "portions": number,
      "ingredients_necessaires": ["string"],
      "etapes": ["string"],
      "note_nutritionnelle": "string"
    }
  ]
}

Si l'image est illisible ou ne contient pas d'ingrédients, retourne :
{ "error": "Image non exploitable" }`;

Deno.serve(async (req) => {
  return withSecurity<AnalyzeFridgeBody>(
    req,
    {
      requireAuth: true,
      rateLimit: { maxTokens: 10, refillRate: 10, cost: 1 },
    },
    async (context: SecurityContext, body: AnalyzeFridgeBody, logger: Logger) => {
      const { image } = body;

      if (!image || typeof image !== 'string') {
        throw new Error('Le champ "image" est requis (base64 data URL).');
      }

      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured');
      }

      // Extract raw base64 from data URL if needed
      const base64Data = image.includes(',') ? image.split(',')[1] : image;

      logger.info('Calling OpenAI GPT-4o for fridge analysis', { userId: context.userId });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 2000,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Data}`,
                    detail: 'high',
                  },
                },
                {
                  type: 'text',
                  text: 'Analyse cette photo et propose-moi des recettes avec ce que tu vois.',
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('OpenAI API error', new Error(errorText));
        throw new Error(`Erreur OpenAI : ${response.status}`);
      }

      const openaiData = await response.json();
      const content = openaiData.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("Réponse vide d'OpenAI");
      }

      // Clean potential markdown fencing
      const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.error) {
        throw new Error(parsed.error);
      }

      logger.info('Fridge analysis completed', {
        userId: context.userId,
        ingredientsCount: parsed.ingredients_identifies?.length,
        recipesCount: parsed.recettes?.length,
      });

      return parsed;
    }
  );
});
