-- Add foreign key constraint to processed_checkout_sessions
-- This ensures referential integrity and automatic cleanup when users are deleted

DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_processed_checkout_user'
  ) THEN
    -- Add foreign key constraint with CASCADE delete
    ALTER TABLE processed_checkout_sessions
    ADD CONSTRAINT fk_processed_checkout_user
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint fk_processed_checkout_user';
  ELSE
    RAISE NOTICE 'Foreign key constraint fk_processed_checkout_user already exists';
  END IF;
END $$;

-- Verify the constraint was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_processed_checkout_user'
  ) THEN
    RAISE NOTICE '✓ Foreign key constraint verified successfully';
  ELSE
    RAISE WARNING '✗ Foreign key constraint not found after creation';
  END IF;
END $$;