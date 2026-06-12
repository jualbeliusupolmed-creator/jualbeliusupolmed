-- Migration: Seed 20 Dummy Products
-- Tujuan: Menambahkan 20 barang dengan 20 nama penjual yang berbeda-beda.
-- Dijalankan di SQL Editor Supabase.

-- 1. Buat 20 Profile Penjual Realistis yang Beda-Beda
INSERT INTO public.seller_profiles (wa, name, created_at)
VALUES 
  ('081210001001', 'Rizky Pratama', now()),
  ('081210001002', 'Nabila Syafitri', now()),
  ('081210001003', 'Kevin Adrian', now()),
  ('081210001004', 'Dandi Saputra', now()),
  ('081210001005', 'Bobby Tarigan', now()),
  ('081210001006', 'Fadli Hidayat', now()),
  ('081210001007', 'Siti Rahmawati', now()),
  ('081210001008', 'Angga Kusuma', now()),
  ('081210001009', 'Alya Nindya', now()),
  ('081210001010', 'Bima Sakti', now()),
  ('081210001011', 'Tia Maharani', now()),
  ('081210001012', 'Farhan Maulana', now()),
  ('081210001013', 'Reza Pahlevi', now()),
  ('081210001014', 'Putri Amanda', now()),
  ('081210001015', 'Iqbal Ramadhan', now()),
  ('081210001016', 'Rini Febriani', now()),
  ('081210001017', 'Joko Susilo', now()),
  ('081210001018', 'Dewi Sartika', now()),
  ('081210001019', 'Hendra Gunawan', now()),
  ('081210001020', 'Maya Indah', now())
ON CONFLICT (wa) DO NOTHING;

-- 2. Insert 20 Listings Dummy (Tiap barang dijual oleh orang yang berbeda)
INSERT INTO public.listings (seller_wa, seller_name, title, description, price, category, status, type, image_url)
VALUES 
-- Elektronik
('081210001001', 'Rizky Pratama', 'Laptop Asus VivoBook 14" (Eks Skripsi)', 'Kondisi mulus, baterai tahan 3 jam. Cocok untuk nugas dan skripsi.', 3500000, 'elektronik', 'active', 'barang', 'https://loremflickr.com/600/600/laptop'),
('081210001002', 'Nabila Syafitri', 'iPhone 11 64GB Ex iBox Mulus', 'Kesehatan baterai 85%, belum pernah bongkar. Face ID aman.', 4200000, 'elektronik', 'active', 'barang', 'https://loremflickr.com/600/600/iphone'),
('081210001003', 'Kevin Adrian', 'TWS Baseus WM01 Hitam', 'Baru pakai 2 bulan, suara masih jernih, bass mantap.', 100000, 'elektronik', 'active', 'barang', 'https://loremflickr.com/600/600/earbuds'),
('081210001004', 'Dandi Saputra', 'Printer Epson L3110 Bekas Skripsi', 'Tinta masih penuh, print warna aman. Cocok untuk mahasiswa semester akhir.', 900000, 'elektronik', 'active', 'barang', 'https://loremflickr.com/600/600/printer'),
('081210001005', 'Bobby Tarigan', 'Monitor LG 24 Inch IPS', 'Gambar jernih, tidak ada dead pixel. Dus masih lengkap buat nge-game atau coding.', 1100000, 'elektronik', 'active', 'barang', 'https://loremflickr.com/600/600/monitor'),

