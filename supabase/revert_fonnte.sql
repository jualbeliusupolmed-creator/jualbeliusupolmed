-- Kembalikan pesan yang sempat sukses dikirim melalui fallback Fonnte
-- agar masuk kembali ke dalam antrean (outbox) dan dapat dikirim ulang via Baileys.
UPDATE public.wa_outbox
SET 
  status = 'tertunda',
  galat_terakhir = 'dikembalikan dari fonnte ke antrean untuk Baileys'
WHERE galat_terakhir = 'terkirim lewat jalur cadangan (Fonnte)';
