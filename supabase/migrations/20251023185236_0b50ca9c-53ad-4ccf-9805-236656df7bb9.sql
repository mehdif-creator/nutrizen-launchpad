-- Fix recipe_ingredients validation issues
-- Add CHECK constraints for data integrity

-- Add constraint: quantity must be positive
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_quantity_positive' 
    AND conrelid = 'public.recipe_ingredients'::regclass
  ) THEN
    ALTER TABLE public.recipe_ingredients
    ADD CONSTRAINT check_quantity_positive CHECK (quantity_g > 0);
  END IF;
END $$;

-- Add constraint: ingredient name must be between 1 and 200 characters
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_ingredient_name_length' 
    AND conrelid = 'public.recipe_ingredients'::regclass
  ) THEN
    ALTER TABLE public.recipe_ingredients
    ADD CONSTRAINT check_ingredient_name_length CHECK (length(ingredient_name) BETWEEN 1 AND 200);
  END IF;
END $$;

-- Add constraint: ingredient name cannot be empty or just whitespace  
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_ingredient_name_not_empty' 
    AND conrelid = 'public.recipe_ingredients'::regclass
  ) THEN
    ALTER TABLE public.recipe_ingredients
    ADD CONSTRAINT check_ingredient_name_not_empty CHECK (trim(ingredient_name) != '');
  END IF;
END $$;