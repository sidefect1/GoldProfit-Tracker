
import { createClient } from '@supabase/supabase-js';

// Read from env or use defaults if provided in prompt context
const SUPABASE_URL = 'https://nplveuoglatopffwucvt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wbHZldW9nbGF0b3BmZnd1Y3Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTc0MjAsImV4cCI6MjA4NDkzMzQyMH0.1zAywA5hfyGWHJW-PqvE1Rky39XZmQKDjBjKGwM0pL4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
