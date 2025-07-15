// supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://ylsodxvamvpauwlwizkf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsc29keHZhbXZwYXV3bHdpemtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NjA1MzYsImV4cCI6MjA2ODAzNjUzNn0.JMtzBrayxLnLwxXgZKXQVnxhSJcRnqD-OK4bnyjkpNQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)