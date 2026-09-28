import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://grlxsmyrupygdqupmgbx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_5r4A-xxVPDq35uwAcVx8EQ_ZFyB3Gbd';

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);