-- Fashion
('081210001006', 'Fadli Hidayat', 'Jaket Hoodie H&M Hitam Size L', 'Jarang pakai, warna masih pekat tidak pudar. Cocok bawa ke kampus.', 120000, 'fashion', 'active', 'barang', 'https://loremflickr.com/600/600/hoodie'),
('081210001007', 'Siti Rahmawati', 'Sepatu Vans Old Skool Hitam Putih (Size 39)', 'Minus pemakaian wajar, sol masih tebal.', 350000, 'fashion', 'active', 'barang', 'https://loremflickr.com/600/600/sneakers'),
('081210001008', 'Angga Kusuma', 'Kemeja Flanel Uniqlo Size M', 'Bahan adem, cocok buat ngampus stambuk atas.', 80000, 'fashion', 'active', 'barang', 'https://loremflickr.com/600/600/flannel'),
('081210001009', 'Alya Nindya', 'Tote Bag Kanvas Polos Hitam', 'Kuat bawa laptop dan buku tebal FISIP.', 25000, 'fashion', 'active', 'barang', 'https://loremflickr.com/600/600/totebag'),
('081210001010', 'Bima Sakti', 'Celana Cargo Hitam Pria Size 32', 'Bahan tebal tidak nerawang, banyak kantong.', 90000, 'fashion', 'active', 'barang', 'https://loremflickr.com/600/600/pants'),

-- Buku Kuliah & Buku Mahasiswa
('081210001011', 'Tia Maharani', 'Buku Kalkulus Purcell Edisi 9 Original', 'Halaman lengkap, ada sedikit coretan pensil. Wajib anak Teknik USU.', 80000, 'buku-kuliah', 'active', 'barang', 'https://loremflickr.com/600/600/mathbook'),
('081210001012', 'Farhan Maulana', 'Buku Pengantar Akuntansi', 'Edisi adaptasi Indonesia, kondisi masih sangat bagus. Buat anak FEB.', 65000, 'buku-kuliah', 'active', 'barang', 'https://loremflickr.com/600/600/textbook'),
('081210001013', 'Reza Pahlevi', 'Buku Anatomi Fisiologi', 'Buku wajib anak Kedokteran dan Kesmas. Original.', 75000, 'buku-kuliah', 'active', 'barang', 'https://loremflickr.com/600/600/anatomybook'),
('081210001014', 'Putri Amanda', 'Dasar Dasar Pemasaran Kotler', 'Ada stabilo sedikit di bab 1, sisanya bersih.', 85000, 'buku-kuliah', 'active', 'barang', 'https://loremflickr.com/600/600/marketingbook'),
('081210001015', 'Iqbal Ramadhan', 'Buku Metodologi Penelitian Sugiyono', 'Buku sakti buat ngerjain skripsi Kuantitatif Kualitatif. Mulus banget.', 55000, 'buku', 'active', 'barang', 'https://loremflickr.com/600/600/researchbook'),
('081210001016', 'Rini Febriani', 'Kamus Hukum Black''s Law Dictionary', 'Lengkap, minus di sampul agak terlipat. Cocok buat anak Hukum USU.', 60000, 'buku', 'active', 'barang', 'https://loremflickr.com/600/600/lawdictionary'),

-- Makanan
('081210001017', 'Joko Susilo', 'Nasi Ayam Geprek Dadakan', 'Bisa COD di sekitar Pintu 1 atau Pintu 4 USU. Pedas nampol!', 15000, 'makanan', 'active', 'barang', 'https://loremflickr.com/600/600/friedchicken'),
('081210001018', 'Dewi Sartika', 'Brownies Lumer Cup Besar', 'Fresh from the oven, coklatnya lumer banget. Anak Polmed bisa PO ya.', 20000, 'makanan', 'active', 'barang', 'https://loremflickr.com/600/600/brownies'),
('081210001019', 'Hendra Gunawan', 'Kopi Susu Gula Aren 1 Liter', 'Cocok buat nemenin begadang ngerjain tugas lab.', 45000, 'makanan', 'active', 'barang', 'https://loremflickr.com/600/600/icedcoffee'),
('081210001020', 'Maya Indah', 'Risol Mayo Isi Daging Asap (Per Pcs)', 'Isian lumer, digoreng dadakan di kantin FK USU.', 2500, 'makanan', 'active', 'barang', 'https://loremflickr.com/600/600/risoles');
