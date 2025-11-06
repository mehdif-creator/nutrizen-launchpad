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
          email: string | null
          full_name: string | null
          id: string
          locale: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          locale?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          locale?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          ciqual_id: number | null
          created_at: string | null
          id: number
          ingredient_line_raw: string | null
          ingredient_name: string
          ingredient_name_norm: string | null
          quantity_g: number | null
          quantity_g_num: number | null
          recipe_id: string | null
        }
        Insert: {
          ciqual_id?: number | null
          created_at?: string | null
          id?: number
          ingredient_line_raw?: string | null
          ingredient_name: string
          ingredient_name_norm?: string | null
          quantity_g?: number | null
          quantity_g_num?: number | null
          recipe_id?: string | null
        }
        Update: {
          ciqual_id?: number | null
          created_at?: string | null
          id?: number
          ingredient_line_raw?: string | null
          ingredient_name?: string
          ingredient_name_norm?: string | null
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
      recipes: {
        Row: {
          ai_keywords: string[] | null
          allergens: string[] | null
          appliances: string[] | null
          badges: string[] | null
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
          appliances?: string[] | null
          badges?: string[] | null
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
          appliances?: string[] | null
          badges?: string[] | null
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
      user_gamification: {
        Row: {
          badges_count: number
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
      user_weekly_menus: {
        Row: {
          created_at: string | null
          menu_id: string
          payload: Json
          updated_at: string | null
          used_fallback: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          menu_id?: string
          payload?: Json
          updated_at?: string | null
          used_fallback?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          menu_id?: string
          payload?: Json
          updated_at?: string | null
          used_fallback?: string | null
          user_id?: string
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
      calculate_user_level: { Args: { points: number }; Returns: string }
      canonicalize_name: { Args: { p_name_norm: string }; Returns: string }
      cleanup_expired_tokens: { Args: never; Returns: undefined }
      cleanup_old_checkout_sessions: { Args: never; Returns: undefined }
      deduct_week_regeneration_credits: {
        Args: { p_month: string; p_user_id: string }
        Returns: Json
      }
      extract_name: { Args: { line: string }; Returns: string }
      extract_qty_g: { Args: { line: string }; Returns: number }
      generate_referral_code: { Args: { user_id: string }; Returns: string }
      get_menu_household:
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      household_portion_factor: { Args: { p_people: Json }; Returns: number }
      normalize_str: { Args: { p: string }; Returns: string }
      refresh_one_recipe:
        | {
            Args: { p_recipe_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.refresh_one_recipe(p_recipe_id => int8), public.refresh_one_recipe(p_recipe_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_recipe_id: number }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.refresh_one_recipe(p_recipe_id => int8), public.refresh_one_recipe(p_recipe_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      refresh_recipe_macros: { Args: never; Returns: undefined }
      refresh_recipe_macros_from_ciqual: { Args: never; Returns: undefined }
      refresh_some_recipes: { Args: { batch_size?: number }; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      to_num: { Args: { input_text: string }; Returns: number }
      to_number_fr: { Args: { p: string }; Returns: number }
      unaccent: { Args: { "": string }; Returns: string }
      unaccent_safe: { Args: { p: string }; Returns: string }
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
    },
  },
} as const
