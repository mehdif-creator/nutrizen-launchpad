export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          request_body: Json | null
          success: boolean
          target_email: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          request_body?: Json | null
          success?: boolean
          target_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          request_body?: Json | null
          success?: boolean
          target_email?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      affiliate_conversions: {
        Row: {
          affiliate_user_id: string
          amount_recurring: number
          commission_rate: number
          created_at: string
          id: string
          referred_user_id: string
          status: string
          stripe_subscription_id: string
          updated_at: string
        }
        Insert: {
          affiliate_user_id: string
          amount_recurring: number
          commission_rate?: number
          created_at?: string
          id?: string
          referred_user_id: string
          status?: string
          stripe_subscription_id: string
          updated_at?: string
        }
        Update: {
          affiliate_user_id?: string
          amount_recurring?: number
          commission_rate?: number
          created_at?: string
          id?: string
          referred_user_id?: string
          status?: string
          stripe_subscription_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_payouts: {
        Row: {
          affiliate_user_id: string
          amount: number
          created_at: string
          id: string
          metadata: Json | null
          period_end: string | null
          period_start: string | null
          status: string
        }
        Insert: {
          affiliate_user_id: string
          amount: number
          created_at?: string
          id?: string
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          status?: string
        }
        Update: {
          affiliate_user_id?: string
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          status?: string
        }
        Relationships: []
      }
      automation_jobs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          idempotency_key: string
          payload: Json
          result: Json | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key: string
          payload?: Json
          result?: Json | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string
          payload?: Json
          result?: Json | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          name?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          content: string | null
          cover_url: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
        }
        Insert: {
          author?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
        }
        Update: {
          author?: string | null
          content?: string | null
          cover_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      ciqual_compositions: {
        Row: {
          alim_code: string | null
          code_confiance: string | null
          const_code: string | null
          id: number
          max: string | null
          min: string | null
          teneur: string | null
        }
        Insert: {
          alim_code?: string | null
          code_confiance?: string | null
          const_code?: string | null
          id?: number
          max?: string | null
          min?: string | null
          teneur?: string | null
        }
        Update: {
          alim_code?: string | null
          code_confiance?: string | null
          const_code?: string | null
          id?: number
          max?: string | null
          min?: string | null
          teneur?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ciqual_compositions_alim_code_fkey"
            columns: ["alim_code"]
            isOneToOne: false
            referencedRelation: "ciqual_foods"
            referencedColumns: ["alim_code"]
          },
          {
            foreignKeyName: "ciqual_compositions_alim_code_fkey"
            columns: ["alim_code"]
            isOneToOne: false
            referencedRelation: "ciqual_full"
            referencedColumns: ["alim_code"]
          },
          {
            foreignKeyName: "ciqual_compositions_alim_code_fkey"
            columns: ["alim_code"]
            isOneToOne: false
            referencedRelation: "ciqual_summary"
            referencedColumns: ["alim_code"]
          },
          {
            foreignKeyName: "ciqual_compositions_const_code_fkey"
            columns: ["const_code"]
            isOneToOne: false
            referencedRelation: "ciqual_constituents"
            referencedColumns: ["const_code"]
          },
        ]
      }
      ciqual_constituents: {
        Row: {
          const_code: string | null
          const_nom_eng: string | null
          const_nom_fr: string | null
          id: number
        }
        Insert: {
          const_code?: string | null
          const_nom_eng?: string | null
          const_nom_fr?: string | null
          id?: number
        }
        Update: {
          const_code?: string | null
          const_nom_eng?: string | null
          const_nom_fr?: string | null
          id?: number
        }
        Relationships: []
      }
      ciqual_core: {
        Row: {
          alim_code: string | null
          alim_nom_fr: string | null
          calories_kcal: number | null
          carbs_g: number | null
          categorie: string | null
          fats_g: number | null
          fibers_g: number | null
          proteins_g: number | null
        }
        Insert: {
          alim_code?: string | null
          alim_nom_fr?: string | null
          calories_kcal?: number | null
          carbs_g?: number | null
          categorie?: string | null
          fats_g?: number | null
          fibers_g?: number | null
          proteins_g?: number | null
        }
        Update: {
          alim_code?: string | null
          alim_nom_fr?: string | null
          calories_kcal?: number | null
          carbs_g?: number | null
          categorie?: string | null
          fats_g?: number | null
          fibers_g?: number | null
          proteins_g?: number | null
        }
        Relationships: []
      }
      ciqual_foods: {
        Row: {
          alim_code: string | null
          alim_grp_code: number | null
          alim_nom_eng: string | null
          alim_nom_fr: string
          alim_nom_index_fr: string | null
          alim_ssgrp_code: number | null
          alim_ssssgrp_code: number | null
          id: number
        }
        Insert: {
          alim_code?: string | null
          alim_grp_code?: number | null
          alim_nom_eng?: string | null
          alim_nom_fr: string
          alim_nom_index_fr?: string | null
          alim_ssgrp_code?: number | null
          alim_ssssgrp_code?: number | null
          id?: number
        }
        Update: {
          alim_code?: string | null
          alim_grp_code?: number | null
          alim_nom_eng?: string | null
          alim_nom_fr?: string
          alim_nom_index_fr?: string | null
          alim_ssgrp_code?: number | null
          alim_ssssgrp_code?: number | null
          id?: number
        }
        Relationships: []
      }
      ciqual_groups: {
        Row: {
          alim_grp_code: string | null
          alim_grp_nom_eng: string | null
          alim_grp_nom_fr: string | null
          alim_ssgrp_code: number | null
          alim_ssgrp_nom_eng: string | null
          alim_ssgrp_nom_fr: string | null
          alim_ssssgrp_code: number | null
          alim_ssssgrp_nom_eng: string | null
          alim_ssssgrp_nom_fr: string | null
          id: number
        }
        Insert: {
          alim_grp_code?: string | null
          alim_grp_nom_eng?: string | null
          alim_grp_nom_fr?: string | null
          alim_ssgrp_code?: number | null
          alim_ssgrp_nom_eng?: string | null
          alim_ssgrp_nom_fr?: string | null
          alim_ssssgrp_code?: number | null
          alim_ssssgrp_nom_eng?: string | null
          alim_ssssgrp_nom_fr?: string | null
          id?: number
        }
        Update: {
          alim_grp_code?: string | null
          alim_grp_nom_eng?: string | null
          alim_grp_nom_fr?: string | null
          alim_ssgrp_code?: number | null
          alim_ssgrp_nom_eng?: string | null
          alim_ssgrp_nom_fr?: string | null
          alim_ssssgrp_code?: number | null
          alim_ssssgrp_nom_eng?: string | null
          alim_ssssgrp_nom_fr?: string | null
          id?: number
        }
        Relationships: []
      }
      credit_packs: {
        Row: {
          active: boolean
          created_at: string
          credits: number
          currency: string
          id: string
          name: string
          price_cents: number
          sort_order: number
          stripe_price_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          credits: number
          currency?: string
          id: string
          name: string
          price_cents: number
          sort_order?: number
          stripe_price_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          credits?: number
          currency?: string
          id?: string
          name?: string
          price_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      credit_reset_runs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          summary: Json | null
          trigger: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          summary?: Json | null
          trigger?: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          summary?: Json | null
          trigger?: string
        }
        Relationships: []
      }
      credit_resets_log: {
        Row: {
          cadence: string
          created_at: string
          granted_amount: number
          id: string
          idempotency_key: string
          period_key: string
          user_id: string
        }
        Insert: {
          cadence: string
          created_at?: string
          granted_amount: number
          id?: string
          idempotency_key: string
          period_key: string
          user_id: string
        }
        Update: {
          cadence?: string
          created_at?: string
          granted_amount?: number
          id?: string
          idempotency_key?: string
          period_key?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          created_at: string
          credit_type: string
          delta: number
          feature: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          reason: string
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credit_type: string
          delta: number
          feature?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credit_type?: string
          delta?: number
          feature?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_advice: {
        Row: {
          category: string
          created_at: string | null
          date: string
          id: string
          is_active: boolean
          text: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          date: string
          id?: string
          is_active?: boolean
          text: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          date?: string
          id?: string
          is_active?: boolean
          text?: string
          title?: string
        }
        Relationships: []
      }
      diagnostics_results: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          run_id: string
          status: string
          test_key: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          run_id: string
          status: string
          test_key: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          run_id?: string
          status?: string
          test_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "diagnostics_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics_runs: {
        Row: {
          admin_user_id: string
          environment: string
          error: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          summary: Json | null
        }
        Insert: {
          admin_user_id: string
          environment?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          summary?: Json | null
        }
        Update: {
          admin_user_id?: string
          environment?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          summary?: Json | null
        }
        Relationships: []
      }
      email_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: string
          metadata: Json | null
          provider: string
          provider_message_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          provider?: string
          provider_message_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          provider?: string
          provider_message_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      feature_costs: {
        Row: {
          cost: number
          description: string | null
          feature: string
          updated_at: string | null
        }
        Insert: {
          cost?: number
          description?: string | null
          feature: string
          updated_at?: string | null
        }
        Update: {
          cost?: number
          description?: string | null
          feature?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string | null
          enabled: boolean | null
          key: string
        }
        Insert: {
          description?: string | null
          enabled?: boolean | null
          key: string
        }
        Update: {
          description?: string | null
          enabled?: boolean | null
          key?: string
        }
        Relationships: []
      }
      gamification_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          idempotency_key: string
          metadata: Json | null
          user_id: string
          xp_delta: number
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          idempotency_key: string
          metadata?: Json | null
          user_id: string
          xp_delta?: number
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string
          metadata?: Json | null
          user_id?: string
          xp_delta?: number
        }
        Relationships: []
      }
      grocery_lists: {
        Row: {
          generated_at: string
          id: string
          items: Json
          user_id: string
          week_start: string | null
          weekly_menu_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          items?: Json
          user_id: string
          week_start?: string | null
          weekly_menu_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          items?: Json
          user_id?: string
          week_start?: string | null
          weekly_menu_id?: string
        }
        Relationships: []
      }
      ingredient_substitutions_cache: {
        Row: {
          constraints: Json | null
          created_at: string | null
          expires_at: string | null
          id: string
          ingredient_name: string
          recipe_id: string | null
          result: Json
          user_id: string
        }
        Insert: {
          constraints?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ingredient_name: string
          recipe_id?: string | null
          result?: Json
          user_id: string
        }
        Update: {
          constraints?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ingredient_name?: string
          recipe_id?: string | null
          result?: Json
          user_id?: string
        }
        Relationships: []
      }
      login_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          session_id: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          session_id?: string | null
          token: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          session_id?: string | null
          token?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          created_at: string | null
          id: string
          items: Json
          user_id: string
          week_of: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          items: Json
          user_id: string
          week_of: string
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json
          user_id?: string
          week_of?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_ratings: {
        Row: {
          created_at: string | null
          day: number
          id: string
          meal_plan_id: string
          notes: string | null
          stars: number | null
        }
        Insert: {
          created_at?: string | null
          day: number
          id?: string
          meal_plan_id: string
          notes?: string | null
          stars?: number | null
        }
        Update: {
          created_at?: string | null
          day?: number
          id?: string
          meal_plan_id?: string
          notes?: string | null
          stars?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_ratings_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_generation_audit: {
        Row: {
          candidate_recipes_count: number | null
          constraints_used: Json
          created_at: string | null
          fallback_level: number | null
          final_recipes_count: number | null
          generation_duration_ms: number | null
          hard_constraint_violations: Json | null
          id: string
          menu_id: string | null
          soft_constraint_relaxations: Json | null
          user_id: string
          week_start: string
        }
        Insert: {
          candidate_recipes_count?: number | null
          constraints_used?: Json
          created_at?: string | null
          fallback_level?: number | null
          final_recipes_count?: number | null
          generation_duration_ms?: number | null
          hard_constraint_violations?: Json | null
          id?: string
          menu_id?: string | null
          soft_constraint_relaxations?: Json | null
          user_id: string
          week_start: string
        }
        Update: {
          candidate_recipes_count?: number | null
          constraints_used?: Json
          created_at?: string | null
          fallback_level?: number | null
          final_recipes_count?: number | null
          generation_duration_ms?: number | null
          hard_constraint_violations?: Json | null
          id?: string
          menu_id?: string | null
          soft_constraint_relaxations?: Json | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      menu_generation_jobs: {
        Row: {
          constraints_used: Json | null
          created_at: string | null
          error: string | null
          id: string
          retries: number | null
          status: string
          updated_at: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          constraints_used?: Json | null
          created_at?: string | null
          error?: string | null
          id?: string
          retries?: number | null
          status?: string
          updated_at?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          constraints_used?: Json | null
          created_at?: string | null
          error?: string | null
          id?: string
          retries?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      payment_events_log: {
        Row: {
          amount_cents: number | null
          created_at: string
          credits_amount: number | null
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          status: string
          stripe_event_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          credits_amount?: number | null
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          status?: string
          stripe_event_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          credits_amount?: number | null
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          status?: string
          stripe_event_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      preferences: {
        Row: {
          age: number | null
          age_enfants: number[] | null
          aliments_eviter: string[] | null
          allergies: string[] | null
          allergies_proches: string[] | null
          appliances_owned: string[] | null
          apport_proteines_g_kg: number | null
          autres_adultes: number | null
          autres_allergies: string | null
          batch_cooking: string | null
          budget: string | null
          budget_hebdomadaire: string | null
          conseils_lifestyle: boolean | null
          cuisine_pour_enfants: boolean | null
          cuisine_preferee: string[] | null
          duree_souhaitee: string | null
          frequence_courses: string | null
          frequence_repas_emporter: string | null
          ingredients_favoris: string[] | null
          lieu_courses: string | null
          limiter_sucre: boolean | null
          metier: string | null
          mode_cuisson_prefere: string[] | null
          motivation_principale: string | null
          niveau_activite: string | null
          niveau_cuisine: string | null
          niveau_epices: string | null
          niveau_sel: string | null
          niveau_stress: string | null
          nombre_enfants: number | null
          objectif_calorique: string | null
          objectif_principal: string | null
          objectifs: string[] | null
          personnes: number | null
          poids_actuel_kg: number | null
          poids_souhaite_kg: number | null
          portions_par_repas: number | null
          principal_frein: string | null
          produits_bio_locaux: string | null
          produits_laitiers: string | null
          recettes_riches_fibres: boolean | null
          repartition_macros: string | null
          repas_par_jour: number | null
          sexe: string | null
          sommeil_heures: number | null
          taille_cm: number | null
          taille_portion: string | null
          temps: string | null
          temps_preparation: string | null
          type_alimentation: string | null
          updated_at: string | null
          user_id: string
          ustensiles: string[] | null
        }
        Insert: {
          age?: number | null
          age_enfants?: number[] | null
          aliments_eviter?: string[] | null
          allergies?: string[] | null
          allergies_proches?: string[] | null
          appliances_owned?: string[] | null
          apport_proteines_g_kg?: number | null
          autres_adultes?: number | null
          autres_allergies?: string | null
          batch_cooking?: string | null
          budget?: string | null
          budget_hebdomadaire?: string | null
          conseils_lifestyle?: boolean | null
          cuisine_pour_enfants?: boolean | null
          cuisine_preferee?: string[] | null
          duree_souhaitee?: string | null
          frequence_courses?: string | null
          frequence_repas_emporter?: string | null
          ingredients_favoris?: string[] | null
          lieu_courses?: string | null
          limiter_sucre?: boolean | null
          metier?: string | null
          mode_cuisson_prefere?: string[] | null
          motivation_principale?: string | null
          niveau_activite?: string | null
          niveau_cuisine?: string | null
          niveau_epices?: string | null
          niveau_sel?: string | null
          niveau_stress?: string | null
          nombre_enfants?: number | null
          objectif_calorique?: string | null
          objectif_principal?: string | null
          objectifs?: string[] | null
          personnes?: number | null
          poids_actuel_kg?: number | null
          poids_souhaite_kg?: number | null
          portions_par_repas?: number | null
          principal_frein?: string | null
          produits_bio_locaux?: string | null
          produits_laitiers?: string | null
          recettes_riches_fibres?: boolean | null
          repartition_macros?: string | null
          repas_par_jour?: number | null
          sexe?: string | null
          sommeil_heures?: number | null
          taille_cm?: number | null
          taille_portion?: string | null
          temps?: string | null
          temps_preparation?: string | null
          type_alimentation?: string | null
          updated_at?: string | null
          user_id: string
          ustensiles?: string[] | null
        }
        Update: {
          age?: number | null
          age_enfants?: number[] | null
          aliments_eviter?: string[] | null
          allergies?: string[] | null
          allergies_proches?: string[] | null
          appliances_owned?: string[] | null
          apport_proteines_g_kg?: number | null
          autres_adultes?: number | null
          autres_allergies?: string | null
          batch_cooking?: string | null
          budget?: string | null
          budget_hebdomadaire?: string | null
          conseils_lifestyle?: boolean | null
          cuisine_pour_enfants?: boolean | null
          cuisine_preferee?: string[] | null
          duree_souhaitee?: string | null
          frequence_courses?: string | null
          frequence_repas_emporter?: string | null
          ingredients_favoris?: string[] | null
          lieu_courses?: string | null
          limiter_sucre?: boolean | null
          metier?: string | null
          mode_cuisson_prefere?: string[] | null
          motivation_principale?: string | null
          niveau_activite?: string | null
          niveau_cuisine?: string | null
          niveau_epices?: string | null
          niveau_sel?: string | null
          niveau_stress?: string | null
          nombre_enfants?: number | null
          objectif_calorique?: string | null
          objectif_principal?: string | null
          objectifs?: string[] | null
          personnes?: number | null
          poids_actuel_kg?: number | null
          poids_souhaite_kg?: number | null
          portions_par_repas?: number | null
          principal_frein?: string | null
          produits_bio_locaux?: string | null
          produits_laitiers?: string | null
          recettes_riches_fibres?: boolean | null
          repartition_macros?: string | null
          repas_par_jour?: number | null
          sexe?: string | null
          sommeil_heures?: number | null
          taille_cm?: number | null
          taille_portion?: string | null
          temps?: string | null
          temps_preparation?: string | null
          type_alimentation?: string | null
          updated_at?: string | null
          user_id?: string
          ustensiles?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_checkout_sessions: {
        Row: {
          created_at: string
          id: string
          payment_status: string
          processed_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_status: string
          processed_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_status?: string
          processed_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          diagnostics_meta: Json | null
          email: string | null
          full_name: string | null
          id: string
          last_diagnostics_at: string | null
          locale: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          diagnostics_meta?: Json | null
          email?: string | null
          full_name?: string | null
          id: string
          last_diagnostics_at?: string | null
          locale?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          diagnostics_meta?: Json | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_diagnostics_at?: string | null
          locale?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          canonical_unit: string | null
          ciqual_id: number | null
          created_at: string | null
          id: number
          ingredient_line_raw: string | null
          ingredient_name: string
          ingredient_name_norm: string | null
          normalized_quantity: number | null
          quantity_g: number | null
          quantity_g_num: number | null
          recipe_id: string | null
        }
        Insert: {
          canonical_unit?: string | null
          ciqual_id?: number | null
          created_at?: string | null
          id?: number
          ingredient_line_raw?: string | null
          ingredient_name: string
          ingredient_name_norm?: string | null
          normalized_quantity?: number | null
          quantity_g?: number | null
          quantity_g_num?: number | null
          recipe_id?: string | null
        }
        Update: {
          canonical_unit?: string | null
          ciqual_id?: number | null
          created_at?: string | null
          id?: number
          ingredient_line_raw?: string | null
          ingredient_name?: string
          ingredient_name_norm?: string | null
          normalized_quantity?: number | null
          quantity_g?: number | null
          quantity_g_num?: number | null
          recipe_id?: string | null
        }
        Relationships: []
      }
      recipe_macro_audit: {
        Row: {
          calculated_at: string | null
          delta_calories: number | null
          id: number
          ingredients_count: number | null
          new_calories: number | null
          old_calories: number | null
          recipe_id: string
          triggered_by: string | null
          zero_calorie_ingredients: number | null
        }
        Insert: {
          calculated_at?: string | null
          delta_calories?: number | null
          id?: number
          ingredients_count?: number | null
          new_calories?: number | null
          old_calories?: number | null
          recipe_id: string
          triggered_by?: string | null
          zero_calorie_ingredients?: number | null
        }
        Update: {
          calculated_at?: string | null
          delta_calories?: number | null
          id?: number
          ingredients_count?: number | null
          new_calories?: number | null
          old_calories?: number | null
          recipe_id?: string
          triggered_by?: string | null
          zero_calorie_ingredients?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_macro_audit_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros_mv"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_macro_audit_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros_mv2"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_macro_audit_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros_v"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipe_macro_audit_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_macros_queue: {
        Row: {
          created_at: string
          reason: string | null
          recipe_id: string
        }
        Insert: {
          created_at?: string
          reason?: string | null
          recipe_id: string
        }
        Update: {
          created_at?: string
          reason?: string | null
          recipe_id?: string
        }
        Relationships: []
      }
      recipe_macros_store: {
        Row: {
          calories_kcal: number | null
          carbs_g: number | null
          computed_at: string
          fats_g: number | null
          fibers_g: number | null
          proteins_g: number | null
          recipe_id: string
        }
        Insert: {
          calories_kcal?: number | null
          carbs_g?: number | null
          computed_at?: string
          fats_g?: number | null
          fibers_g?: number | null
          proteins_g?: number | null
          recipe_id: string
        }
        Update: {
          calories_kcal?: number | null
          carbs_g?: number | null
          computed_at?: string
          fats_g?: number | null
          fibers_g?: number | null
          proteins_g?: number | null
          recipe_id?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          ai_keywords: string[] | null
          allergens: string[] | null
          allowed_meals: string[] | null
          appliances: string[] | null
          badges: string[] | null
          base_servings: number
          batch_cooking_friendly: boolean | null
          budget_per_serving: number | null
          calorie_target: string | null
          calories: number | null
          calories_kcal: number | null
          carbs_g: number | null
          cook_time_min: number | null
          cooking_method: string[] | null
          country_code: string | null
          created_at: string | null
          cuisine_type: string | null
          diet_type: string | null
          difficulty_level: string | null
          equipment_needed: string[] | null
          excluded_ingredients: string[] | null
          fats_g: number | null
          fibers_g: number | null
          goal_tags: string[] | null
          id: string
          image_path: string | null
          image_url: string | null
          ingredient_keywords: string[] | null
          ingredients: Json | null
          ingredients_text: string | null
          instructions: Json | null
          keywords_legacy: string | null
          language: string | null
          macros_calculated: boolean | null
          macros_indicatives: Json | null
          main_ingredients: string[] | null
          meal_type: string | null
          portable: boolean | null
          prep_time_min: number | null
          proteins_g: number | null
          published: boolean | null
          rating: number | null
          salt_level: string | null
          servings: number | null
          source_name: string
          source_uid: string | null
          source_url: string | null
          spice_level: string | null
          sugar_level: string | null
          title: string
          total_time_min: number | null
          updated_at: string | null
        }
        Insert: {
          ai_keywords?: string[] | null
          allergens?: string[] | null
          allowed_meals?: string[] | null
          appliances?: string[] | null
          badges?: string[] | null
          base_servings?: number
          batch_cooking_friendly?: boolean | null
          budget_per_serving?: number | null
          calorie_target?: string | null
          calories?: number | null
          calories_kcal?: number | null
          carbs_g?: number | null
          cook_time_min?: number | null
          cooking_method?: string[] | null
          country_code?: string | null
          created_at?: string | null
          cuisine_type?: string | null
          diet_type?: string | null
          difficulty_level?: string | null
          equipment_needed?: string[] | null
          excluded_ingredients?: string[] | null
          fats_g?: number | null
          fibers_g?: number | null
          goal_tags?: string[] | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          ingredient_keywords?: string[] | null
          ingredients?: Json | null
          ingredients_text?: string | null
          instructions?: Json | null
          keywords_legacy?: string | null
          language?: string | null
          macros_calculated?: boolean | null
          macros_indicatives?: Json | null
          main_ingredients?: string[] | null
          meal_type?: string | null
          portable?: boolean | null
          prep_time_min?: number | null
          proteins_g?: number | null
          published?: boolean | null
          rating?: number | null
          salt_level?: string | null
          servings?: number | null
          source_name?: string
          source_uid?: string | null
          source_url?: string | null
          spice_level?: string | null
          sugar_level?: string | null
          title: string
          total_time_min?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_keywords?: string[] | null
          allergens?: string[] | null
          allowed_meals?: string[] | null
          appliances?: string[] | null
          badges?: string[] | null
          base_servings?: number
          batch_cooking_friendly?: boolean | null
          budget_per_serving?: number | null
          calorie_target?: string | null
          calories?: number | null
          calories_kcal?: number | null
          carbs_g?: number | null
          cook_time_min?: number | null
          cooking_method?: string[] | null
          country_code?: string | null
          created_at?: string | null
          cuisine_type?: string | null
          diet_type?: string | null
          difficulty_level?: string | null
          equipment_needed?: string[] | null
          excluded_ingredients?: string[] | null
          fats_g?: number | null
          fibers_g?: number | null
          goal_tags?: string[] | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          ingredient_keywords?: string[] | null
          ingredients?: Json | null
          ingredients_text?: string | null
          instructions?: Json | null
          keywords_legacy?: string | null
          language?: string | null
          macros_calculated?: boolean | null
          macros_indicatives?: Json | null
          main_ingredients?: string[] | null
          meal_type?: string | null
          portable?: boolean | null
          prep_time_min?: number | null
          proteins_g?: number | null
          published?: boolean | null
          rating?: number | null
          salt_level?: string | null
          servings?: number | null
          source_name?: string
          source_uid?: string | null
          source_url?: string | null
          spice_level?: string | null
          sugar_level?: string | null
          title?: string
          total_time_min?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recipes_nutrition: {
        Row: {
          carbs_g: number | null
          computed_at: string | null
          energy_kcal: number | null
          fat_g: number | null
          fiber_g: number | null
          per_serving: Json | null
          protein_g: number | null
          recipe_id: string
          sat_fat_g: number | null
          sodium_mg: number | null
          sugars_g: number | null
          total_weight_g: number | null
        }
        Insert: {
          carbs_g?: number | null
          computed_at?: string | null
          energy_kcal?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          per_serving?: Json | null
          protein_g?: number | null
          recipe_id: string
          sat_fat_g?: number | null
          sodium_mg?: number | null
          sugars_g?: number | null
          total_weight_g?: number | null
        }
        Update: {
          carbs_g?: number | null
          computed_at?: string | null
          energy_kcal?: number | null
          fat_g?: number | null
          fiber_g?: number | null
          per_serving?: Json | null
          protein_g?: number | null
          recipe_id?: string
          sat_fat_g?: number | null
          sodium_mg?: number | null
          sugars_g?: number | null
          total_weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_nutrition_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipe_macros_mv"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipes_nutrition_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipe_macros_mv2"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipes_nutrition_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipe_macros_v"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "recipes_nutrition_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_attributions: {
        Row: {
          created_at: string | null
          id: string
          referred_user_id: string
          referrer_user_id: string
          source: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_user_id: string
          referrer_user_id: string
          source?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_user_id?: string
          referrer_user_id?: string
          source?: string | null
        }
        Relationships: []
      }
      referral_clicks: {
        Row: {
          created_at: string | null
          id: string
          ip_hash: string | null
          landing_path: string | null
          referral_code: string
          referrer_user_id: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          landing_path?: string | null
          referral_code: string
          referrer_user_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          landing_path?: string | null
          referral_code?: string
          referrer_user_id?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referral_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          idempotency_key: string
          metadata: Json
          reference_id: string | null
          reference_type: string | null
          referral_code: string | null
          referred_user_id: string
          referrer_user_id: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          idempotency_key: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          referral_code?: string | null
          referred_user_id: string
          referrer_user_id: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string
          metadata?: Json
          reference_id?: string | null
          reference_type?: string | null
          referral_code?: string | null
          referred_user_id?: string
          referrer_user_id?: string
          visitor_id?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string
          reward_points: number | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          reward_points?: number | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          reward_points?: number | null
          status?: string
        }
        Relationships: []
      }
      shopping_aisles: {
        Row: {
          aisle: string
          name_norm: string
          sort_order: number
        }
        Insert: {
          aisle: string
          name_norm: string
          sort_order?: number
        }
        Update: {
          aisle?: string
          name_norm?: string
          sort_order?: number
        }
        Relationships: []
      }
      shopping_aliases: {
        Row: {
          canonical_norm: string
          display_name: string | null
          name_norm: string
        }
        Insert: {
          canonical_norm: string
          display_name?: string | null
          name_norm: string
        }
        Update: {
          canonical_norm?: string
          display_name?: string | null
          name_norm?: string
        }
        Relationships: []
      }
      shopping_units: {
        Row: {
          grams_per_unit: number
          name_norm: string
          unit_plural: string
          unit_singular: string
        }
        Insert: {
          grams_per_unit: number
          name_norm: string
          unit_plural: string
          unit_singular: string
        }
        Update: {
          grams_per_unit?: number
          name_norm?: string
          unit_plural?: string
          unit_singular?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          processed_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          processed_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          plan: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          plan?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          plan?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          messages: Json | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          messages?: Json | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      swaps: {
        Row: {
          month: string
          quota: number | null
          used: number | null
          user_id: string
        }
        Insert: {
          month: string
          quota?: number | null
          used?: number | null
          user_id: string
        }
        Update: {
          month?: string
          quota?: number | null
          used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swaps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_glossary: {
        Row: {
          context: string
          created_at: string | null
          id: string
          notes: string | null
          source_term: string
          target_term: string
        }
        Insert: {
          context?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          source_term: string
          target_term: string
        }
        Update: {
          context?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          source_term?: string
          target_term?: string
        }
        Relationships: []
      }
      translation_issues: {
        Row: {
          created_at: string | null
          fixed_at: string | null
          id: string
          issue_type: string
          problematic_text: string
          recipe_id: string | null
          status: string
          suggested_fix: string | null
        }
        Insert: {
          created_at?: string | null
          fixed_at?: string | null
          id?: string
          issue_type: string
          problematic_text: string
          recipe_id?: string | null
          status?: string
          suggested_fix?: string | null
        }
        Update: {
          created_at?: string | null
          fixed_at?: string | null
          id?: string
          issue_type?: string
          problematic_text?: string
          recipe_id?: string | null
          status?: string
          suggested_fix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "translation_issues_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros_mv"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "translation_issues_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros_mv2"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "translation_issues_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros_v"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "translation_issues_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_code: string
          granted_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_code: string
          granted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_code?: string
          granted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
          },
        ]
      }
      user_challenge_completions: {
        Row: {
          challenge_id: string
          completed_at: string
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credit_lots: {
        Row: {
          consumed: number
          created_at: string
          credits: number
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          consumed?: number
          created_at?: string
          credits: number
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          consumed?: number
          created_at?: string
          credits?: number
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_daily_advice_seen: {
        Row: {
          advice_id: string
          seen_at: string | null
          user_id: string
        }
        Insert: {
          advice_id: string
          seen_at?: string | null
          user_id: string
        }
        Update: {
          advice_id?: string
          seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_advice_seen_advice_id_fkey"
            columns: ["advice_id"]
            isOneToOne: false
            referencedRelation: "daily_advice"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_recipes: {
        Row: {
          created_at: string
          date: string
          day_of_week: number | null
          dinner_recipe_id: string | null
          id: string
          lunch_recipe_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          day_of_week?: number | null
          dinner_recipe_id?: string | null
          id?: string
          lunch_recipe_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          day_of_week?: number | null
          dinner_recipe_id?: string | null
          id?: string
          lunch_recipe_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_dashboard_stats: {
        Row: {
          charge_mentale_pct: number
          created_at: string | null
          credits_zen: number
          objectif_hebdos_valide: number
          references_count: number
          serie_en_cours_set_count: number
          temps_gagne: number
          user_id: string
        }
        Insert: {
          charge_mentale_pct?: number
          created_at?: string | null
          credits_zen?: number
          objectif_hebdos_valide?: number
          references_count?: number
          serie_en_cours_set_count?: number
          temps_gagne?: number
          user_id: string
        }
        Update: {
          charge_mentale_pct?: number
          created_at?: string | null
          credits_zen?: number
          objectif_hebdos_valide?: number
          references_count?: number
          serie_en_cours_set_count?: number
          temps_gagne?: number
          user_id?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          credits_delta: number
          event_type: Database["public"]["Enums"]["gamification_event"]
          id: string
          meta: Json
          occurred_at: string
          points_delta: number
          user_id: string
        }
        Insert: {
          credits_delta?: number
          event_type: Database["public"]["Enums"]["gamification_event"]
          id?: string
          meta?: Json
          occurred_at?: string
          points_delta?: number
          user_id: string
        }
        Update: {
          credits_delta?: number
          event_type?: Database["public"]["Enums"]["gamification_event"]
          id?: string
          meta?: Json
          occurred_at?: string
          points_delta?: number
          user_id?: string
        }
        Relationships: []
      }
      user_gamification: {
        Row: {
          badges_count: number
          best_streak_days: number
          created_at: string
          last_activity_date: string | null
          level: number
          points: number
          streak_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badges_count?: number
          best_streak_days?: number
          created_at?: string
          last_activity_date?: string | null
          level?: number
          points?: number
          streak_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badges_count?: number
          best_streak_days?: number
          created_at?: string
          last_activity_date?: string | null
          level?: number
          points?: number
          streak_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          created_at: string | null
          current_level: string
          last_login_date: string | null
          login_streak: number
          meals_completed: number
          meals_generated: number
          referrals: number
          total_points: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_level?: string
          last_login_date?: string | null
          login_streak?: number
          meals_completed?: number
          meals_generated?: number
          referrals?: number
          total_points?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_level?: string
          last_login_date?: string | null
          login_streak?: number
          meals_completed?: number
          meals_generated?: number
          referrals?: number
          total_points?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          affiliate_code: string | null
          avatar_url: string | null
          created_at: string
          default_servings_per_recipe: number
          default_servings_rounding: string
          diagnostics_meta: Json
          display_name: string | null
          household_adults: number
          household_children: number
          id: string
          is_affiliate: boolean
          kid_portion_ratio: number
          last_diagnostics_at: string | null
          meals_per_day: number
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_status: string
          onboarding_step: number | null
          onboarding_version: number
          portion_strategy: string
          referral_code: string
          required_fields_ok: boolean
          show_on_leaderboard: boolean
          updated_at: string
        }
        Insert: {
          affiliate_code?: string | null
          avatar_url?: string | null
          created_at?: string
          default_servings_per_recipe?: number
          default_servings_rounding?: string
          diagnostics_meta?: Json
          display_name?: string | null
          household_adults?: number
          household_children?: number
          id: string
          is_affiliate?: boolean
          kid_portion_ratio?: number
          last_diagnostics_at?: string | null
          meals_per_day?: number
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_status?: string
          onboarding_step?: number | null
          onboarding_version?: number
          portion_strategy?: string
          referral_code: string
          required_fields_ok?: boolean
          show_on_leaderboard?: boolean
          updated_at?: string
        }
        Update: {
          affiliate_code?: string | null
          avatar_url?: string | null
          created_at?: string
          default_servings_per_recipe?: number
          default_servings_rounding?: string
          diagnostics_meta?: Json
          display_name?: string | null
          household_adults?: number
          household_children?: number
          id?: string
          is_affiliate?: boolean
          kid_portion_ratio?: number
          last_diagnostics_at?: string | null
          meals_per_day?: number
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_status?: string
          onboarding_step?: number | null
          onboarding_version?: number
          portion_strategy?: string
          referral_code?: string
          required_fields_ok?: boolean
          show_on_leaderboard?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_referrals: {
        Row: {
          created_at: string
          id: string
          referred_email: string | null
          referred_user_id: string | null
          referrer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          referrer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak_days: number
          last_active_date: string | null
          longest_streak_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak_days?: number
          last_active_date?: string | null
          longest_streak_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak_days?: number
          last_active_date?: string | null
          longest_streak_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          allowance_amount: number
          balance: number | null
          balance_allowance: number
          balance_purchased: number
          credits_total: number
          free_months_earned: number
          free_months_used: number
          last_reset_at: string | null
          lifetime_credits: number
          lifetime_credits_earned: number
          lifetime_points: number
          next_reset_at: string | null
          points_total: number
          reset_cadence: string
          subscription_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allowance_amount?: number
          balance?: number | null
          balance_allowance?: number
          balance_purchased?: number
          credits_total?: number
          free_months_earned?: number
          free_months_used?: number
          last_reset_at?: string | null
          lifetime_credits?: number
          lifetime_credits_earned?: number
          lifetime_points?: number
          next_reset_at?: string | null
          points_total?: number
          reset_cadence?: string
          subscription_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allowance_amount?: number
          balance?: number | null
          balance_allowance?: number
          balance_purchased?: number
          credits_total?: number
          free_months_earned?: number
          free_months_used?: number
          last_reset_at?: string | null
          lifetime_credits?: number
          lifetime_credits_earned?: number
          lifetime_points?: number
          next_reset_at?: string | null
          points_total?: number
          reset_cadence?: string
          subscription_credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_weekly_menu_items: {
        Row: {
          created_at: string
          day_of_week: number | null
          id: string
          meal_slot: string | null
          portion_factor: number
          recipe_id: string
          scale_factor: number | null
          target_servings: number
          weekly_menu_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          id?: string
          meal_slot?: string | null
          portion_factor?: number
          recipe_id: string
          scale_factor?: number | null
          target_servings?: number
          weekly_menu_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          id?: string
          meal_slot?: string | null
          portion_factor?: number
          recipe_id?: string
          scale_factor?: number | null
          target_servings?: number
          weekly_menu_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_weekly_menu_items_menu"
            columns: ["weekly_menu_id"]
            isOneToOne: false
            referencedRelation: "user_weekly_menus"
            referencedColumns: ["menu_id"]
          },
          {
            foreignKeyName: "user_weekly_menu_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros_mv"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "user_weekly_menu_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros_mv2"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "user_weekly_menu_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe_macros_v"
            referencedColumns: ["recipe_id"]
          },
          {
            foreignKeyName: "user_weekly_menu_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_weekly_menu_items_weekly_menu_id_fkey"
            columns: ["weekly_menu_id"]
            isOneToOne: false
            referencedRelation: "user_weekly_menus"
            referencedColumns: ["menu_id"]
          },
        ]
      }
      user_weekly_menus: {
        Row: {
          created_at: string | null
          id: string | null
          menu_id: string
          payload: Json
          updated_at: string | null
          used_fallback: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          menu_id?: string
          payload?: Json
          updated_at?: string | null
          used_fallback?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string | null
          menu_id?: string
          payload?: Json
          updated_at?: string | null
          used_fallback?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_challenges: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          points_reward: number
          title: string
          week_start: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          points_reward?: number
          title: string
          week_start: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          points_reward?: number
          title?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      ciqual_full: {
        Row: {
          alim_code: string | null
          alim_grp_code: number | null
          alim_nom_eng: string | null
          alim_nom_fr: string | null
          alim_nom_index_fr: string | null
          alim_ssgrp_code: number | null
          alim_ssssgrp_code: number | null
          energie_kcal_100g: number | null
          fibres_alimentaires_g_100g: number | null
          glucides_g_100g: number | null
          id: number | null
          lipides_g_100g: number | null
          proteines_g_100g: number | null
        }
        Insert: {
          alim_code?: string | null
          alim_grp_code?: number | null
          alim_nom_eng?: string | null
          alim_nom_fr?: string | null
          alim_nom_index_fr?: string | null
          alim_ssgrp_code?: number | null
          alim_ssssgrp_code?: number | null
          energie_kcal_100g?: never
          fibres_alimentaires_g_100g?: never
          glucides_g_100g?: never
          id?: number | null
          lipides_g_100g?: never
          proteines_g_100g?: never
        }
        Update: {
          alim_code?: string | null
          alim_grp_code?: number | null
          alim_nom_eng?: string | null
          alim_nom_fr?: string | null
          alim_nom_index_fr?: string | null
          alim_ssgrp_code?: number | null
          alim_ssssgrp_code?: number | null
          energie_kcal_100g?: never
          fibres_alimentaires_g_100g?: never
          glucides_g_100g?: never
          id?: number | null
          lipides_g_100g?: never
          proteines_g_100g?: never
        }
        Relationships: []
      }
      ciqual_summary: {
        Row: {
          alim_code: string | null
          alim_nom_fr: string | null
          calories_kcal: number | null
          carbs_g: number | null
          categorie: string | null
          fats_g: number | null
          fibers_g: number | null
          proteins_g: number | null
        }
        Relationships: []
      }
      kpi_events_daily_mv: {
        Row: {
          country: string | null
          day: string | null
          device: string | null
          metric: string | null
          value: number | null
        }
        Relationships: []
      }
      kpi_subscriptions_daily_mv: {
        Row: {
          active_subscribers: number | null
          cancelled_subscribers: number | null
          churned_subscribers: number | null
          country: string | null
          day: string | null
          new_subscribers: number | null
          plan_name: string | null
          revenue_mrr: number | null
        }
        Relationships: []
      }
      kpi_users_daily_mv: {
        Row: {
          active_users_30d: number | null
          active_users_7d: number | null
          day: string | null
          new_users: number | null
          paid_users: number | null
          total_users: number | null
          trial_users: number | null
        }
        Relationships: []
      }
      recipe_ingredients_normalized: {
        Row: {
          id: number | null
          ingredient_line_raw: string | null
          ingredient_name: string | null
          normalized_name: string | null
          quantity: number | null
          recipe_id: string | null
          unit: string | null
        }
        Insert: {
          id?: number | null
          ingredient_line_raw?: string | null
          ingredient_name?: string | null
          normalized_name?: never
          quantity?: never
          recipe_id?: string | null
          unit?: never
        }
        Update: {
          id?: number | null
          ingredient_line_raw?: string | null
          ingredient_name?: string | null
          normalized_name?: never
          quantity?: never
          recipe_id?: string | null
          unit?: never
        }
        Relationships: []
      }
      recipe_macros_mv: {
        Row: {
          calories_kcal: number | null
          carbs_g: number | null
          fats_g: number | null
          fibers_g: number | null
          proteins_g: number | null
          recipe_id: string | null
        }
        Relationships: []
      }
      recipe_macros_mv2: {
        Row: {
          calories_kcal: number | null
          carbs_g: number | null
          fats_g: number | null
          fibers_g: number | null
          proteins_g: number | null
          recipe_id: string | null
        }
        Relationships: []
      }
      recipe_macros_v: {
        Row: {
          calories_kcal: number | null
          carbs_g: number | null
          fats_g: number | null
          fibers_g: number | null
          proteins_g: number | null
          recipe_id: string | null
        }
        Relationships: []
      }
      v_ri_qc: {
        Row: {
          alim_nom_fr: string | null
          calories_kcal: number | null
          ciqual_id: number | null
          ingredient_name: string | null
          issue: string | null
          quantity_g: number | null
          recipe_uuid: string | null
          ri_id: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_credits_from_purchase:
        | {
            Args: {
              p_amount: number
              p_credit_type?: string
              p_metadata?: Json
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_credits: number
              p_stripe_metadata?: Json
              p_user_id: string
            }
            Returns: Json
          }
      admin_set_user_credits: {
        Args: { p_credits: number; p_operation?: string; p_user_id: string }
        Returns: Json
      }
      backfill_recipe_ingredients_from_recipes: {
        Args: { p_limit?: number }
        Returns: number
      }
      backfill_recipes_with_progress: {
        Args: { p_batch_size?: number; p_max_batches?: number }
        Returns: {
          avg_calories: number
          batch_num: number
          elapsed_seconds: number
          recipes_processed: number
          warnings: number
        }[]
      }
      calculate_effective_household_size: {
        Args: { p_adults: number; p_children: number }
        Returns: number
      }
      calculate_user_level: { Args: { points: number }; Returns: string }
      canonicalize_name: { Args: { p_name_norm: string }; Returns: string }
      check_and_consume_credits: {
        Args: { p_cost?: number; p_feature: string; p_user_id: string }
        Returns: Json
      }
      cleanup_expired_tokens: { Args: never; Returns: undefined }
      cleanup_old_checkout_sessions: { Args: never; Returns: undefined }
      compute_recipe_macros: {
        Args: { p_recipe_id: string }
        Returns: undefined
      }
      deduct_week_regeneration_credits: {
        Args: { p_month: string; p_user_id: string }
        Returns: Json
      }
      extract_name: { Args: { line: string }; Returns: string }
      extract_qty_g: { Args: { line: string }; Returns: number }
      fn_award_event: {
        Args: {
          p_credits: number
          p_event_type: Database["public"]["Enums"]["gamification_event"]
          p_meta?: Json
          p_points: number
        }
        Returns: undefined
      }
      fn_cleanup_expired_credits: { Args: never; Returns: undefined }
      fn_consume_credit: { Args: { p_count: number }; Returns: boolean }
      fn_get_dashboard: { Args: never; Returns: Json }
      fn_points_to_credits: { Args: { p_points: number }; Returns: boolean }
      fn_touch_streak_today: { Args: never; Returns: undefined }
      generate_affiliate_code: { Args: never; Returns: string }
      generate_grocery_list: {
        Args: { p_weekly_menu_id: string }
        Returns: Json[]
      }
      generate_referral_code:
        | { Args: never; Returns: string }
        | { Args: { user_id: string }; Returns: string }
      generate_shopping_list: {
        Args: { p_menu_id: string; p_user_id: string }
        Returns: {
          canonical_unit: string
          ingredient_name: string
          total_quantity: number
        }[]
      }
      generate_user_referral_code: {
        Args: { p_user_id: string }
        Returns: string
      }
      generate_week_menu: {
        Args: { p_user: string; p_week_start: string }
        Returns: Json
      }
      get_active_referrals_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_daily_recipe_suggestions: {
        Args: { p_date?: string; p_user_id: string }
        Returns: Json
      }
      get_dashboard_stats: { Args: { p_user_id: string }; Returns: Json }
      get_kpi_activation_rate_timeseries: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          activated: number
          activation_rate: number
          bucket: string
          new_users: number
        }[]
      }
      get_kpi_arpu_by_cohort: {
        Args: { _from?: string; _to?: string }
        Returns: {
          arpu: number
          cohort_month: string
          users: number
        }[]
      }
      get_kpi_arpu_by_plan: {
        Args: { _from?: string; _to?: string }
        Returns: {
          arpu: number
          plan: string
          revenue: number
          users: number
        }[]
      }
      get_kpi_arpu_timeseries: {
        Args: {
          _country?: string
          _from?: string
          _granularity?: string
          _plan?: string
          _to?: string
        }
        Returns: {
          active_users: number
          arpu: number
          bucket: string
          revenue: number
        }[]
      }
      get_kpi_churn_breakdown: {
        Args: { _dimension?: string; _from?: string; _to?: string }
        Returns: {
          cancels: number
          churn_rate: number
          dimension_value: string
        }[]
      }
      get_kpi_churn_by_plan: {
        Args: { _from?: string; _to?: string }
        Returns: {
          cancels: number
          churn_rate: number
          plan: string
        }[]
      }
      get_kpi_churn_timeseries: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          bucket: string
          cancels: number
          churn_rate: number
        }[]
      }
      get_kpi_conversion_breakdown: {
        Args: { _dimension?: string; _from?: string; _to?: string }
        Returns: {
          conversion_rate: number
          dimension_value: string
          paid: number
          trials: number
        }[]
      }
      get_kpi_conversion_funnel: {
        Args: { _from?: string; _to?: string }
        Returns: {
          step: string
          users: number
        }[]
      }
      get_kpi_conversion_timeseries: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          bucket: string
          conversion_rate: number
          paid: number
          trials: number
        }[]
      }
      get_kpi_menus_breakdown: {
        Args: { _dimension?: string; _from?: string; _to?: string }
        Returns: {
          dimension_value: string
          menus: number
        }[]
      }
      get_kpi_menus_by_type: {
        Args: { _from?: string; _to?: string }
        Returns: {
          meal_type: string
          menus: number
        }[]
      }
      get_kpi_menus_created_timeseries: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          bucket: string
          menus_created: number
        }[]
      }
      get_kpi_menus_per_user_by_cohort: {
        Args: { _from?: string; _to?: string }
        Returns: {
          avg_menus_per_user: number
          cohort_month: string
          users: number
        }[]
      }
      get_kpi_menus_per_user_distribution: {
        Args: { _from?: string; _to?: string }
        Returns: {
          bucket: string
          users: number
        }[]
      }
      get_kpi_menus_per_user_timeseries: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          avg_menus_per_user: number
          bucket: string
          median_menus_per_user: number
          p90_menus_per_user: number
        }[]
      }
      get_kpi_mrr_by_plan: {
        Args: { _from?: string; _to?: string }
        Returns: {
          mrr: number
          plan: string
        }[]
      }
      get_kpi_mrr_movements: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          bucket: string
          churned_mrr: number
          contraction_mrr: number
          expansion_mrr: number
          new_mrr: number
        }[]
      }
      get_kpi_mrr_timeseries: {
        Args: {
          _country?: string
          _from?: string
          _granularity?: string
          _plan?: string
          _to?: string
        }
        Returns: {
          bucket: string
          mrr: number
        }[]
      }
      get_kpi_mrr_top_customers: {
        Args: {
          _cursor?: string
          _from?: string
          _limit?: number
          _to?: string
        }
        Returns: {
          cursor_out: string
          customer_id: string
          last_payment: string
          mrr: number
        }[]
      }
      get_kpi_new_users_by_channel: {
        Args: { _from?: string; _to?: string }
        Returns: {
          channel: string
          new_users: number
        }[]
      }
      get_kpi_new_users_timeseries: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          bucket: string
          new_users: number
        }[]
      }
      get_kpi_plan_mix_timeseries: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          active_subscribers: number
          bucket: string
          plan: string
        }[]
      }
      get_kpi_points_breakdown: {
        Args: { _dimension?: string; _from?: string; _to?: string }
        Returns: {
          dimension_value: string
          points: number
        }[]
      }
      get_kpi_points_by_event_type: {
        Args: { _from?: string; _to?: string }
        Returns: {
          event_type: string
          points: number
        }[]
      }
      get_kpi_points_leaderboard: {
        Args: {
          _cursor?: string
          _from?: string
          _limit?: number
          _to?: string
        }
        Returns: {
          cursor_out: string
          last_event_at: string
          points: number
          user_id: string
        }[]
      }
      get_kpi_points_timeseries: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          bucket: string
          points: number
        }[]
      }
      get_kpi_ratings_distribution: {
        Args: { _from?: string; _to?: string }
        Returns: {
          count: number
          stars: number
        }[]
      }
      get_kpi_ratings_timeseries: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          avg_rating: number
          bucket: string
          ratings_count: number
        }[]
      }
      get_kpi_recipe_ratings_table: {
        Args: {
          _cursor?: string
          _from?: string
          _limit?: number
          _min_count?: number
          _sort?: string
          _to?: string
        }
        Returns: {
          avg_rating: number
          cursor_out: string
          ratings_count: number
          recipe_id: string
        }[]
      }
      get_kpi_retention_cohorts: {
        Args: { _from?: string; _to?: string }
        Returns: {
          cohort_month: string
          month_n: number
          retained_rate: number
        }[]
      }
      get_kpi_subscribers_breakdown: {
        Args: { _dimension?: string; _from?: string; _to?: string }
        Returns: {
          active_subscribers: number
          dimension_value: string
        }[]
      }
      get_kpi_subscribers_timeseries: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          active_subscribers: number
          bucket: string
          cancelled_subscribers: number
          new_subscribers: number
        }[]
      }
      get_kpi_subscription_changes: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          bucket: string
          downgrades: number
          upgrades: number
        }[]
      }
      get_kpi_support_sla_stats: {
        Args: { _from?: string; _to?: string }
        Returns: {
          avg_first_response_minutes: number
          avg_resolution_minutes: number
          sla_breaches: number
        }[]
      }
      get_kpi_ticket_list: {
        Args: {
          _category?: string
          _cursor?: string
          _from?: string
          _limit?: number
          _priority?: string
          _status?: string
          _to?: string
        }
        Returns: {
          category: string
          created_at: string
          cursor_out: string
          priority: string
          status: string
          subject: string
          ticket_id: string
        }[]
      }
      get_kpi_tickets_by_category: {
        Args: { _from?: string; _to?: string }
        Returns: {
          category: string
          tickets: number
        }[]
      }
      get_kpi_tickets_timeseries: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          bucket: string
          created_tickets: number
          open_tickets: number
          resolved_tickets: number
        }[]
      }
      get_kpi_time_to_convert_distribution: {
        Args: { _from?: string; _to?: string }
        Returns: {
          days_bucket: number
          users: number
        }[]
      }
      get_kpi_top_menu_creators: {
        Args: {
          _cursor?: string
          _from?: string
          _limit?: number
          _to?: string
        }
        Returns: {
          cursor_out: string
          last_menu_at: string
          menus: number
          user_id: string
        }[]
      }
      get_kpi_users_active_timeseries: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          active_30d: number
          active_7d: number
          bucket: string
        }[]
      }
      get_kpi_users_breakdown: {
        Args: { _dimension?: string; _from?: string; _to?: string }
        Returns: {
          dimension_value: string
          users: number
        }[]
      }
      get_kpi_users_growth_timeseries: {
        Args: { _from?: string; _granularity?: string; _to?: string }
        Returns: {
          bucket: string
          new_users: number
          total_users: number
        }[]
      }
      get_menu_household:
        | {
            Args: {
              p_country?: string
              p_days: number
              p_exclude_ingrs?: string[]
              p_kcal_max?: number
              p_kcal_min?: number
              p_people: Json
              p_protein_min?: number
            }
            Returns: Json
          }
        | {
            Args: {
              p_country?: string
              p_days?: number
              p_exclude_ingrs?: string[]
              p_kcal_max?: number
              p_kcal_min?: number
              p_people: Json
              p_protein_min?: number
            }
            Returns: Json
          }
      get_menu_servings_used: {
        Args: { p_day?: string; p_payload: Json }
        Returns: number
      }
      get_recipe_ingredients_household: {
        Args: { p_people: Json; p_recipe: string; p_round_grams?: number }
        Returns: Json
      }
      get_recipe_macros: {
        Args: { recipe_id_input: number }
        Returns: {
          total_calories: number
          total_carbs: number
          total_fats: number
          total_fibers: number
          total_proteins: number
        }[]
      }
      get_recipe_macros_page: {
        Args: { p_last_recipe_id?: string; p_limit?: number }
        Returns: {
          calories_kcal: number
          carbs_g: number
          fats_g: number
          fibers_g: number
          proteins_g: number
          recipe_id: string
        }[]
      }
      get_shopping_list_from_menu: {
        Args: {
          p_exclude?: string[]
          p_menu: Json
          p_min_qty_g?: number
          p_pantry?: string[]
          p_round_g?: number
        }
        Returns: Json
      }
      get_shopping_list_from_menu_enriched_flat: {
        Args: {
          p_exclude?: string[]
          p_menu: Json
          p_min_qty_g?: number
          p_pantry?: string[]
          p_round_g?: number
        }
        Returns: Json
      }
      get_shopping_list_from_menu_enriched_grouped: {
        Args: {
          p_exclude?: string[]
          p_menu: Json
          p_min_qty_g?: number
          p_pantry?: string[]
          p_round_g?: number
        }
        Returns: Json
      }
      get_shopping_list_from_weekly_menu: {
        Args: { p_user_id: string; p_week_start?: string }
        Returns: {
          formatted_display: string
          ingredient_name: string
          total_quantity: number
          unit: string
        }[]
      }
      get_shopping_list_normalized: {
        Args: { p_user_id: string; p_week_start?: string }
        Returns: {
          formatted_display: string
          ingredient_name: string
          total_quantity: number
          unit: string
        }[]
      }
      get_user_household_info: { Args: { p_user_id: string }; Returns: Json }
      get_weekly_recipes_by_day: {
        Args: { p_user_id: string; p_week_start?: string }
        Returns: Json
      }
      handle_referral_qualification: {
        Args: {
          p_reference_id?: string
          p_reference_type?: string
          p_referred_user_id: string
        }
        Returns: Json
      }
      handle_referral_signup: {
        Args: { p_new_user_id: string; p_referral_code: string }
        Returns: Json
      }
      handle_referred_user_subscribed: {
        Args: { p_user_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      household_portion_factor: { Args: { p_people: Json }; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_onboarding_complete: { Args: { p_user_id: string }; Returns: boolean }
      normalize_fraction: { Args: { p_text: string }; Returns: number }
      normalize_granularity: { Args: { _g: string }; Returns: string }
      normalize_ingredient_line: {
        Args: { p_line: string }
        Returns: {
          canonical_unit: string
          ingredient_name: string
          quantity: number
        }[]
      }
      normalize_str: { Args: { p: string }; Returns: string }
      normalize_unit: { Args: { raw_unit: string }; Returns: string }
      parse_ingredient_line: {
        Args: { raw_line: string }
        Returns: {
          canonical_unit: string
          ingredient_name: string
          quantity: number
        }[]
      }
      parse_quantity_text: { Args: { raw_text: string }; Returns: number }
      process_recipe_macros_queue: {
        Args: { p_limit?: number }
        Returns: number
      }
      refresh_kpi_events_daily_mv: { Args: never; Returns: undefined }
      refresh_kpi_subscriptions_daily_mv: { Args: never; Returns: undefined }
      refresh_kpi_users_daily_mv: { Args: never; Returns: undefined }
      refresh_one_recipe:
        | {
            Args: { p_recipe_id: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.refresh_one_recipe(p_recipe_id => int8), public.refresh_one_recipe(p_recipe_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_recipe_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.refresh_one_recipe(p_recipe_id => int8), public.refresh_one_recipe(p_recipe_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      refresh_recipe_macros: { Args: never; Returns: undefined }
      refresh_recipe_macros_from_ciqual: { Args: never; Returns: undefined }
      refresh_recipe_macros_mv2: { Args: never; Returns: undefined }
      refresh_some_recipes: { Args: { batch_size?: number }; Returns: number }
      resolve_range: {
        Args: { _from: string; _to: string }
        Returns: Record<string, unknown>
      }
      rpc_admin_conversion_funnel: {
        Args: { p_date_from?: string; p_date_to?: string }
        Returns: Json
      }
      rpc_admin_referral_funnel: {
        Args: { p_date_from?: string; p_date_to?: string }
        Returns: Json
      }
      rpc_apply_credit_reset: { Args: { p_user_id: string }; Returns: Json }
      rpc_apply_credit_transaction: {
        Args: {
          p_amount: number
          p_feature?: string
          p_idempotency_key?: string
          p_reason?: string
          p_reference_id?: string
          p_reference_type?: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      rpc_award_xp: {
        Args: {
          p_event_type: string
          p_idempotency_key: string
          p_metadata?: Json
          p_user_id: string
          p_xp_delta: number
        }
        Returns: Json
      }
      rpc_compute_level: { Args: { p_xp: number }; Returns: Json }
      rpc_compute_reset_state: { Args: { p_user_id: string }; Returns: Json }
      rpc_debit_credits_for_job: {
        Args: {
          p_feature: string
          p_idempotency_key: string
          p_user_id: string
        }
        Returns: Json
      }
      rpc_get_effective_portions: {
        Args: { p_user_id: string; p_week_start?: string }
        Returns: Json
      }
      rpc_get_referral_stats: { Args: { p_user_id: string }; Returns: Json }
      rpc_get_user_dashboard: { Args: { p_user_id: string }; Returns: Json }
      rpc_record_referral_event: {
        Args: {
          p_event_type: string
          p_idempotency_key?: string
          p_metadata?: Json
          p_referral_code?: string
          p_referred_user_id?: string
          p_referrer_user_id: string
          p_visitor_id?: string
        }
        Returns: Json
      }
      rpc_refund_credits_for_job: {
        Args: {
          p_feature: string
          p_original_idempotency_key: string
          p_user_id: string
        }
        Returns: Json
      }
      to_num: { Args: { input_text: string }; Returns: number }
      to_number_fr: { Args: { p: string }; Returns: number }
      trunc_to_granularity: {
        Args: { _granularity: string; _ts: string }
        Returns: string
      }
      unaccent_safe: { Args: { p: string }; Returns: string }
      update_grocery_item_checked: {
        Args: {
          p_checked: boolean
          p_grocery_list_id: string
          p_ingredient_key: string
        }
        Returns: undefined
      }
      update_user_streak_and_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      use_swap_atomic: {
        Args: {
          p_day: number
          p_meal_plan_id: string
          p_month: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      gamification_event:
        | "APP_OPEN"
        | "MEAL_VALIDATED"
        | "DAY_COMPLETED"
        | "WEEKLY_CHALLENGE_COMPLETED"
        | "SOCIAL_SHARE"
        | "POINTS_REDEEMED_TO_CREDITS"
        | "CREDITS_SPENT"
        | "STREAK_MILESTONE"
        | "REFERRAL_GRANTED"
        | "REFERRAL_GOAL_REACHED"
        | "BADGE_GRANTED"
        | "ADMIN_ADJUST"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      gamification_event: [
        "APP_OPEN",
        "MEAL_VALIDATED",
        "DAY_COMPLETED",
        "WEEKLY_CHALLENGE_COMPLETED",
        "SOCIAL_SHARE",
        "POINTS_REDEEMED_TO_CREDITS",
        "CREDITS_SPENT",
        "STREAK_MILESTONE",
        "REFERRAL_GRANTED",
        "REFERRAL_GOAL_REACHED",
        "BADGE_GRANTED",
        "ADMIN_ADJUST",
      ],
    },
  },
} as const
