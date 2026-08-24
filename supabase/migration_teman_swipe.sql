-- ==============================================================================
-- MIGRATION: Fitur Cari Teman Kampus (Swipe Match USU & Polmed)
-- ==============================================================================

-- 1. Tabel Profil Cari Teman
CREATE TABLE IF NOT EXISTS public.teman_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Client unique ID / session
  photo_url TEXT NOT NULL, -- Wajib 1 foto
  photo_urls JSONB DEFAULT '[]'::jsonb,
  display_name TEXT DEFAULT 'Anak Kampus',
  gender TEXT DEFAULT 'all', -- 'Laki-laki', 'Perempuan', 'Lainnya'
  target_gender TEXT DEFAULT 'all', -- 'Semua', 'Laki-laki', 'Perempuan'
  campus TEXT DEFAULT 'USU', -- 'USU', 'Polmed', 'Semua'
  faculty TEXT DEFAULT 'Umum',
  batch TEXT DEFAULT '2024',
  intent TEXT DEFAULT 'Teman Santai ☕',
  bio TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  likes_received INT DEFAULT 0,
  matches_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_teman_profiles_user_id ON public.teman_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_teman_profiles_campus ON public.teman_profiles(campus);
CREATE INDEX IF NOT EXISTS idx_teman_profiles_active ON public.teman_profiles(is_active);

-- 2. Tabel Aksi Swipes (Like / Pass / Superlike)
CREATE TABLE IF NOT EXISTS public.teman_swipes (
  id BIGSERIAL PRIMARY KEY,
  swiper_id UUID NOT NULL REFERENCES public.teman_profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.teman_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('like', 'pass', 'superlike')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_teman_swipe UNIQUE(swiper_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_teman_swipes_swiper ON public.teman_swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_teman_swipes_target ON public.teman_swipes(target_id);

-- 3. Tabel Mutual Matches
CREATE TABLE IF NOT EXISTS public.teman_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.teman_profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.teman_profiles(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  chat_room_id TEXT,
  CONSTRAINT uq_teman_match_pair UNIQUE(user1_id, user2_id),
  CONSTRAINT chk_ordered_match_pair CHECK (user1_id < user2_id)
);

CREATE INDEX IF NOT EXISTS idx_teman_matches_user1 ON public.teman_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_teman_matches_user2 ON public.teman_matches(user2_id);

-- 4. Enable RLS
ALTER TABLE public.teman_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teman_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teman_matches ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Public can view active teman profiles" ON public.teman_profiles;
CREATE POLICY "Public can view active teman profiles"
  ON public.teman_profiles FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Public can insert own profile" ON public.teman_profiles;
CREATE POLICY "Public can insert own profile"
  ON public.teman_profiles FOR INSERT
  WITH CHECK (photo_url IS NOT NULL AND length(photo_url) > 5);

DROP POLICY IF EXISTS "Public can update own profile" ON public.teman_profiles;
CREATE POLICY "Public can update own profile"
  ON public.teman_profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can manage swipes" ON public.teman_swipes;
CREATE POLICY "Public can manage swipes"
  ON public.teman_swipes FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view matches" ON public.teman_matches;
CREATE POLICY "Public can view matches"
  ON public.teman_matches FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can manage matches" ON public.teman_matches;
CREATE POLICY "Public can manage matches"
  ON public.teman_matches FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Atomic Matching RPC Function
CREATE OR REPLACE FUNCTION public.process_teman_swipe(
  p_swiper_id UUID,
  p_target_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_reciprocal BOOLEAN := false;
  v_u1 UUID;
  v_u2 UUID;
  v_match_id UUID;
  v_partner_record JSONB;
BEGIN
  -- Insert or update swipe
  INSERT INTO public.teman_swipes (swiper_id, target_id, action, created_at)
  VALUES (p_swiper_id, p_target_id, p_action, now())
  ON CONFLICT (swiper_id, target_id)
  DO UPDATE SET action = p_action, created_at = now();

  -- If it's a pass, return no match
  IF p_action = 'pass' THEN
    RETURN jsonb_build_object('matched', false);
  END IF;

  -- Update likes received count on target
  UPDATE public.teman_profiles
  SET likes_received = likes_received + 1
  WHERE id = p_target_id;

  -- Check if target also liked swiper
  SELECT EXISTS (
    SELECT 1 FROM public.teman_swipes
    WHERE swiper_id = p_target_id
      AND target_id = p_swiper_id
      AND action IN ('like', 'superlike')
  ) INTO v_is_reciprocal;

  IF v_is_reciprocal THEN
    -- Order IDs to enforce uniqueness
    IF p_swiper_id < p_target_id THEN
      v_u1 := p_swiper_id;
      v_u2 := p_target_id;
    ELSE
      v_u1 := p_target_id;
      v_u2 := p_swiper_id;
    END IF;

    -- Create or get match record
    INSERT INTO public.teman_matches (user1_id, user2_id, matched_at, is_active)
    VALUES (v_u1, v_u2, now(), true)
    ON CONFLICT (user1_id, user2_id)
    DO UPDATE SET is_active = true, matched_at = now()
    RETURNING id INTO v_match_id;

    -- Update match counts
    UPDATE public.teman_profiles SET matches_count = matches_count + 1 WHERE id IN (p_swiper_id, p_target_id);

    -- Fetch partner profile details
    SELECT jsonb_build_object(
      'id', id,
      'display_name', display_name,
      'photo_url', photo_url,
      'campus', campus,
      'faculty', faculty,
      'intent', intent,
      'whatsapp', whatsapp,
      'instagram', instagram,
      'bio', bio
    ) INTO v_partner_record
    FROM public.teman_profiles
    WHERE id = p_target_id;

    RETURN jsonb_build_object(
      'matched', true,
      'match_id', v_match_id,
      'partner', v_partner_record
    );
  END IF;

  RETURN jsonb_build_object('matched', false);
END;
$$;
