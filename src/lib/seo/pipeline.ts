/**
 * NutriZen SEO Factory — Pipeline Configuration
 *
 * Recommended model & temperature settings per pipeline step.
 * Import prompt constants from ./prompts/*.ts
 */

export { BRIEF_SYSTEM_PROMPT, BRIEF_USER_TEMPLATE } from './prompts/brief';
export { OUTLINE_SYSTEM_PROMPT, OUTLINE_USER_TEMPLATE } from './prompts/outline';
export { IMAGE_REFINEMENT_SYSTEM_PROMPT, IMAGE_REFINEMENT_USER_TEMPLATE, buildDallePayload } from './prompts/images';
export { DRAFT_SYSTEM_PROMPT, DRAFT_USER_TEMPLATE } from './prompts/draft';
export { QA_SYSTEM_PROMPT, QA_USER_TEMPLATE } from './prompts/qa';
export { IMPROVE_SYSTEM_PROMPT, IMPROVE_USER_TEMPLATE } from './prompts/improve';
export { KEYWORD_EXPAND_SYSTEM_PROMPT, KEYWORD_EXPAND_USER_TEMPLATE } from './prompts/keyword-expand';

/** Per-step model & temperature config */
export const PIPELINE_CONFIG = {
  brief: {
    model: 'gpt-4o',
    temperature: 0.3,
    max_tokens: 1500,
  },
  outline: {
    model: 'gpt-4o',
    temperature: 0.4,
    max_tokens: 2000,
  },
  image_refinement: {
    model: 'gpt-4o',
    temperature: 0.5,
    max_tokens: 500,
  },
  draft: {
    model: 'gpt-4o',
    temperature: 0.6,
    max_tokens: 4000,
  },
  qa: {
    model: 'claude-sonnet-4-5',
    temperature: 0.2,
    max_tokens: 2000,
  },
  improve: {
    model: 'gpt-4o',
    temperature: 0.5,
    max_tokens: 4000,
  },
  keyword_expand: {
    model: 'gpt-4o',
    temperature: 0.4,
    max_tokens: 2000,
  },
} as const;

/** Publication quality thresholds */
export const PUBLISH_THRESHOLDS = {
  /** Minimum SEO score (0-100) for auto-publish */
  min_seo_score: 75,
  /** Block publication if duplicate risk exceeds this */
  max_duplicate_risk: 0.85,
  /** Always block if medical risk detected */
  block_on_medical_risk: true,
  /** Block if article < 1200 words */
  block_on_thin_content: true,
} as const;
