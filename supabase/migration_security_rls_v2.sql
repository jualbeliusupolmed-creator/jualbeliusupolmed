-- ============================================================================
-- PENGENCANGAN AKSES DATABASE (RLS) v2 — MENGUNCI SEMUA TABEL SUPER APP
-- ============================================================================
-- Mengunci semua tabel publik secara dinamis agar tidak bisa dibaca/ditulis 
-- oleh role 'anon' dan 'authenticated'. Karena website ini murni bergantung
-- pada Next.js API Routes dengan service_role key, akses dari client (anon/auth)
-- langsung ke database Supabase harus ditutup rapat-rapat.
--
-- Pengecualian:
-- - Tabel 'pwa_installs' tetap dibiarkan bisa di-insert oleh anon 
--   untuk keperluan pelacakan instalasi awal.
-- ============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Loop ke semua tabel di schema public
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        -- Aktifkan RLS pada tabel
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY';
        
        -- Cabut semua akses dari anon dan authenticated
        EXECUTE 'REVOKE ALL ON TABLE public.' || quote_ident(r.tablename) || ' FROM anon, authenticated';
    END LOOP;
END $$;

-- PENGECUALIAN: Buka akses INSERT anon untuk pwa_installs (Analitik)
GRANT INSERT ON TABLE public.pwa_installs TO anon;
-- (Jika pwa_installs butuh policy eksplisit)
DROP POLICY IF EXISTS "Anon can insert pwa_installs" ON public.pwa_installs;
CREATE POLICY "Anon can insert pwa_installs" ON public.pwa_installs FOR INSERT TO anon WITH CHECK (true);
