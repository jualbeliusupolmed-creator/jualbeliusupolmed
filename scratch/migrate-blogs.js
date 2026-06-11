const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to DB");

    // 1. Create blogs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        author TEXT DEFAULT 'Admin',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("Table 'blogs' created or already exists.");

    // 2. Insert dummy data if table is empty
    const { rows } = await client.query(`SELECT count(*) FROM blogs`);
    if (parseInt(rows[0].count) === 0) {
      console.log("Seeding dummy blogs...");
      await client.query(`
        INSERT INTO blogs (slug, title, content, image_url, author) VALUES
        ('tips-cari-kos-murah-dekat-usu', 'Tips Cari Kos Murah dan Nyaman di Dekat Pintu 1 USU', '# Panduan Mencari Kos\n\nMencari kos di sekitar USU gampang-gampang susah. Kalau mau cari yang murah dan strategis, coba cari di area **Pintu 1 USU** atau **Jalan Dr. Mansyur**.\n\n## 1. Tentukan Budget\nPastikan budget Anda sesuai. Rata-rata kos di sekitar USU berkisar antara Rp 500.000 hingga Rp 1.500.000 per bulan.\n\n## 2. Cari Info di Jual Beli USU Polmed\nAnda bisa langsung mengecek berbagai iklan Kos-kosan di platform kita ini. Atau, gunakan fitur **Papan Dicari** agar pemilik kos yang langsung menghubungi Anda.', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop', 'Admin'),
        ('harga-laptop-bekas-medan', 'Pasaran Harga Laptop Bekas Spesifikasi Coding di Medan', '# Laptop Bekas Buat Kuliah IT\n\nUntuk mahasiswa Fasilkom-TI atau Teknik Elektro, spesifikasi laptop yang mumpuni sangat dibutuhkan. Berikut adalah kisaran harga laptop bekas yang cocok untuk coding:\n\n- **Lenovo Thinkpad T480 (Core i5 Gen 8, RAM 8GB)**: Rp 3.500.000 - Rp 4.200.000\n- **Asus Vivobook (Ryzen 3/5)**: Rp 4.000.000 - Rp 5.000.000\n\n## Tips Beli Bekas\nSelalu pastikan untuk mengecek kondisi baterai, keyboard, dan port sebelum melakukan transaksi (COD).', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop', 'Admin'),
        ('tempat-fotokopi-murah-polmed', 'Rekomendasi Tempat Fotokopi Paling Murah di POLMED', '# Solusi Cetak Tugas Akhir\n\nSedang menyusun Laporan Akhir (LA) atau skripsi? Jangan sampai biaya cetak membuat kantong jebol.\n\n## Rekomendasi 1\nFotokopi di deretan **Pintu 4 USU**. Harganya sangat bersahabat untuk cetak partai besar (skripsi/tesis).\n\nCek barang-barang penunjang kuliah lainnya di platform kita!', 'https://images.unsplash.com/photo-1544465544-1b71aee9dfa3?w=800&auto=format&fit=crop', 'Admin');
      `);
      console.log("Dummy blogs seeded.");
    } else {
      console.log("Blogs table is not empty, skipping seed.");
    }

  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    await client.end();
  }
}

run();
