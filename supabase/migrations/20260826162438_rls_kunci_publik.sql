DROP POLICY IF EXISTS "Public read active mading posts"  ON public.mading_posts;
DROP POLICY IF EXISTS "Public insert mading posts"       ON public.mading_posts;
DROP POLICY IF EXISTS "Public read mading comments"      ON public.mading_comments;
DROP POLICY IF EXISTS "Public insert mading comments"    ON public.mading_comments;
DROP POLICY IF EXISTS "Public read mading likes"         ON public.mading_likes;
DROP POLICY IF EXISTS "Public insert mading likes"       ON public.mading_likes;
DROP POLICY IF EXISTS "Public delete own mading likes"   ON public.mading_likes;
DROP POLICY IF EXISTS "Public can read active replies"   ON public.mading_replies;
DROP POLICY IF EXISTS "Authenticated can insert replies" ON public.mading_replies;

DROP POLICY IF EXISTS "Public can view active oprec events"   ON public.oprec_events;
DROP POLICY IF EXISTS "UKM can manage their own oprec events" ON public.oprec_events;
DROP POLICY IF EXISTS "Public can submit oprec application"   ON public.oprec_submissions;
DROP POLICY IF EXISTS "UKM and applicant can view submissions" ON public.oprec_submissions;
DROP POLICY IF EXISTS "UKM can update submission status"      ON public.oprec_submissions;

DROP POLICY IF EXISTS "public read verified status"           ON public.verified_sellers;
DROP POLICY IF EXISTS "Public can view system settings"       ON public.system_settings;
DROP POLICY IF EXISTS "public read published blogs"           ON public.blogs;
DROP POLICY IF EXISTS "anon_read_categories"                  ON public.categories;

DROP POLICY IF EXISTS "anon_read_active_listings"             ON public.listings;
DROP POLICY IF EXISTS "anon_read_active_wanted"               ON public.wanted_listings;
DROP POLICY IF EXISTS "anyone can insert cat subscriptions"   ON public.category_subscriptions;
DROP POLICY IF EXISTS "anyone can delete own cat subscription" ON public.category_subscriptions;

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;;
