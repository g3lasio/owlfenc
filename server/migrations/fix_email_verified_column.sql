-- Migration: Fix email_verified column issue
-- Date: 2025-12-31
-- Issue: Column "email_verified" does not exist error in getUserByFirebaseUid
-- Solution: Ensure column exists with correct name

-- Check if column exists and add if missing
DO $$ 
BEGIN
    -- Try to add email_verified column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'email_verified'
    ) THEN
        -- Add the column
        ALTER TABLE users 
        ADD COLUMN email_verified BOOLEAN DEFAULT false NOT NULL;
        
        RAISE NOTICE 'Column email_verified added successfully';
    ELSE
        RAISE NOTICE 'Column email_verified already exists';
    END IF;
END $$;

-- Verify the column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name = 'email_verified';
