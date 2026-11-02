-- 1. Buang indeks unik kembar di listings.listing_code.
--    listings_listing_code_unique menopang UNIQUE constraint (pg_constraint),
--    idx_listings_listing_code_unique cuma salinan lepas dengan definisi persis
--    sama. Keunikan tidak melonggar; yang dihemat adalah tulis (dua B-tree
--    identik dipelihara tiap INSERT/UPDATE listings).
DROP INDEX IF EXISTS public.idx_listings_listing_code_unique;

-- 2. auth.role() dievaluasi sekali per query, bukan sekali per baris.
--    Membungkus dengan SELECT membuat perencana mengangkatnya jadi InitPlan.
--    Semantik policy tidak berubah sama sekali.
DROP POLICY IF EXISTS service_role_full_access_buyer_contacts ON public.buyer_contacts;
CREATE POLICY service_role_full_access_buyer_contacts
  ON public.buyer_contacts
  FOR ALL
  USING ((select auth.role()) = 'service_role');;
