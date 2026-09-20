import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL =
  "https://rcikgkdesnlfewkfeybv.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_Nm1XfSDRO1O_2qY20Q_eSQ_Sfh0DiCf";

export const db = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
