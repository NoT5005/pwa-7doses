-- ==============================================================================
-- 7Doses: Add Explicit Foreign Key Constraints & Relations
-- Run this in Supabase SQL Editor to link all tables in the Schema Visualizer (ERD)
-- ==============================================================================

-- 1. Link profiles to Supabase Auth Users
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS fk_profiles_user,
    ADD CONSTRAINT fk_profiles_user
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 2. Link effort_settings to profiles
ALTER TABLE public.effort_settings
    DROP CONSTRAINT IF EXISTS fk_effort_settings_profile,
    ADD CONSTRAINT fk_effort_settings_profile
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(user_id)
    ON DELETE CASCADE;

-- 3. Link practice_summaries to profiles
ALTER TABLE public.practice_summaries
    DROP CONSTRAINT IF EXISTS fk_practice_summaries_profile,
    ADD CONSTRAINT fk_practice_summaries_profile
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(user_id)
    ON DELETE CASCADE;

-- 4. Enable Supabase Auth Trigger for automatic user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
