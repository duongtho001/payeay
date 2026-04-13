/* ═══════════════════════════════════════════════════════════
   PayEay — Supabase Configuration
   ═══════════════════════════════════════════════════════════
   Config được lưu qua Admin Panel (admin.html)
   hoặc điền trực tiếp vào biến bên dưới.
   ═══════════════════════════════════════════════════════════ */

// Hardcode (ưu tiên thấp hơn localStorage)
var SUPABASE_URL_HARDCODE = '';
var SUPABASE_KEY_HARDCODE = '';

// Đọc từ localStorage (Admin Panel lưu ở đây)
var SUPABASE_URL = localStorage.getItem('payeay_sb_url') || SUPABASE_URL_HARDCODE;
var SUPABASE_ANON_KEY = localStorage.getItem('payeay_sb_key') || SUPABASE_KEY_HARDCODE;

// Supabase client (tách biệt với window.supabase CDN)
var sbClient = null;

function initSupabase() {
    // Re-read in case admin just saved
    SUPABASE_URL = localStorage.getItem('payeay_sb_url') || SUPABASE_URL_HARDCODE;
    SUPABASE_ANON_KEY = localStorage.getItem('payeay_sb_key') || SUPABASE_KEY_HARDCODE;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('[PayEay] Supabase chưa cấu hình — dùng localStorage fallback');
        console.warn('[PayEay] Vào admin.html để cấu hình Supabase');
        return false;
    }
    try {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('[PayEay] Supabase initialized ✅', SUPABASE_URL);
            return true;
        } else {
            console.warn('[PayEay] Supabase CDN chưa load xong');
            return false;
        }
    } catch (e) {
        console.error('[PayEay] Supabase init error:', e);
        return false;
    }
}

function isSupabaseReady() {
    return sbClient !== null;
}
