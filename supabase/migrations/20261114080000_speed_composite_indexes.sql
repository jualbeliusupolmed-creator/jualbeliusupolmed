-- Migration: Composite Performance Indexes for Instant Feeds
-- Author: Engineering Performance Overhaul
-- Target: Zero-latency indexed lookups on listings, mading, and open-po

-- 1. Index Komposit untuk Feed Beranda & Marketplace
CREATE INDEX IF NOT EXISTS idx_listings_feed_perf
ON listings (status, type, featured DESC NULLS LAST, bumped_at DESC NULLS LAST);

-- 2. Index untuk Pemfilteran Kampus Cepat
CREATE INDEX IF NOT EXISTS idx_listings_campus_status_bumped
ON listings (campus, status, bumped_at DESC NULLS LAST);

-- 3. Index untuk Feed Menfess / Mading Kampus
CREATE INDEX IF NOT EXISTS idx_mading_posts_feed_perf
ON mading_posts (status, created_at DESC);

-- 4. Index untuk Feed Open PO Aktif
CREATE INDEX IF NOT EXISTS idx_open_po_batches_feed_perf
ON open_po_batches (status, created_at DESC);

