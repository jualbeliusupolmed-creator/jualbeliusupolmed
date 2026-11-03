# Jadwal Tugas Terjadwal

Dokumen ini menjelaskan pemicu untuk antrean distribusi omnichannel dan jadwal
cron aplikasi yang telah terdaftar di `vercel.json`. Nilai rahasia tidak boleh
dimasukkan ke repo, SQL, URL, atau log.

## Antrean publikasi kampus/provinsi

Endpoint `/api/cron/omnichannel-distribution` memproses paling banyak 10 job
yang waktunya sudah tiba dalam satu pemanggilan. Endpoint memerlukan
`Authorization: Bearer <CRON_SECRET>`. Kode endpoint sudah tersedia, tetapi
belum otomatis berjalan sampai pemicu berikut dipasang dan aplikasi dideploy.

Gunakan Supabase Cron untuk interval lima menit. Dokumentasi Vercel saat ini
membatasi jadwal Hobby menjadi paling sering sekali sehari; Pro dan Enterprise
mendukung jadwal per menit. Karena paket proyek belum diverifikasi, cron
Supabase menghindari ketergantungan worker ini pada tingkat paket Vercel.

### Setup

1. Tetapkan nilai acak kuat sebagai `CRON_SECRET` di Vercel Project Settings
   untuk Production, lalu deploy versi aplikasi yang memuat endpoint.
2. Di Supabase Dashboard → **Vault**, simpan nilai yang sama sebagai secret
   bernama `omnichannel_cron_secret`. Jangan menaruh nilainya ke SQL editor,
   repositori, atau catatan.
3. Pastikan ekstensi **pg_cron** dan **pg_net** tersedia pada proyek.
4. Jalankan SQL berikut di SQL Editor setelah mengganti hanya domain aplikasi
   jika domain produksi berbeda. SQL membaca rahasia dari Vault dan tidak
   menyimpan token di definisi jadwal.

```sql
select cron.schedule(
  'omnichannel-distribution-every-5m',
  '*/5 * * * *',
  $job$
    select net.http_get(
      url := 'https://www.kampuskita.my.id/api/cron/omnichannel-distribution',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'omnichannel_cron_secret'
          limit 1
        )
      ),
      timeout_milliseconds := 25000
    );
  $job$
);
```

Jalankan sekali saja. Jika job sudah ada, periksa
`cron.job` sebelum menjadwalkannya kembali; jangan membuat nama job duplikat.

### Verifikasi dan pemulihan

```sql
select jobid, jobname, schedule, active, command
from cron.job
where jobname = 'omnichannel-distribution-every-5m';

select jobid, status, return_message, start_time, end_time
from cron.job_run_details
where jobid = (
  select jobid from cron.job
  where jobname = 'omnichannel-distribution-every-5m'
)
order by start_time desc
limit 20;
```

Respons endpoint hanya memberikan hitungan job, bukan data pembeli. Untuk
menonaktifkan pemicu tanpa menghapus riwayat:

```sql
select cron.alter_job(
  (select jobid from cron.job where jobname = 'omnichannel-distribution-every-5m'),
  active := false
);
```

Jika endpoint salah versi, rollback Vercel ke deployment Production terakhir
yang diketahui baik. Jika pemicu menimbulkan masalah, nonaktifkan cron di atas.
Job distribusi yang statusnya sudah `publishing` perlu ditinjau sebelum retry;
pengiriman eksternal dapat berhasil walau pencatatan balasan gagal.

## Jadwal aplikasi lain

Jadwal yang tercatat di `vercel.json` meliputi kedaluwarsa listing, auto-bump,
broadcast, ringkasan, follow-up, dan antrean menfess. Jadwal tersebut tidak
diubah oleh worker omnichannel baru. Verifikasi jadwal dan riwayat eksekusi
cron dari Vercel Dashboard sebelum mengubah intervalnya.

## Batas operasional

- `CRON_SECRET` wajib diatur pada runtime; jika kosong, endpoint menolak akses.
- Rotasi: ubah nilai di Vercel dan Vault dalam satu jendela, lalu verifikasi
  eksekusi sebelum menghapus nilai lama.
- Batasi log pada status, durasi, dan jumlah job. Jangan mencatat header
  Authorization atau token Meta.
