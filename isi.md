kerjakan ini semua

Build a complete Next.js 14 marketplace web app called "Jual Beli USU Polmed" with the following specs:

TECH STACK:
- Next.js 14 (App Router)
- Supabase (database + storage)
- Midtrans (payment gateway)
- Fonnte (WhatsApp notifications)
- Tailwind CSS
- Deploy-ready for Vercel (free tier)

PAGES:
1. / → Homepage: listing barang aktif, search, filter kategori (All, Elektronik, Fashion, Buku, Makanan, Kos, Buku Kuliah, Jasa), featured ads di banner atas
2. /jual → Form pengajuan iklan (barang/poster), upload foto, input stok, pilih kategori, bayar via Midtrans
3. /cara-bergabung → Info aturan, QR grup WA, link bit.ly/jualbeliusupolmed
4. /dashboard → Seller dashboard: iklan aktif, stok, status, pemasukan fee, mark as sold
5. /admin → Admin dashboard (password protected): statistik, total fee, kelola semua listing, blacklist

FEATURES:
- Auto-live setelah payment success (Midtrans webhook)
- Featured ads tampil di banner homepage (Rp 5.000-10.000/hari)
- Bump iklan ke atas (Rp 1.000)
- Auto-expire listing 14 hari + notif WA perpanjang
- Stok barang (bisa update)
- Mark as sold → trigger fee after sold
- Notif WA ke admin (Fonnte) setiap ada listing baru
- Notif WA ke penjual kalau ada yang minat (tombol "Minat" → WA penjual + notif Fonnte)
- Auto-post listing ke grup WA via Fonnte setelah bayar
- Share to IG Story: auto-generate gambar iklan 9:16 (canvas/html2canvas) siap download
- Kategori filter di homepage

FEE STRUCTURE:
- Iklan barang: Rp 2.000
- Iklan poster: Rp 10.000
- Bump: Rp 1.000
- Featured ads: Rp 5.000-10.000/hari
- After sold: <50k=Rp2.000, <100k=10%, >100k=5%

SUPABASE TABLES:
- listings: id, seller_name, seller_wa, title, description, price, stock, category, type(barang/poster), image_url, status(active/expired/sold), featured(bool), featured_until, bumped_at, expires_at, created_at
- payments: id, listing_id, type(iklan/bump/featured/sold_fee), amount, status, midtrans_order_id, created_at
- categories: id, name, slug

MIDTRANS:
- Sandbox mode dulu
- Webhook endpoint: /api/midtrans/webhook
- After payment success → update listing status to active

FONNTE:
- Admin notif: setiap listing baru tayang
- Seller notif: ada yang minat di barangnya
- Auto-post to WA group: format rapi dengan foto & detail barang

ADMIN:
- Password: bismillah
- Simple session-based auth
- Dashboard: total listings, total revenue, listings per kategori
- Bisa hapus/suspend listing
- Bisa blacklist nomor WA penjual

DESIGN:
- Clean, mobile-first
- Warna utama: ungu (#6D28D9) + hijau WA (#25D366)
- Logo: "Jual Beli USU POLMED" dengan ikon USU & Polmed
- Responsive

ENV VARIABLES NEEDED:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- MIDTRANS_SERVER_KEY
- MIDTRANS_CLIENT_KEY
- FONNTE_TOKEN
- FONNTE_WA_GROUP_ID
- ADMIN_PASSWORD=bismillah
- MARKETPLACE_WA=62895429126232

Generate semua file lengkap termasuk:
- Schema SQL untuk Supabase (supabase/schema.sql)
- Semua API routes
- Semua pages & components
- .env.example
- README.md dengan cara setup langkah per langkah

<!-- Dashboard Penjual - Modern Style -->
<!DOCTYPE html>

<html class="light" lang="id"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Dashboard Penjual - Jual Beli USU Polmed</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "surface-container": "#e5eeff",
                    "inverse-on-surface": "#eaf1ff",
                    "tertiary-container": "#8f4200",
                    "background": "#f8f9ff",
                    "on-secondary-fixed": "#002109",
                    "secondary-container": "#5dfd8a",
                    "on-primary": "#ffffff",
                    "tertiary-fixed-dim": "#ffb68b",
                    "on-error-container": "#93000a",
                    "inverse-primary": "#d3bbff",
                    "surface-tint": "#7331df",
                    "error-container": "#ffdad6",
                    "secondary-fixed-dim": "#3de273",
                    "on-surface-variant": "#4a4455",
                    "secondary-fixed": "#66ff8e",
                    "primary-fixed": "#ebddff",
                    "on-surface": "#0b1c30",
                    "on-primary-fixed": "#250059",
                    "surface-container-high": "#dce9ff",
                    "outline-variant": "#ccc3d7",
                    "on-tertiary": "#ffffff",
                    "on-primary-container": "#dac5ff",
                    "error": "#ba1a1a",
                    "surface": "#f8f9ff",
                    "on-background": "#0b1c30",
                    "inverse-surface": "#213145",
                    "surface-bright": "#f8f9ff",
                    "on-secondary-fixed-variant": "#005322",
                    "on-tertiary-container": "#ffc19e",
                    "surface-container-low": "#eff4ff",
                    "tertiary-fixed": "#ffdbc8",
                    "surface-variant": "#d3e4fe",
                    "surface-container-highest": "#d3e4fe",
                    "on-primary-fixed-variant": "#5b00c5",
                    "on-secondary": "#ffffff",
                    "tertiary": "#6b3000",
                    "on-tertiary-fixed": "#321300",
                    "primary": "#5300b7",
                    "on-surface-variant": "#5a5d6b",
                    "surface-container-lowest": "#ffffff",
                    "primary-fixed-dim": "#d3bbff",
                    "on-secondary-container": "#007232",
                    "outline": "#e0e2ec",
                    "surface-dim": "#cbdbf5",
                    "secondary": "#006d2f",
                    "on-error": "#ffffff",
                    "primary-container": "#6d28d9",
                    "on-tertiary-fixed-variant": "#743400"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "gutter": "24px",
                    "base": "4px",
                    "max-width": "1280px",
                    "md": "1.5rem",
                    "xl": "4rem",
                    "sm": "1rem",
                    "margin-mobile": "16px",
                    "xs": "0.5rem",
                    "lg": "2.5rem",
                    "margin-desktop": "48px"
            },
            "fontFamily": {
                    "body-lg": ["Inter"],
                    "body-md": ["Inter"],
                    "label-md": ["Inter"],
                    "display-lg": ["Inter"],
                    "headline-lg": ["Inter"],
                    "headline-lg-mobile": ["Inter"],
                    "headline-md": ["Inter"],
                    "caption": ["Inter"]
            },
            "fontSize": {
                    "body-lg": ["18px", {"lineHeight": "1.6", "letterSpacing": "0", "fontWeight": "400"}],
                    "body-md": ["16px", {"lineHeight": "1.5", "letterSpacing": "0", "fontWeight": "400"}],
                    "label-md": ["14px", {"lineHeight": "1.2", "letterSpacing": "0.04em", "fontWeight": "500"}],
                    "display-lg": ["48px", {"lineHeight": "1.1", "letterSpacing": "0.02em", "fontWeight": "700"}],
                    "headline-lg": ["32px", {"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "600"}],
                    "headline-lg-mobile": ["24px", {"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "600"}],
                    "headline-md": ["20px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "600"}],
                    "caption": ["12px", {"lineHeight": "1.4", "letterSpacing": "0", "fontWeight": "400"}]
            }
          },
        },
      }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            display: inline-block;
            line-height: 1;
            text-transform: none;
            letter-spacing: normal;
            word-wrap: normal;
            white-space: nowrap;
            direction: ltr;
        }
        body { font-family: 'Inter', sans-serif; }
        .minimal-card {
            background: #ffffff;
            border: 1px solid #e0e2ec;
        }
    </style>
</head>
<body class="bg-[#f8f9ff] text-on-background min-h-screen flex flex-col">
<!-- TopNavBar -->
<header class="fixed top-0 w-full z-50 bg-white border-b border-outline shadow-sm h-16">
<div class="flex items-center justify-between px-margin-mobile md:px-margin-desktop h-full w-full max-w-[1280px] mx-auto">
<div class="flex items-center gap-sm">
<img alt="Logo" class="h-8 w-8 object-contain" src="data:image/png;base64,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"/>
<span class="text-headline-md font-bold text-primary hidden sm:inline">Jual Beli USU Polmed</span>
</div>
<nav class="hidden md:flex items-center gap-lg">
<a class="text-on-surface-variant hover:text-primary transition-colors text-label-md" href="#">Kategori</a>
<a class="text-primary font-bold border-b-2 border-primary pb-1 text-label-md" href="#">Dashboard</a>
</nav>
<div class="flex items-center gap-md">
<button class="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-md transition-all duration-200 ease-in-out active:scale-95">
                Jual
            </button>
<div class="flex items-center gap-sm text-on-surface-variant">
<button class="p-sm hover:bg-surface-container-low rounded-full transition-all active:scale-90">
<span class="material-symbols-outlined">notifications</span>
</button>
<button class="p-sm hover:bg-surface-container-low rounded-full transition-all active:scale-90">
<span class="material-symbols-outlined">person</span>
</button>
</div>
</div>
</div>
</header>
<main class="flex-grow pt-24 pb-12 px-margin-mobile md:px-margin-desktop max-w-[1280px] mx-auto w-full">
<!-- Dashboard Header -->
<div class="mb-lg">
<h1 class="text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">Dashboard Penjual</h1>
<p class="text-body-md text-on-surface-variant mt-xs">Kelola dagangan Anda dan pantau performa penjualan di kampus.</p>
</div>
<!-- Stats Bento Grid -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-md mb-xl">
<div class="minimal-card p-lg rounded-xl flex items-center gap-lg">
<div class="bg-[#f3edff] w-14 h-14 rounded-2xl flex items-center justify-center text-primary shadow-sm">
<span class="material-symbols-outlined text-[28px]">inventory_2</span>
</div>
<div>
<p class="text-caption font-medium uppercase tracking-wider text-on-surface-variant">Iklan Aktif</p>
<p class="text-headline-md font-bold text-on-surface">12 Produk</p>
</div>
</div>
<div class="minimal-card p-lg rounded-xl flex items-center gap-lg">
<div class="bg-[#e7f9ee] w-14 h-14 rounded-2xl flex items-center justify-center text-secondary shadow-sm">
<span class="material-symbols-outlined text-[28px]">verified</span>
</div>
<div>
<p class="text-caption font-medium uppercase tracking-wider text-on-surface-variant">Total Terjual</p>
<p class="text-headline-md font-bold text-on-surface">48 Item</p>
</div>
</div>
<div class="minimal-card p-lg rounded-xl flex items-center gap-lg">
<div class="bg-[#fff4eb] w-14 h-14 rounded-2xl flex items-center justify-center text-tertiary shadow-sm">
<span class="material-symbols-outlined text-[28px]">account_balance_wallet</span>
</div>
<div>
<p class="text-caption font-medium uppercase tracking-wider text-on-surface-variant">Pendapatan Bersih</p>
<p class="text-headline-md font-bold text-on-surface">Rp 3.450.000</p>
</div>
</div>
</div>
<!-- Active Listings Section -->
<section class="mb-xl">
<div class="flex items-center justify-between mb-md">
<h2 class="text-headline-md font-bold text-on-surface">Iklan Aktif</h2>
<button class="flex items-center gap-xs text-label-md text-primary font-semibold hover:bg-primary/5 px-sm py-xs rounded-lg transition-colors">
<span class="material-symbols-outlined text-[18px]">filter_list</span> Filter
            </button>
</div>
<div class="space-y-sm">
<!-- Item 1 -->
<div class="minimal-card rounded-xl overflow-hidden p-sm md:p-md flex flex-col md:flex-row gap-lg items-center group transition-shadow hover:shadow-md">
<div class="w-full md:w-32 h-32 rounded-lg bg-surface-container-low overflow-hidden flex-shrink-0">
<img class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" data-alt="A high-quality studio photograph of a sleek silver laptop on a clean white desk" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7rd4AsD10h_v5CwNZoq0_r1vu8D0zevO2BjEwFn7r0BegmFcDO2F9J1W6NypKA0jGT45zmVfVwFZpHbsTB4uLoTOWmXHdCDV26c-lj0KyPPRrmtswDxjjheGayc4suDKaJYAqR2ga9Mr-o0qWMNIvQVaX2vbKuoczawsw0701V2E6OFyCd-zT3xXhl0kAqU-5zgCjSTICRNu8JlCykY8G84lG81KT6AwXr-qfaPrf1F-FzQF5jtsJgAZ2DtEop8Rw-S3_86UJCyY"/>
</div>
<div class="flex-grow w-full md:w-auto px-xs">
<h3 class="text-body-lg font-bold text-on-surface">MacBook Air M1 2020 - Mulus Fullset</h3>
<p class="text-headline-md text-primary font-bold mt-1">Rp 9.500.000</p>
<div class="flex gap-lg mt-md">
<span class="text-caption text-on-surface-variant flex items-center gap-xs">
<span class="material-symbols-outlined text-[16px]">inventory</span> 1 Stok
                        </span>
<span class="text-caption text-on-surface-variant flex items-center gap-xs">
<span class="material-symbols-outlined text-[16px]">visibility</span> 124 Dilihat
                        </span>
</div>
</div>
<div class="flex flex-wrap gap-xs w-full md:w-auto mt-md md:mt-0">
<button class="flex-1 md:flex-none px-md py-sm bg-white hover:bg-surface-container-low text-on-surface font-label-md rounded-lg transition-colors border border-outline">Edit</button>
<button class="flex-1 md:flex-none px-md py-sm bg-secondary text-on-secondary font-label-md rounded-lg transition-all flex items-center justify-center gap-xs hover:bg-secondary/90">
<span class="material-symbols-outlined text-[18px]">check_circle</span> Terjual
                    </button>
<div class="hidden md:block w-px h-8 bg-outline mx-xs"></div>
<button class="flex-1 md:flex-none px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:shadow-md transition-all flex items-center justify-center gap-xs">
<span class="material-symbols-outlined text-[18px]">bolt</span> Sundul
                    </button>
<button class="flex-1 md:flex-none px-md py-sm border-2 border-primary text-primary font-label-md rounded-lg hover:bg-primary/5 transition-all flex items-center justify-center gap-xs">
<span class="material-symbols-outlined text-[18px]">auto_awesome</span> Fitur
                    </button>
</div>
</div>
<!-- Item 2 -->
<div class="minimal-card rounded-xl overflow-hidden p-sm md:p-md flex flex-col md:flex-row gap-lg items-center group transition-shadow hover:shadow-md">
<div class="w-full md:w-32 h-32 rounded-lg bg-surface-container-low overflow-hidden flex-shrink-0">
<img class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" data-alt="A stack of academic textbooks neatly arranged on a wooden library table" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXysithTHhPLPV7Wna7AkyCfQgdUwG5WcTmyNNphP-PpiGJQakoM3WBJfm1lXAbcK4xW7jwvylhCNi0IA9tzotzTiyuHVYafFflwa9CdBtfF-k6LCMgPlnv9AM4GFIgaRO0mCXW6VouRjcqW3IaJl-0VXZ8rLjT_DxzJu4UVfmBt6PKmRNAfj9mGxTERTK280DWv0wp0Hsyitvt0FIH0q48x3IvWy5YEUTZhwNEZHBTgCLtZEZFjhBKTI3APvef0d0HSWNrkOK8eY"/>
</div>
<div class="flex-grow w-full md:w-auto px-xs">
<h3 class="text-body-lg font-bold text-on-surface">Kalkulus Edisi 9 - Purcell (Bekas Pakai)</h3>
<p class="text-headline-md text-primary font-bold mt-1">Rp 150.000</p>
<div class="flex gap-lg mt-md">
<span class="text-caption text-on-surface-variant flex items-center gap-xs">
<span class="material-symbols-outlined text-[16px]">inventory</span> 3 Stok
                        </span>
<span class="text-caption text-on-surface-variant flex items-center gap-xs">
<span class="material-symbols-outlined text-[16px]">visibility</span> 45 Dilihat
                        </span>
</div>
</div>
<div class="flex flex-wrap gap-xs w-full md:w-auto mt-md md:mt-0">
<button class="flex-1 md:flex-none px-md py-sm bg-white hover:bg-surface-container-low text-on-surface font-label-md rounded-lg transition-colors border border-outline">Edit</button>
<button class="flex-1 md:flex-none px-md py-sm bg-secondary text-on-secondary font-label-md rounded-lg transition-all flex items-center justify-center gap-xs hover:bg-secondary/90">
<span class="material-symbols-outlined text-[18px]">check_circle</span> Terjual
                    </button>
<div class="hidden md:block w-px h-8 bg-outline mx-xs"></div>
<button class="flex-1 md:flex-none px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:shadow-md transition-all flex items-center justify-center gap-xs">
<span class="material-symbols-outlined text-[18px]">bolt</span> Sundul
                    </button>
</div>
</div>
</div>
</section>
<!-- Sold Items History -->
<section>
<h2 class="text-headline-md font-bold text-on-surface mb-md">Riwayat Terjual</h2>
<div class="minimal-card rounded-xl overflow-hidden">
<div class="overflow-x-auto">
<table class="w-full text-left border-collapse">
<thead>
<tr class="bg-surface-container-lowest border-b border-outline">
<th class="px-lg py-md text-caption font-bold text-on-surface-variant uppercase tracking-wider">Produk</th>
<th class="px-lg py-md text-caption font-bold text-on-surface-variant uppercase tracking-wider">Harga</th>
<th class="px-lg py-md text-caption font-bold text-on-surface-variant uppercase tracking-wider">Tgl Terjual</th>
<th class="px-lg py-md text-caption font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
</tr>
</thead>
<tbody class="divide-y divide-outline">
<tr class="hover:bg-background/50 transition-colors">
<td class="px-lg py-md text-body-md font-medium text-on-surface">Kemeja Polos Hitam XL</td>
<td class="px-lg py-md text-body-md text-on-surface">Rp 85.000</td>
<td class="px-lg py-md text-body-md text-on-surface-variant">12 Okt 2024</td>
<td class="px-lg py-md">
<span class="inline-flex items-center px-sm py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold uppercase tracking-tight">Selesai</span>
</td>
</tr>
<tr class="hover:bg-background/50 transition-colors">
<td class="px-lg py-md text-body-md font-medium text-on-surface">Modem WiFi Huawei E5577</td>
<td class="px-lg py-md text-body-md text-on-surface">Rp 350.000</td>
<td class="px-lg py-md text-body-md text-on-surface-variant">08 Okt 2024</td>
<td class="px-lg py-md">
<span class="inline-flex items-center px-sm py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold uppercase tracking-tight">Selesai</span>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</section>
</main>
<!-- Footer -->
<footer class="bg-white border-t border-outline w-full mt-auto">
<div class="grid grid-cols-1 md:grid-cols-3 gap-xl px-margin-mobile md:px-margin-desktop py-xl max-w-[1280px] mx-auto">
<div class="space-y-md">
<div class="flex items-center gap-sm">
<img alt="Logo" class="h-8 w-8 object-contain" src="data:image/png;base64,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"/>
<span class="text-headline-md font-bold text-on-surface">USU Polmed</span>
</div>
<p class="text-body-md text-on-surface-variant">Platform jual beli khusus mahasiswa USU dan Polmed. Aman, cepat, dan terpercaya.</p>
</div>
<div class="space-y-sm">
<h4 class="text-label-md font-bold text-on-surface uppercase tracking-widest">Navigasi</h4>
<ul class="space-y-xs">
<li><a class="text-body-md text-on-surface-variant hover:text-primary transition-all" href="#">Tentang Kami</a></li>
<li><a class="text-body-md text-on-surface-variant hover:text-primary transition-all" href="#">Hubungi Admin</a></li>
<li><a class="text-body-md text-on-surface-variant hover:text-primary transition-all" href="#">Grup WhatsApp</a></li>
</ul>
</div>
<div class="space-y-sm">
<h4 class="text-label-md font-bold text-on-surface uppercase tracking-widest">Legal</h4>
<ul class="space-y-xs">
<li><a class="text-body-md text-on-surface-variant hover:text-primary transition-all" href="#">Panduan Transaksi</a></li>
<li><a class="text-body-md text-on-surface-variant hover:text-primary transition-all" href="#">Syarat &amp; Ketentuan</a></li>
</ul>
<div class="pt-lg text-caption text-on-surface-variant">
                © 2024 Jual Beli USU Polmed. Komunitas Mahasiswa Terpercaya.
            </div>
</div>
</div>
</footer>
<!-- Floating Action Button for Mobile -->
<button class="md:hidden fixed bottom-6 right-6 w-16 h-16 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-90 z-50">
<span class="material-symbols-outlined text-[32px]">add</span>
</button>
</body></html>

<!-- Jual Barang Baru - Minimalist UI -->
<!DOCTYPE html>

<html lang="id"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Jual Barang - Jual Beli USU Polmed</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "surface-container": "#e5eeff",
                        "inverse-on-surface": "#eaf1ff",
                        "tertiary-container": "#8f4200",
                        "background": "#f8f9ff",
                        "on-secondary-fixed": "#002109",
                        "secondary-container": "#5dfd8a",
                        "on-primary": "#ffffff",
                        "tertiary-fixed-dim": "#ffb68b",
                        "on-error-container": "#93000a",
                        "inverse-primary": "#d3bbff",
                        "surface-tint": "#7331df",
                        "error-container": "#ffdad6",
                        "secondary-fixed-dim": "#3de273",
                        "on-surface-variant": "#4a4455",
                        "secondary-fixed": "#66ff8e",
                        "primary-fixed": "#ebddff",
                        "on-surface": "#0b1c30",
                        "on-primary-fixed": "#250059",
                        "surface-container-high": "#dce9ff",
                        "outline-variant": "#ccc3d7",
                        "on-tertiary": "#ffffff",
                        "on-primary-container": "#dac5ff",
                        "error": "#ba1a1a",
                        "surface": "#f8f9ff",
                        "on-background": "#0b1c30",
                        "inverse-surface": "#213145",
                        "surface-bright": "#f8f9ff",
                        "on-secondary-fixed-variant": "#005322",
                        "on-tertiary-container": "#ffc19e",
                        "surface-container-low": "#eff4ff",
                        "tertiary-fixed": "#ffdbc8",
                        "surface-variant": "#d3e4fe",
                        "surface-container-highest": "#d3e4fe",
                        "on-primary-fixed-variant": "#5b00c5",
                        "on-secondary": "#ffffff",
                        "tertiary": "#6b3000",
                        "on-tertiary-fixed": "#321300",
                        "primary": "#5300b7",
                        "surface-container-lowest": "#ffffff",
                        "primary-fixed-dim": "#d3bbff",
                        "on-secondary-container": "#007232",
                        "outline": "#7b7486",
                        "surface-dim": "#cbdbf5",
                        "secondary": "#006d2f",
                        "on-error": "#ffffff",
                        "primary-container": "#6d28d9",
                        "on-tertiary-fixed-variant": "#743400"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "gutter": "24px",
                        "base": "4px",
                        "max-width": "1280px",
                        "md": "1.5rem",
                        "xl": "4rem",
                        "sm": "1rem",
                        "margin-mobile": "16px",
                        "xs": "0.5rem",
                        "lg": "2.5rem",
                        "margin-desktop": "48px"
                    },
                    "fontFamily": {
                        "body-lg": ["Inter"],
                        "body-md": ["Inter"],
                        "label-md": ["Inter"],
                        "display-lg": ["Inter"],
                        "headline-lg": ["Inter"],
                        "headline-lg-mobile": ["Inter"],
                        "headline-md": ["Inter"],
                        "caption": ["Inter"]
                    },
                    "fontSize": {
                        "body-lg": ["18px", {"lineHeight": "1.6", "letterSpacing": "0", "fontWeight": "400"}],
                        "body-md": ["16px", {"lineHeight": "1.5", "letterSpacing": "0", "fontWeight": "400"}],
                        "label-md": ["14px", {"lineHeight": "1.2", "letterSpacing": "0.04em", "fontWeight": "500"}],
                        "display-lg": ["48px", {"lineHeight": "1.1", "letterSpacing": "0.02em", "fontWeight": "700"}],
                        "headline-lg": ["32px", {"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "600"}],
                        "headline-lg-mobile": ["24px", {"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "600"}],
                        "headline-md": ["20px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "600"}],
                        "caption": ["12px", {"lineHeight": "1.4", "letterSpacing": "0", "fontWeight": "400"}]
                    }
                },
            },
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        body { font-family: 'Inter', sans-serif; }
        .glass-panel {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(8px);
        }
        input:focus, select:focus, textarea:focus {
            outline: none !important;
            border-color: #6d28d9 !important;
            box-shadow: 0 0 0 4px rgba(109, 40, 217, 0.1) !important;
        }
    </style>
</head>
<body class="bg-background text-on-background min-h-screen flex flex-col">
<!-- TopNavBar -->
<header class="bg-surface dark:bg-surface-container-high fixed top-0 w-full z-50 border-b border-outline-variant/30">
<div class="flex items-center justify-between px-margin-mobile md:px-margin-desktop h-16 w-full max-w-max-width mx-auto">
<div class="flex items-center gap-md">
<a class="flex items-center gap-sm" href="/">
<img alt="Logo" class="h-8 w-8 object-contain" src="data:image/png;base64,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"/>
<span class="text-headline-md font-bold text-primary dark:text-inverse-primary hidden sm:inline">Jual Beli USU Polmed</span>
</a>
</div>
<div class="flex items-center gap-md">
<nav class="hidden md:flex items-center gap-lg mr-md">
<a class="text-on-surface-variant hover:text-primary transition-colors text-label-md font-medium" href="#">Kategori</a>
</nav>
<div class="flex items-center gap-sm">
<button class="transition-all duration-200 text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full">
<span class="material-symbols-outlined">notifications</span>
</button>
<button class="transition-all duration-200 text-on-surface-variant hover:bg-surface-container-low p-2 rounded-full">
<span class="material-symbols-outlined">person</span>
</button>
<button class="transition-all duration-200 bg-primary text-white px-md py-2 rounded-full text-label-md font-semibold flex items-center gap-xs ml-2 hover:bg-primary-container shadow-sm">
<span class="material-symbols-outlined" style="font-size: 20px;">add</span>
                    Jual
                </button>
</div>
</div>
</div>
</header>
<!-- Main Content -->
<main class="flex-grow pt-24 pb-xl px-margin-mobile md:px-margin-desktop">
<div class="max-w-[1100px] mx-auto">
<!-- Header Section -->
<div class="mb-lg">
<h1 class="text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface">Pasang Iklan Baru</h1>
<p class="text-body-md text-on-surface-variant mt-1">Buat listing barang kamu dengan mudah dan cepat.</p>
</div>
<div class="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
<!-- Left: Form Fields -->
<div class="lg:col-span-8 space-y-lg">
<section class="bg-white rounded-2xl border border-outline-variant/40 p-lg md:p-xl shadow-sm">
<div class="flex items-center gap-sm mb-lg">
<div class="bg-primary-fixed p-2 rounded-lg">
<span class="material-symbols-outlined text-primary" style="font-size: 24px;">inventory_2</span>
</div>
<h2 class="text-headline-md font-semibold">Informasi Produk</h2>
</div>
<div class="space-y-lg">
<!-- Image Upload Area -->
<div class="space-y-sm">
<label class="text-label-md font-semibold text-on-surface">Foto Produk (Maks. 5)</label>
<div class="border-2 border-dashed border-outline-variant/60 rounded-2xl p-lg flex flex-col items-center justify-center bg-surface-container-lowest hover:bg-surface-container-low transition-all cursor-pointer group min-h-[200px]" id="dropzone">
<div class="bg-surface-container p-4 rounded-full mb-md group-hover:scale-110 transition-transform">
<span class="material-symbols-outlined text-primary" style="font-size: 32px;">add_a_photo</span>
</div>
<p class="text-body-md font-medium text-on-surface">Klik atau seret foto ke sini</p>
<p class="text-caption text-on-surface-variant mt-1">Format: JPG, PNG, WEBP (Max 2MB)</p>
</div>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-lg">
<!-- Type Selection -->
<div class="space-y-sm">
<label class="text-label-md font-semibold text-on-surface">Tipe Iklan</label>
<div class="grid grid-cols-2 gap-sm">
<button class="flex items-center justify-center gap-xs py-3 px-md rounded-xl border-2 border-primary bg-primary/5 text-primary font-bold text-label-md transition-all" id="type-barang" type="button">
<span class="material-symbols-outlined" style="font-size: 20px; font-variation-settings: 'FILL' 1;">package_2</span>
                                        Barang
                                    </button>
<button class="flex items-center justify-center gap-xs py-3 px-md rounded-xl border border-outline-variant text-on-surface-variant hover:border-outline transition-all text-label-md" id="type-poster" type="button">
<span class="material-symbols-outlined" style="font-size: 20px;">description</span>
                                        Poster
                                    </button>
</div>
</div>
<!-- Category Dropdown -->
<div class="space-y-sm">
<label class="text-label-md font-semibold text-on-surface" for="category">Kategori</label>
<div class="relative">
<select class="w-full h-[52px] bg-white border border-outline-variant rounded-xl px-md text-body-md appearance-none focus:border-primary transition-all" id="category">
<option disabled="" selected="" value="">Pilih Kategori</option>
<option>Elektronik &amp; Gadget</option>
<option>Buku &amp; Alat Tulis</option>
<option>Fashion Mahasiswa</option>
<option>Kebutuhan Kos</option>
<option>Lainnya</option>
</select>
<span class="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
</div>
</div>
</div>
<!-- Title Field -->
<div class="space-y-sm">
<label class="text-label-md font-semibold text-on-surface" for="title">Judul Iklan</label>
<input class="w-full h-[52px] border border-outline-variant rounded-xl px-md text-body-md transition-all placeholder:text-outline" id="title" placeholder="Contoh: Laptop ASUS ROG Zephyrus G14" type="text"/>
<p class="text-caption text-on-surface-variant flex items-center gap-1">
<span class="material-symbols-outlined" style="font-size: 14px;">info</span>
                                Gunakan merk dan tipe barang yang jelas agar mudah dicari.
                            </p>
</div>
<!-- Description Field -->
<div class="space-y-sm">
<label class="text-label-md font-semibold text-on-surface" for="desc">Deskripsi Detail</label>
<textarea class="w-full border border-outline-variant rounded-xl p-md text-body-md transition-all placeholder:text-outline" id="desc" placeholder="Jelaskan kondisi barang, kelengkapan, dan alasan jual..." rows="5"></textarea>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-lg">
<!-- Price Field -->
<div class="space-y-sm">
<label class="text-label-md font-semibold text-on-surface" for="price">Harga</label>
<div class="relative group">
<div class="absolute inset-y-0 left-0 pl-md flex items-center pointer-events-none">
<span class="text-on-surface-variant font-bold">Rp</span>
</div>
<input class="w-full h-[52px] border border-outline-variant rounded-xl pl-12 pr-md text-body-md font-semibold transition-all" id="price" placeholder="0" type="number"/>
</div>
</div>
<!-- Stock Field -->
<div class="space-y-sm">
<label class="text-label-md font-semibold text-on-surface" for="stock">Stok</label>
<input class="w-full h-[52px] border border-outline-variant rounded-xl px-md text-body-md transition-all" id="stock" min="1" type="number" value="1"/>
</div>
</div>
</div>
</section>
</div>
<!-- Right: Summary & Action -->
<div class="lg:col-span-4 space-y-lg lg:sticky lg:top-24">
<!-- Summary Card -->
<section class="bg-white rounded-2xl border border-outline-variant/40 shadow-md overflow-hidden">
<div class="bg-surface-container-low p-lg border-b border-outline-variant/30">
<h3 class="text-headline-md font-bold text-on-surface">Ringkasan Biaya</h3>
</div>
<div class="p-lg space-y-md">
<div class="flex justify-between items-center text-body-md">
<span class="text-on-surface-variant">Biaya Listing</span>
<span class="font-medium text-on-surface">Rp 2.000</span>
</div>
<div class="flex justify-between items-center text-body-md">
<span class="text-on-surface-variant">Biaya Layanan</span>
<div class="bg-secondary-container px-2 py-0.5 rounded text-on-secondary-container text-caption font-bold">GRATIS</div>
</div>
<div class="pt-md border-t border-dashed border-outline-variant">
<div class="flex justify-between items-end">
<span class="text-label-md font-bold text-on-surface uppercase tracking-wider">Total Bayar</span>
<span class="text-headline-md font-bold text-primary">Rp 2.000</span>
</div>
</div>
</div>
<!-- Payment Info -->
<div class="px-lg pb-md">
<div class="flex items-center gap-xs py-2 px-3 bg-surface-container-lowest rounded-lg border border-outline-variant/20 mb-lg">
<span class="material-symbols-outlined text-secondary" style="font-size: 18px;">verified_user</span>
<span class="text-caption text-on-surface-variant font-medium">Pembayaran Aman via Midtrans</span>
</div>
<button class="w-full bg-primary-container hover:bg-primary text-white py-lg rounded-2xl font-bold text-body-lg transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
<span>Pasang Sekarang</span>
<span class="material-symbols-outlined">rocket_launch</span>
</button>
<p class="text-[11px] text-center text-on-surface-variant mt-md leading-relaxed px-4">
                            Dengan memasang iklan, Anda setuju dengan <a class="text-primary font-semibold hover:underline" href="#">Syarat &amp; Ketentuan</a> komunitas.
                        </p>
</div>
</section>
<!-- Help Card -->
<div class="bg-secondary-container/20 border border-secondary/20 rounded-2xl p-lg flex items-start gap-md">
<div class="bg-secondary text-white p-2 rounded-full shrink-0">
<span class="material-symbols-outlined" style="font-size: 20px;">help</span>
</div>
<div>
<h4 class="text-label-md font-bold text-secondary">Butuh bantuan?</h4>
<p class="text-caption text-on-surface-variant mt-1 leading-relaxed">Hubungi admin jika ada kendala listing atau pembayaran.</p>
<a class="text-label-md font-bold text-secondary mt-2 flex items-center gap-1 hover:underline group" href="#">
                            Chat WhatsApp Admin
                            <span class="material-symbols-outlined group-hover:translate-x-1 transition-transform" style="font-size: 16px;">arrow_forward</span>
</a>
</div>
</div>
</div>
</div>
</div>
</main>
<!-- Footer -->
<footer class="bg-white border-t border-outline-variant/30 w-full mt-auto">
<div class="grid grid-cols-1 md:grid-cols-3 gap-lg px-margin-mobile md:px-margin-desktop py-xl max-w-max-width mx-auto">
<div class="space-y-md">
<div class="flex items-center gap-sm">
<img alt="Logo Footer" class="h-8 w-8" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQCAYAAACAvzbMAAAQAElEQVR4AeydCXxU1dn/nzOTjYSwrwIatiSgUMW9LoD+bRG1taitWpdaFRUJ2telLuhrW7EubVUCaFtbl9JW22o3FWvtq2zaiitayIQt7BBZwpJAksnc/3luMiEhM5OZe8/df/OZM3c75zzP+Z4z53fvOXfuhAivdgS+N3hjl+nFkVIZzpVhWllxZFZZScW86aWR38vlgrLSyHtyWSGX22TQECJgUAoGHv8ebGv5TvN3e0HLd30ef/e5D5CB+4LSdh0FNnQCgRWQ7xStyysrXfWV6SWVP5SN/3cyvCfDtmjXujoRopUyvC7DXArRPSTETYLoUrmcJKmdIpclctlfBrxBAAS8T6B/y3eav9uTWr7rN/F3n/sAGbgvWCn7B3myVLGlrKRiqQzz5fYPymQfwn2J9xEYK0FgBOQS0sLyjOKkm0sjd5eVRN7qmtuwmyj2DyG0+yS6y2Q4RYb+MuANAvYQgBUPEhADpdh8WYZvS+fv5z6E+xLuU7hvmVYcOZH7GnksEG9fC8i0kZWjppdWlsnK/Uv/ksqd8oziP7LAD5Ggs4WgvEDUMAoJAiBgKQG9L5F9Cvct4RC9z33N9JLIn8tKI9O5D7LUuMOZyzI77IFi83IOo9f0kopry0or/hEOx5YL0mZLwfi6rOTuik0hOxAAARDoQID7GhkulAfKuQ/ivqispOK7U4et8V0f5GEBkdXT8uaKiYtGtGvtdiHEM0TiKzJkEV4gAAIg4BgBIfsg2RcJ8avcnMbqstLIqzOKI1dyn+WYSwoNe1pAbh619igpHE/lZEe3QTQUtgpkBQIgYAEBkSMzPU8L0QvcZ00vicydXlIxVO7z7NuTAlI2YtVoqeS/E7HGNVI4bhSYz/BsA4Tj3iQAr80R4D5LhmlEYpUc3po/vXTlGPLgy1MCIoXjlOklkdcoK/ZfyfoyWQFhucQbBEAABDxJQO/DhPi2oNByeVL86rTiyOnkoZcnBGTa8NVDykoiL0nheE8Cn+whvnAVBEAABNIlcF44RIu5r+M+L91ETsZztYDIK45cqcr3hLKjFSTom06CUmobmYEACIBAMgKyr+M+b3px5K4HSJOT8MkiOr/ftQIyo6RiIoX1oapZgkS+86jgAQiAAAjYQ4D7PBGiH+8srfxU7wvtMZuxFdcJCF+68SWcJsT/yauO4RmXCAlAAARAIDkBrx0ZzX0h94ncN7rNedcICIar3NY04A8IgIBrCLh0WMsVAnLj8NX9KKvpb7KyMFwlIeANAiAAAocTODSsFXnt1qJ1PQ4/7sS24wIyvaTitOzspuWk/3Kc8HI5AbgHAiDgNAHxlWhuw3LuO532xDEBuaT56bj3E4mFRISn4EoIeIMACIBAOgSEoCEk+87pJRX3cV9KDr0cERAeshpQUvkOhegHEgR+DOhQ5cMsCICAlwi095X7TiHED7kv5T61/VF7tmwXEDlZPjo7q+lDEuSpX1zaUx2wAgIgAAIZEpB9aVZW0wczRq0+JsOUpqPbKiA3j6w8UwvH3pXiMdi058gABEAABEBAJyDkkJYWa1o8rThyor7Dpg/bBGRGScWkUEh7Uxa0u01lgxkQaEsA6yDgbwKCeoRD2ttlIyvPs6ugtgjI9JLKa2IkXpVXHrl2FQx2QAAEQCB4BEQBhWN/mVEcuc6OslsuINNLKm4RQvu1vPLAZLkdNQobIAACAScgsrQQ/bKsNHKb1SDSFhAjjpSVVD4uhHjCSFqkAQEQAAEQMEXgJ9NLKh4zlUMniS0TEH6SJAnt1k7s4zAIgAAIgIBFBOQJ/O16X2xR/pYIyM3FkUv5SZIW+YxsQSBgBFBcEDBOgPvispKKbxvPIXlK5QLCdwCEQtpvkpvEERAAARAAAVsJCHqurHTVBaptKhUQ6eB4LaT9iUi4+k9QCC8QAAEQCBQBObGuxf6g+nciygSEf2FOWtPfhaA8l9UL3AEBEACBwBPgvlmODi24ecSqo1XBUCIgU4et6a5lNb1OQhSqcgz5gAAIgAAIqCUgSPQOZTW9yn22ipyVCEhuduNvpGNHqXAIeYAACPiIAIriQgKiKDc7+rwKx0JmM9FvERNC+eSMWb+QHgRAAARAIAkBQV8vK6kw/TMLUwJSVrpqvBxXm5XERewGARAAARBwKQFN0KPTS1dNMOOeYQFpfv587CUSZDgPwqsTAjgMAiAAAtYQkNMO2YJiLzb35cZsGOz8NZGVHX1JmsQ/CUoIeIMACICARwn0z86Kvkgkr0cMFMCQgJSVrPqxVC9Tlz4GfEUSEAABELCNQGAMCTFxemnl/xopb8YCcnPpmmIiPOPKCGykAQEQAAE3EhAa3XVLSUVJpr5lLCBCa5wt5z3wvx6ZkkZ8EAABEHArAUG5TURPZupeKJME04sjFwohvppJGsQNKAEUGwRAwFMEuG/nPj4Tp9MWkGmjq7uSoNmZZI64IAACIAACHiIg+/hLRn+ek67HaQtIuKlmphA0JN2MEQ8EQAAEQMARAoaNch/fP5Z9T7oZpCUgmDhPFyfigQAIgIC3CWQyoZ6WgAgt+kM5fIWJc2+3C3gPAiAAAp0TEDyhLn7QeUSiUGeRZgxbM1II7aLO4uE4CPiFAMoBAkEnwH3+9JKKIzrj0KmAaNmNtxH+IIrwAgEQAIHgEND/FPDOzsqbUkBuHVU1kEhcRXiBAAiAAAgEioAgMfXWonU9UhU6pYA0xRpukXMfXVJl0OEYdoAACIAACHifgKAu0byGlI98Tyog3ylal6eJ2FTvU0AJQAAEQAAEjBHQZrAWJEubVEAKc+tvlJcwPZMlxH4QAAHXEYBDIKCUAGsAa0GyTBMKyCWkhTWiO5Ilwn4QAAEQAIFgENBI3M6akKi0CQVkYEnkHCFEp7dwJcoQ+0AABEAABPxDQAga1L909RmJSpRQQGJCXJoost/3oXwgAAIgAAKJCMS+k2hvBwGZesSWfEHaxYkiYx8IgAAIgEDwCAhNm6I/UPewoncQkNxu+79JJAoILxAAARCwjQAMuZqAEIUiuvv8w33sICCaFsPw1eGUsA0CIAACAScQEtRBG9oJyNTiSB8SdFbAOaH4IAACIAAChxHQhDb5xuGr+7Xd3U5AcoV2hSCR3TYC1j1BAE6CAAiAgKUEWBuysmJT2hppJyDy6uPCtgexDgIgAAIgAAJxAoK0SfF1XrYKSNmIVbmaJk7mnQggAAIgAAJpEghQNDmMdTqRJuJFbhUQLYtOFYLy4gewBAEQAAEQAIG2BASJ3tNGrvpSfF+rgBDFJsR3YgkCIAACIAACiQiEQ4e0olVA5NgWBCQRLeyzmACyBwEQ8BYB0aoVuoBg/sNb1QdvQQAEQMApAm3nQXQBwfyHU1UBuyAAAiDgHAEjlkWbeRBdQDD/YQQj0oAACIBAMAnE50FaBISKCC8QAAEQAAEQSIOAJsSxHE0XEDmBDgFhGgggkAkBxAWBgBKIa4YuIESilPACARAAARAAgbQINGtG6NaidT1k/P4y4A0CIAACIAAC6RDoz9oRasqKOnT1kY6PiAMCIAACIOBGAg3ZjUUhytIgIIQXCIAACIBAJgSE0EpDGmmYQM+EGuKCgA8IoAggYJaACFFpSGjaALMZIT0IgAAIgECwCLB2yCsQwZPowSo5SgsCIAACIGCKgEaiR4hIg4BQhi9EBwEQAIHAE9CkgAhcgQS+HQAACIAACGRKQGoHz4HgCiRTcIgPAiDgFAHYdQsBjfJCGv6F0C3VAT9AAARAwDMEBGl5IUECf2PrmSqDoyAAAiDgEgI8hEUaYQiLgvNCSUEABEBACQGpHSESlKskM2QCAiAAAiAQHAJSO0LBKS1KCgIgAAJOEvCfbQiI/+oUJQIBEAABWwhAQGzBDCMgAAIg4D8CEBD/1alfS4RygQAIuIwABMRlFQJ3QAAEQMArBCAgXqkp+AkCIAACThFIYhcCkgQMdoMACIAACKQmAAFJzQdHQQAEQAAEkhCAgCQBg90goI4AcgIBfxKAgPizXlEqEAABELCcAATEcsQwAAIgAAL+JOAFAfEneZQKBEAABDxOAALi8QqE+yAAAiDgFAEIiFPkYRcEvEAAPoJACgIQkBRwcAgEQAAEQCA5AQhIcjY4AgIgAAIgkIIABCQFHPOHkAMIgAAI+JcABMS/dYuSgQAIgIClBCAgluJF5iAAAk4RgF3rCUBArGcMCyAAAiDgSwIQEF9WKwoFAiAAAtYTgIBYz9ibFuA1CIAACHRCAALSCSAcBgEQAAEQSEwAApKYC/aCAAiAgFMEPGMXAuKZqoKjIAACIOAuAhAQd9UHvAEBEAABzxCAgHimquBougQQDwRAwB4CEBB7OMMKCIAACPiOAATEd1WKAoEACICAPQQ6Cog9dmEFBEAABEDA4wQgIB6vQLgPAiAAAk4RgIA4RR52QaAjAewBAU8RgIB4qrrgLAiAAAi4hwAExD11AU9AAARAwFMEfCUgniIPZ0EABEDA4wQgIB6vQLgPAiAAAk4RgIA4RR52QcBXBFCYIBKAgASx1lFmEAABEFBAAAKiACKyAAEQAIEgEoCAuKPW4QUIgAAIeI4ABMRzVQaHQQAEQMAdBCAg7qgHeAECIOAUAdg1TAACYhgdEoIACIBAsAlAQIJd/yg9CIAACBgmAAExjA4JmwngEwRAIKgEICBBrXmUGwRAAARMEoCAmASI5CAAAiDgFAGn7UJAnK4BhfbzCkJ06sXdaepTg2jmgqH02IcjafbKYgQwcKwNcBuc+XqR3iZPmdKNcvKFwhaPrJwmAAFxugYU2C/sHaYpd/WlWUuG02U/6k/HTCigfkXZlIsvK+HlLAFug/2G5uht8vJZA+ihJSPowjv7UteeYWcdg3UlBCAgSjA6l8nR4wvo/jeH0oSre1J2nnDOES9ahs+2E8jpIuisa3rKNltEpafl224fBtUSgICo5WlrbvxFvOHpQfJKA9VoK3gYM00gr2uYpj0zmMZf0cN0XsjAOQLoeZxjb8ryCRcU6kMBpjJBYhBwmMBF9/aj488rdNgLmDdKwISAGDWJdGYJDBiRQ1c9OtBsNkgPAq4gcPVPBupzdq5wBk5kRAACkhEud0Q+r6yPOxyBFyCgiMBktGlFJO3NBgJiL2/T1gp7h2nsOQWm80EG3ibgN++PO7cr5XdHd+S1ekWNeazGxk0uJCFwt5XHqg3udkJACEHjJnfrJBYOu40ABMRtNdKJP8dNKuwkBg6DgDcJoG17r96CKSDeq6dWjweX5rWuYwUE/ERgcGmun4oTiLJAQDxWzXgUhMcqDO6mTSC7C4Zm04blkogQEJdURLpuNBzQ0o2KeCDgRgJJfWpqTHoIB1xKAALi0opJ5tb+XdFkh7AfBDxNYG812rbXKhAC4rEa2xyp95jHcBcE0iOAtp0eJzfFgoC4qTbS8CXybl0asRAFBLxHIPJerfecDrjHEBCPNYCKpfiSeazK4G6aBCLv4eQoTVSujfe6rAAAEABJREFUiQYBcU1VpOdIdVUj4YuWHivE8g6BlUtqaccGt8+ie4enXZ5CQOwirdDOi/dvp2hDTGGOyAoEnCPQcDBGv5u53TkHYNkwAQiIYXTOJdy5qZF+ew++cM7VACyrJPDCHdtoz3bcgaWSqV15QUDsIq3Yzoev7aNXHv5Cca6WZofMQaADgZdnVdPyt/Z32I8d3iAAAfFGPSX08p3nd9PTN2yi+loMZyUEhJ2uJXBwfxPNu24TLZxf41of4VjnBCAgnTNydYwVi+po1vlVxJOQrnYUzoFACwFuqw9dsJ4qluKuqxYk1i8ssgABsQisndnWbIvSU9dvptlXbaQ35u6klYtrqbqqkerr8NgTO+sBtjoS4DZYva5Bb5MLZNvkNsptldtsx9jY4zUCEBCv1VgKf1cvO0Cvz9lJT03dTA+eu47uOH4VzRhViQAGjrUBboMPTq7S2+QC2Ta5jaZowjjkMQIQEI9VGNx1ggBsggAIJCIAAUlEBftAAARAAAQ6JQAB6RQRIoAACIAACCQiYIeAJLKLfSAAAiAAAh4nAAHxeAXCfRAAARBwigAExCnysAsCdhCADRCwkAAExEK4yBoEQAAE/EwAAuLn2kXZQAAEQMBCAhCQlHBxEARAAARAIBkBCEgyMtgPAiAAAiCQkgAEJCUeHAQBEHCKAOy6nwAExP11BA9BAARAwJUEICCurBY4BQIgAALuJwABcX8dGfMQqUAABEDAYgIQEIsBI3sQAAEQ8CsBCIhfaxblAgEQcIpAYOxCQAJT1SgoCIAACKglAAFRyxO5gQAIgEBgCEBAAlPV3ikoPAUBEPAGAQiIN+oJXoIACICA6whAQFxXJXAIBEAABJwikJldCEhmvBAbBEAABECghQAEpAUEFiAAAiAAApkRgIBkxguxQSAVARwDgUARgIAEqrpRWBAAARBQRwACoo4lcgIBEACBQBFwlYAEijwKCwIgAAIeJwAB8XgFwn0QAAEQcIoABMQp8rALAq4iAGdAIHMCEJDMmSEFCIAACICAJAABkRDwBgEQAAEQyJwABCRzZolSYB8IgAAIBI4ABCRwVY4CgwAIgIAaAhAQNRyRCwiAgFMEYNcxAhAQx9DDMAiAAAh4mwAExNv11877vIIQnXpxd5r61CCauWAoPfbhSJq9shgBDBxrA9wGZ75epLfJU6Z0o5x80a7NYsPbBCAg3q4/3fvC3mGacldfmrVkOF32o/50zIQC6leUTblpfVkJLxCwjAC3wX5Dc/Q2efmsAfTQkhF04Z19qWvPsGU2kbF9BCAg9rG2xNLR4wvo/jeH0oSre1J2nrDEBjIFAVUEcroIOuuanrLNFlHpafmqskU+DhGAgDgEXoVZ/iLe8PQgeaWBalTBE3nYRyCva5imPTOYxl/Rwz6jLrTkdZfQ83i0Bk+4oFAfCvCo+3AbBHQCF93bj44/r1Bfx4f3CEBAvFdnNGBEDl316EAPeg6XQaAjgat/MlCfs+t4BHvcTgAC4vYaSuDfeWV9EuwN4C4U2TcEJqNNe7IuISAeq7bC3mEae06Bx7yGuyCQmsBx53al/O7ojlJTct9R1Jj76iSlR+MmF5IQuNsqJSQc9BwBIQSNm9zNc34H2GG96BAQHYN3Po6bVOgdZ+EpCGRAAG07A1guiQoBcUlFpOvG4NK8dKMiHgh4isDg0lxP+QtniSAgHmsFeBSExyosibvY3ZFAdhfRcSf2uJoABMTV1dPRuYYDWsed2AMCPiDQ1OiDQgSsCBAQj1X4/l1Rj3kMd0EgPQJ7q9G20yPlnljeFBD38LPdk82RetttwiAI2EEAbdsOymptQEDU8rQ8t8i7dZbbgAEQcIJA5L1aJ8zCpgkCEBAT8JxIWrEUXzInuMNmKwHLViLv4eTIMrgWZQwBsQisVdlWVzUSvmhW0UW+ThFYuaSWdmzALLpT/I3ahYAYJedguhfv307RhpiDHsA0CKgj0HAwRr+buV1dhsjJNgIQENtQNxtS8blzUyP99h584VSwRB7OE3jhjm20ZzvuwHK+JjL3AAKSOTNXpPjwtX30ysNfuMIXOAECRgm8PKualr+132hypHOYAATE4QowY/6d53fT0zdsovpaDGeZ4Yi09hM4uL+J5l23iRbOr7HROEypJgABUU3U5vxWLKqjWedXEU9C2mwa5kDAEAFuqw9dsJ4qluKuK0MAXZQIAuKiyjDqSs22KD11/WaafdVGemPuTlq5uJaqqxqpvg6PPTHKFOnUEOA2WL2uQW+TC2Tb5DbKbZXbrBoLyMVJAhAQJ+krtr162QF6fc5OemrqZnrw3HV0x/GraMaoSlUB+YBlxm2A2+CDk6v0NrlAtk1uo22bvSbPcVqDPMDrJD/kbiL5ocn15qU82PLmXc37OIIejZM0B44jI8i3vs2bCNYRgIBYxxY5gwAIxAm09Oiyy+e+v7VzF4KoNRDp6/whd8sN+dYP8pJaX7yLZAQh+IN4lfTV5k25Q7Ruk3zppuVSf7MD+go+VBCAgKigiDxAAAQOEeBOWvbavNB38kpLDy/kDj3wh1y3462bjhtqsSvdaxay+H72Mb7uxqVLfYKAuLRi4BYIeImA3v/yBwfupGWvzQu9DK0r+pYrPqR7xG5x0B1qWdGFhcug78RHZwQgIJ0RwnEQAIGEBLiz5dN4Xur9L39wSBjbGzt1YZFl4DKxx/ocDK8gJCQAAUmIBTv9RQClUUWAO9bm0HKaLjtb7nRV5e+WfA6VSejzNVxmFku3+OcWPyAgbqkJ+AECbibAPajUDO5Ym4MgXrrZZRW+cRnjgYTMUTKQn3i3EICAtIDAAgRAoD0BXTNkh6kP4+i9aPvjgdxiEZEFb2bDcORGgN/pCEiA8aDoIBA8Atw58nCNEBrpusEfwcOQssSMRAg5vNUSS2fWsh6kBQQkSLWNsoJACgLcCXLQT7IPfaRIgUNSQ3QIjIvZsfDqOwLyAQEJSEWjmB4lYIPbzR2fplvSO0TuDfUtfKRNQDLT2ckETFJnKtf9/oaA+L2GUT4QSEGgtaOTvZ98p4iJQ2kRYCHhiHIZhKsRCAhXNgIIBJQAiwaHgBbfsmKzfpD+YZkJV2TscwFxBWM4AQKuIcBXHPHgGqf87ogc0+I72Tj4ragQEL/VKMoDAgkItIpG651VCSJhlzUE5JWIEEJekAj90cFcF9YYsj9XCIj9zGERBGwnIPsv0gPJTswm6zBzGAFGLwPXw2FHPLsJAfFs1cFxEOicgH62K4dQOo/pTIz9A3dS9bi1tO78D+i/3/0XLZv5Mr036/e09JHf0OInnqV35v2S/vXLp+ifz5fTG3/8qR54nffxMY7DcTnNsntfphUyD86L89x/xC5nCpWOVU2/GEknpqvjQEBcXT1wDgSME2Dx0M925Vmv8VzUpdwzbDut+9oy+uDuV2jhnF/qYrBk9nP00d1/psjVC2njuZ/Qzi9V0Z7iLbRvWDXVDtpFB/vupcYeddSU39DqCK/zPj7GcTgup9l5bBVtkHlwXpznkief1W2wLbbJtvcO3d6aj6Mrsk7kW3/OlqN+mDQOATEJ0LLkyBgETBLQxcNkHmaS7x+8k9ZP+pg+uv2v9Nazc+i9R+ZT5MpFtGPcOjrQf6+ZrDNKy7bYJtt+99H5ui/s0/pJn9D+QTszykt1ZKfryGx5ICBmCSI9CIBAK4G9Q76gyOWL9aGnJY8/Ryuv/T+qPnk1RbvWt8ZxeoV9YZ9WXvsvWvLEc/rVUOVlS2jfkV847Zrn7ENAPFdlcBgE3EWgrn8NrZ7yb1r8+LP07s9eoHXfeF8fenKXl8m9OSCvhtZO+Q8t/ekLtOSnz9Oab/yHavvtSZ4AR1oJQEBaUWAFBLxLQM7J2u78zqM3yPmMl2nRnF/R6suWUu1gF09ap0ln/5E7aNXlS2jx3Gdk2V6hXaM2pZlSXTQn6tKo9xAQo+SQDgRcRIAnZO1wRxMabTulUr9LatkDf5TzGVV2mHXEBs+bvP/Dl+jdh+fTtpNXEZfdDkfsqksVZYGAqKCIPNoRwIb/CDRlR2nD/1tOi2b/ij657e/6XVL+K2XiEu0dvp0+uf1vetmZQSyrKXHEAO6FgASw0lFkEMiEAJ99s3CsuOGfdGBAcOcGuOzMYGH5r2jbiaszQejbuBAQ31YtCuZXAvxMJf6Nh9Xlqx24m96/74/62Xd9n/1Wm/NM/vV99tEnd/6Vls38EzEjOxxPv77t8OaQDQjIIRZYAwFPEBBCkHxb5ms0t0G/FXfJT5+nXWM3WGbH6xnv/NJ6WvKz54hvAY7mNlpaHCvr24zjEBAz9JAWBHxGYNspEVpc/qx+K66WjbH+zqpXy4oR3wLMj1Thmws6i++34xAQv9UoymOGQGDTRvMa6OP/+ZucIH+V6ntiuCrThlDPw1q3/V1naPXVSKa+WRkfAmIlXeQNAh4gwL/AXvqT52n7qas84K27XWSG7z72guOPSLGLEgTELtKwAwJGCVj4y7JNEz+jdx/+ra3PpjKKwSvp6gbW0LuPzKctp6+0zGW3TKorFRDLaCFjEAgyAaG+8E05jfTpjNfo82lvEuY61PON5UZp+S2v0/Jp/yBmrdqCWybVISCqaxb5gYDLCTR0q6N/P/h72npGhcs99b57WyZ+Tv/54UvU0PWA9wuToAQQkARQsAsEvEcgPY/r+tfQuw/Pp31D8eTZ9IiZj8W/ZH/vx3KYsI99j7A373V6OUBA0uOEWCDgeQJ7i6qJO7KDffd5vixeKwD/ip2Fm+vAa76n8hcCkooOjoGAAwSsmDPfMWa9PmzVWHjQgRLBJBNo7H5ArwOuC95WGqxoNGk4CAFphuSLz7yCEJ16cXea+tQgmrlgKD324UiavbIYwQQDZjjz9SKd6SlTulFOvgUz2oe1PtUW+G6gD+59mXhi9zBT2LSZANcB1wX/YFOpadWNJk3nICBpgnJztMLeYZpyV1+atWQ4Xfaj/nTMhALqV5RNuTZ0duTzFzPsNzRHZ3r5rAH00JIRdOGdfalrz7AnSr7ltAr9biAKO3SK6glKNjsp6+KT216lLWessNmwenMQEPVMbc3x6PEFdP+bQ2nC1T0pO0/YajuIxnK6CDrrmp6SeRGVnpbvagQ7xlbR8rLXXe2j7lxAP5bf/AZ9cew6T5ceAuLh6uOO7IanB8krDVSj3dWY1zVM054ZTOOv6KHEtOrrg93Fm+mj7/+FcOWhpHqsyUReiXx8x1+pZsRWpfnb+SND9DxKq86+zE64oFAfSrHPIiwlInDRvf3o+PMKEx3KaJ/IKHbqyPsG76APZso5jxw8DDE1KeePxmQdcV3tG7JDmTN2/sgQAqKs2uzLaMCIHLrq0YEtBrFwmsDVPxmozzk57QfbP9B7Ly174A/U1MXax4uzLQQ1BKIF9bTs/j/SAYW/E9FsugyBgKhpA7bmcl5ZH1vtwVjnBCYbrBOV3/OmnEb64L4/UUN3f/7qufNa8B3lIY8AABAASURBVG6Mhh51xHdnxbKiSgohhMpr2uQuQUCSs3HlkcLeYRp7ToErfQuyU8ed25Xyu2f+dVL5PV8+43WqHbQ7yNVge9lVGqwdvIs+u+lNlVlanlfmLd5yl2AgFYFxkwtJCHvOLlL5gWPtCQghaNzkbu13drKl8upjwzmf0PaTV3diEYfdTmDrmStp49mfKXNTZRtL5BQEJBEVF+87blKhi70LtmuZ1o3UHCXA+P88Vn73bSV5IRPnCay49l/EdarCE1VtLJkvEJBkZFy6f3Bpnks9M+CWz5IMLs1Nu0SqbtttzK+nD+/6M2lZsbRtI6K7CWjZTXqd8r9EqvDUyqsQCIiKGrIxDzsepWFjcXxlKrtL+kOL6cdMjeiT2/5GB/FwxNSQPHiU6/TTW15T4rmVVyEQECVVZF8mDQdUnbva53NQLDWleeesqjPCDf9vOe0cuyEoeANXzi9OWEubJ3yupNwJbutVki8ERAlG+zLZv0vNbX72eRwcS3ur06sbFWeE/AdFlVcsCg7cgJa04sqF1Jhv/gnKQqi65m1fERCQ9jxcv7U5Uu96H4PqYDp1o+rqo+KqRcQ/QAsq66CUu7HbQYpcsVhJcVW1vbbOQEDa0vDAeuTdOg946X8XE5Uw8l5tot3t9qk4EdxdvIW2TFQztNHOOWy4ksCmc5bTnmHbTPumou0d7gQE5HAiLt+uWNp5J+XyIvjWvch7qcVdxTi0ForRZ9Pe8C1DFCwxgc+m/YO47hMfTX+v6qsQCEj67F0Rs7qqkTrrqFzhaMCcWLmklnZsSD2LLoT5ceh1531Idfi1ecBaF9H+o3bQ+kkfmy63gibYzgdnBKSdC9jIlMCL92+naAPu+8+Um1XxGw7G6Hczt6fOXsHNc/y7gDWXvJfaDo76lsBqWff8vDOzBVR5FQIBMVsbDqTfuamRfntPJx2WA34F1eQLd2yjPdvTuwPLDKP1536Mp+yaAejxtNGu9bRh0icKSqHgbKbFCwhICwivLT58bR+98vAXXnPbd/6+PKualr+1v/NymRy94jPPqvM/6NxO5zEQw8ME1n5tGcWyzP3PixAmG2MbfhCQNjC8tvrO87vp6Rs2UX0thrPsrruD+5to3nWbaOH8mk5Nqxgy2HjWZ8S3dHZqDBF8TaCx+wHaNFHBwxYVXYRAQDze3FYsqqNZ51cRT+J6vCiecZ9ZP3TBeqpYmvquq3iBzJ7wxUIxWjfl/Xh2WAacwLoLl5EmTCqAoosQCEiGjdGN0Wu2Remp6zfT7Ks20htzd9LKxbVUXdVI9XUmG5kbC2uzT8ywel2DznSBZMuMmTUzT8cVFVcfW85cQfU9cft2OryDEOdAv7205fQK80VV0D1AQMxXg2tyWL3sAL0+Zyc9NXUzPXjuOrrj+FU0Y1QlggkGzPDByVU60wWSLTPOpMJVnOipmTjNxGvEdTuBDV81f0uvRuYVBALi9pYC/7xNwKSC1PWrob3DccddcyPAZ5zAnpKtVDtgd3zT0FIIk41TWoWASAh4g4AlBMyf4NFmPLLEkqrxQ6ZbFQxjmW2iEBA/tCSUwbcENk38r2/LhoKZI8BzY+ZykKlNKggERDIMyBvFtJmA2THm3cWbqb53Gr8xsblcMOcOAnUDa6hmuLmHLJodxIKAuKMtwAsfEhDC3Ndzy5krfUgFRVJJYKvZNmKuiRIERGVtIi8QaCFg9vZdfvLq1tMU3KrZ4g8WDhOwyPzWL1cQtxWLsu80WwhIp4gQAQQyJ2DyxI52l2whfvZR5paRIkgEGnrUUc0Ic8NYZu7mhYAEqbWhrPYRMKkgu0Ztss/XgFn6Tu+z6ddFt9CHo5+gxaWP0JNDptLk7id4lsJuk23FzDw6BMSzzSZIjgevrLtHbQ5eoS0ucWGoCz1TNIPuGfhNOr3raOLt/lk96Nzux9MTQ66nv464jwZl97bYC/XZm20rZqbqICDq6xM5BpyA6fkPoVFNCQREZTMqCOXS/KG30Zldj06a7ai8wfTTIdcmPe7WA7tGbzTtmtGrEAiIafTIAATaEzA5ekV7h1ZTU5fU/27Y3iK2UhHIEVn0S3nlMarLkFTR9GPj8ofTt3qeoa975YPbyt4hJv/aIYWCpOIAAUlFB8dAwAABg9/FVku7SzH/0QrD5EqIBD195M10Qv6ItHOa0G1M2nHdEnH3aHNXrEZPekJuAQA/QAAEmgmYHdNuzgWfTODRwdfQ6YWjeTXtcGyXYWnHdUtE8ycdxk57ICBuaQHwwz8E2p7OGSjV3iKTwxEGbPoxyQ+OuJy+1uPkjIt2UGvIOI3TCfYNNddmNHmlZqQMEBAj1JAGBFIQMKMf/KOwA333pMgdh9IhMKPfBXRZr/HpRO0QZ229yd9VdMjR+h11A3aTmUfnGL0TCwJifd3CQoAImL0Dq67PPqKwFiBi6ot6ac8zaXq/8w1n/IddSwyndSqhJttMfS9zz00z0nZdLiBOVQfsgoAzBA70r3HGsE+sntf9ROKhK6PFWbzvv/SPvR8ZTe5ouroBZttO5icuEBBHqxzG/UZAmCxQXX8MXxlFOKFwDP1k8HdJCGO1sK5+O9226VdGzTuerq6f2baTOTcIiOPVDgdA4BCBuv7m/mXuUE7m17yUw3FdhtGcITdSWBjr0rY31tCV635KNU21Xip2O1/NX4G0yy6tDWO008oakUAgeAS0zE/i2kE60H9vu21sdE6gNG8w/aroFsoJZXUeOUGM3dH9unhUR82ewSfI3MZddSaHP400XQiIjRUMUwEgkPkwcjsoDd29ewbcriA2bRTl9KPni75HXcN5hizubzpIV1c9TlUN1YbSuylRQ/c6U+5oBlJDQAxASysJIoGAAQJNuVEDqdyV5Os9TqbyI28kftItB1438nuMzko1MLsXzR92O/XM6tpZ1KTHp64vp4qD/vjlf1NuU9JypnXAwCUIBCQtsogEAukS0NKNmDBeU453BaRPVjd6fuj36DE5kf3VbscRP+mWA6/z5PazcpipX1b3hOXOdGfPcFd6Qdoyk98N6+fQB3WrMzXt2vixnEZzvhlouhAQc8iRGgQOI2DgNK5NDrFck51Am7zsXi0fcgOdWlCa1OxpXUfTS8O+T/2yeiSNk84BfrLuc0W30lFy+CpJ/JS7NU2j7218ht7e91nKeF472GTy5MNIy4WAeK2VwF9fEzDbCTgF55Kep9PxBZ0/sHBQTm96afid+tWJEV/5ybq/KCqjdJ6smyz/H219kV7bsyzZYc/ubzJ58mHgAoQgIJ5tLnDcnQSMfA0PlcRsJ3AoJ3vXJnUfl7ZB/tOmF4fdmfGVSIian6x7Yv7ItG0dHrG8+lWav+udw3f7Yjtm8grECISQkURI428CKJ1xAkIYGQg4ZM+rApLpE2z1K5EMRYTnUTJ9su4hskS/37WQyqv/3naXr9ajJq9AjLRcCIivmhAK4zQBObxuygXRFDaV3qnERh7kl4mI8ONJzu9xkuHivVrzPv3vlt8ZTu+JhCFzV7+ayDw9BMQTLQNOBoVA+GC2J4v6yYF1hvxOR0TMPFmXnVqybwXdvunXvOqBYNzFrAM5xhPLlMLAr2AhIBIc3iCgioCRYYC2tsP1WW03PbP+0q5Fhn1NJSJmn6z7Ud0aunHDXIpR5mfXhgvkUMLwQXMCYsRtCIgRakgDAkkImO2msurt7wSSFCWj3f/c+wkt3Pd5RmnaRk4kIud1N/dk3ZUHNtK1VU9Sg+bd39a0ZdTZuhNXrxCQzmoFx71EwHFfTc6hkxOdgCpo92x+gTY27jCcHYvI74ffod/iO7FwLD0+5DoSwtg13bqG7fSdqieoNlZv2B+vJcxyYPgTAuK1VgJ/fU0gXO/NORCulC+ie+jyNY/RpsadvGkoDMnuQ38acTfNPnKqofSciB+KePW6x2l3k7k/WOK8vBTMnnwYuXqGgHiphcBX9xMw8i1sUyqznUCbrBxZ3R6toUvXPEqbG4yLCD/+JFcYE1J+su4Va39C2xqD91h8820n88bbTkAcaXEwCgIg0EogZ09B67pXV6qliHxr7aOmRMRI2f30ZF0j5c+tMdt2Mh8uDBlxFGlAAASsIZC/Tc3DBq3xLv1c7RaRhlhUnzD3y5N10yd9KGb+dnPPGDuUU/prEJD0WSEmCFhIoDlrJzqBZsvqP1lELuUrERNzIul6Vbbxafr4wNp0o/syXv52+08+ICC+bEoolFcJ5G+z/yzSSlY8J/Itk3Miqfzz65N1U5U52bEu1fa3HQhIstrAfhAwREAzlCqeqEt1t/iqb5Z8JWLVnAg/nsSPT9Y1UvkFW80JSOYzIOSbp/Ea4Y00IKCegMHfLcQdyd2XT1m1ufFN3yytEBF+su6Lu43/At43cGVBsvflUdYBk+1GyIwyfOMKJENgiA4CnRIwdxFCXXw2jBXnpVJE/P5k3TizdJdmhz6NPgQUApJuDSEeCKRJwKR+ULf1fdK05JJoGbihQkQC8WTdDJhy1MKqfrwwHIxeOENADCNHQhCwhkDPlYOtydgluZoRkaA8WTfTqupZMSjTJO3jG7wEgYC0x4gtEHCcgOnOwPESdO6AEREJ0pN1OyfYPobZNqMZvASBgLSvBwe2YNJvBAzMRbZDULCtJ/GkaLudPtzIRESC9mTdTKo7Z3c+5Vd3zyRJh7jC4LgrBKQDSuwAAZMEzCqINN/r8yPlp//fzSLyCC3dvzJpYZfuX0HfXf9koJ6smxRGggO9/jskwd4MdxlssxCQDDkjOgikQ8DgkHJr1r1WmhzTbs3J/SvV0T10TdUT+r8G/mvfp7SraR/xDxD5P0b4nwSvqXqSdkb3WVIQP2Tas8LknJnBqw9mFyKN6nkFAQRAQCEBg2d0cQ96RIIjIPEy/63mP3TT+nl0ysrb6YyK79PNG54i3hc/jmViAj2dOtmQ2hEiQTWEFwiAgFICRseU4050W9uPcmry45tYgkBCArk7u1K3DX0THkt3p2b0ZEdqR0gj7WC6hhAPBNoRwEZyAka/lC05Cnlmd8Si0S1bWIBAYgIq2ohInHWne1k7QvJMCQLSKSpEAAEDBEyMLbO1I5aU8gIBBJISGLjYXBsxM1fH2hHShMAQVtLqwQEQcI5At3X9KX+ruQfkOec9LFtMgAo29qJuG/tabSZp/qwdchJdg4AkRYQDIGCcgGY8aWvKQQsxjNUKAyvtCByx6Oh220Y2hJFE8TSaVhMSJDCEFQeCJQgoJGDwx73tPDjiHfOdRLsMseEbAoMWjTJfFmEmC1ETkmdJEBDCK2gE7CqvmTFm9rHLzm7UPTKQVxFAoJVAj5WDKG9XYeu2kRX+My4j6VrTCDrIVyBVrTuwAgIgoJSAqRO8Fk+OeuPYljUsQKCZwJH/UNEmzLVOoYlt/DuQimaX8AkCIKCcgLnvqO7OwKWjyI//VKgXDh8ZE+AbKwa+W5JxusMTmB5iFVQRoqjIXEAO9wTbIAACSQnIYeKkx9LnEMHQAAAQAElEQVQ5IM/0aNgrp6QTFXECQGD4KycTtwkzRTXbJnXbUjtC4WgWBESngQ8QsIaAUPBtHfT20ZS7q8AaB5GrZwjkfVFIAxX8wFQoKDFrR+iJqqE1cqJvj4L8kAUIgEAiAvxtNSkioViIhv3lJM4dIcAEhv71JOK2YAaB6cnzZuPbWTtC+rocy9KX+AABELCEgEn90H0a/K8xlL2ni76Oj+ARyN6bR0NkGzBbckHCbBYyvaaPXDULCJG+IffiDQIgYAEBoeA7G27IppEvnm6Bd8jSCwRK5p9JoWjYvKsK2iJpzZrRLCCx5g3znrk/B3gIAk4RUDF0cORbY6nbmv5OFQF2HSLQIzKQBr89xiHrCc3qFx26gMQ08UbCKNgJAiCgjIAQKk79iMbM+ypRk5q8lBUOGVlHQNb1mHmTrMvfQM5NsdA7nCzEH/NWjfyUSNvF6wggAALWEdAUTIYUbuhLRy04zjonLcsZGRshUPTa8VSwpZeRpO3TKGh7eoYa1cxbVfwJr+sCQiQ00sRiwgsEQMBSAoouQmjkS6dRzm784ZSlleWCzPkPo0a+9GU1nqi7aF0Yd6hFQHhT0y9JeA0BBEDAQgIKLkOyDubQqF+fZaGTyNoNBLiO+eYJs75oZjNol15r1YpWAYmPabWLhw03EYAvfiGg6DJk4L9LaMC7xX6hgnIcRqD/eyNpwPsjD9trbFPdxYecfouFOgoI5kGMVQxSgYARAiruyGK7Y+ZOwp9OMQifhYJNvWjsnHOVlErBBe8hP9rMf/DOEH80B8yDNHPAJwhYT0AINeeEPLwx7tELKdSg4PcB1hfbuxZs9DxUn0XjHrmQuG5VmFXU1OKutM5/8I42AkKkEW7nZSgIIGAHAVVnhl039abRz5xth8uwYQMBvvIo2NZTiSVVV7pxZw7XiHYCEo2GXtFIa4xHxhIEQMA6AirPDPlHZkfg72+tqyybch78z7E04N/q5rWEUHOly8VnbRBN4mVej4d2AvL0mhHVQhOvxw9iCQJqCCCXZAS0ZAcM7D/65+dQwcZeBlIiiRsIdF3fh0b/eqIbXEnoA2tD+eqRX7Q92E5A+EBMoxd5iQACIGA9AaHQRLgxi0546CLKqcHvQxRitSUrflT/CbMuolA0S409lWcmLR7JIdfnWlZbFx0ERMvq+Spp2r7WGFgBARDwDIEuO7rRiT+8hMIHsj3jc9AdzarNpZMe+Cbl7e6qDkWbMxMVmcrhq/19KotfPTyvDgIyb0W//ZoQrxweEdsgAAIWElB4xli4sY9+JYI7syysL0VZcx2d+KOLqWCrwqFHhW3pUDHFyw+QiB7abl7rICAtuztcqjTvxycIgIAlBBSfMfasGETHPfZ1wkMXLaktJZmKJqHfrtt9zQAl+bVmorgtNecbSqgJoeaD7T/nVIzkXxpub78XWyAQQAIeLnLfT4bS2Lnueoqrh3GqdV1eJXzp8fOpz/IitflakJuc+1jbogkdck8oIHosTXtYX+IDBEDAswSOWDyaxsyRIhLzbBH857i88hg7ezIN+I+623WthCRIK0+Wf1IB2Vef+7RG2u5kCbEfBEDAGgKaPDtVmfOghUfrQyWiMawyW+RlgADPefDdVkcsGWUgdfIkqn8w2GpJoxrWgtbtw1aSCshzVUMPEonZZOqFxCAAApkSUPjbr1bT/T4aTif9AHdntQJxYCWrNodOvu9S6vPZUcqtC2HJxAdpgp5s1oLELicVEI6edTDnCdLoAK8jgAAIeJtAz8ggOmXmZZSzp4u3C+JB7/m/W06959vUfa3iCXMrWcirj4aGrMdTmUgpIE9UDa3RSPtFqgxwDARAwBoCZoeyEnlVuKEvnXr3t6lLdbdEh7HPAgJdtnWnL991BSn5V0EL/Euepfj5L9YO35P8OFFKAeGEWaG8R4i0Dvf/8jEEEAAB6whYNCpBXb7oTqd+/wrq87H77wCyjq49Off9cCh9+ftXUt6uQuUGLZv3YE/lyFNTffYTvJoqdCogT6ws2qqR+G2qTHAMBEDAWwRy9neh4x+aQiW/OZNEtNNuwFuFc4G3zLT0uYl0/MNTKLsu1xKPhBCW5NucqfbCvKqh25rXk3+m1XJijeH7Avd4k+TMcAQEfEFAkKChfztRn9jN3anwMRq+oGO8EHk7CumUey+notfGGc/EyZT8KKum8IPpuBBKJ9K8NSM2app4KJ24iAMCIOAtAj1WD6TTbr8KQ1oKqq33p0fRabddLSfL+yvIzZksuK8vXz1yUzrWQ+lE4jjbsxp/JpcrZMAbBEDAZwTiQ1rHzP0qZe/Lc7p0nrPPzMaUn0snPnixZUNWdkDRNKpo6evTMpe2gPxxxTENQtNuSytXRAIBEPAcAR7SGvzOMXT6LdfQoH8dI0etPVcE2x2WHS4N+edYOqPsWhq0aLTt9lUbDJH2Pe7r0803bQHhDGdHSt+QM///4HUEEAABZwhwp8XBKuu5+/JpzNNflXMj36KCjb2tMuP5fJkN/67m6F+cQzm1Fl61aSTFXH5YTUyjv3Ifn4mZjASEM47FQt8jjep5HcGdBOCVvwnwzTccrC5lr8hgOu2OK/U7tUIHs60255n8mUXpcxOJ5416Vh5hvd+CSAj5QRa+uE9vCk3P1ELGAjJvVfFKItHp/cGEFwiAgOcJhJrC+p1a46dfS0P/fBKFa625JdULoLjsw14+mSbcfJ1+h1UolnH36dpiaoIeTnfivG0hDBEoj4y8W16FvN82I6yDAAj4l0DungIq+d0ZNPGm62nkb8+gnAD9bS6XlX8vM/HG66n4xdMpZ29+ior24CFNe3tORfEPjHhuSECIhBYLZX9TikgN4QUCIOA4ASvnRNoWLutALg3/y0k0ftr1NPqXZ1PeF93aHvbVepft3Wj0z8+hCTdN1a/Csg7ac/VlV122VNb2xmjWpST7dDLwMiggRHNXDlsvC3qNAZtIAgIgoJiA1UPkh7sbbsyiI988lsbL4ZwTfnAJDX5rDGX54PZfvh138D/H0okPXEJnll1HR741lkLR8OHFt3TbzrrUKHTp02tGVBstkGEBYYNzKkv+omnak7yOAAIKCCALjxEQmqA+nx9Jx/z8KzTx+htp3I+/QQMXlVL4YI5nSsK+Dlw0isY99A2aIMtwzC/Ood7/PVKekwvPlMGIo9x3J/unwXTzMyUgbKQhUnKHHMrCfAjDQACBABMIywn3fh8Noy+Vn0dnX3MTnXTfpTTyxS9T709lZ9xg71l8qmoI1WdJn46iEb8/TfeRff1S+WTq9/Ew4jKkSuubYxot6xMpud1seUwLyC9INGI+xGw1ID0IWEDAhp8OJPM6FM2iXhWDaPjLp9KJD15CX/32rXTSzG/pE/C9Pykinl9Illb1frbFTx4unn8GnXzvpfSVK26RPl1MI145RfeRfVVtM+38nKgjjWpkn33JAyTaP2U9bacPRTQtIJwVz4eQCF0o50QO8jYCCICACwjwCIzsoORQhQucIeLflfAE/ImzLqLx06+nSZfcRqfP+A6Ne/hCKn1uIg1ZcKy8Miii7pVHUOG6vlSwuZc+SZ9dk0/hukNDYrzO+3gCn+MUru2np2FhOlLmUfrsBOKhNP5FPdtgWyc8dBEN++tJ1LNyELnhJftKOXAjPeE6kgu73tLuQe6r9T5bgVElAsJ+lFeMXChi4mIi/HcI80AAAVcQkB2UEPLDFc50dKLr1t7U78Ph+u8qjv712fLK4CI69d7L6LQ7r6Izbr2GJky7ns6+/iY65+oyXXBYEHid9/ExjnPa96/U07AwjZZ5FL1+PPFQWtctvToadMkerhL7a0WLch/NfbUqDMoEhB0qX1X8WiwmrpTSGuNtBBAIDgH3l1SefRIH93vqTw+ZPQdHSqdRjPtm7qNV2lcqIOzY3MqSF+VVyG28jgACIOAeAvpZr/2nve4B4LAnjvIXYlpz36wWgnIBYffKI6VPkCYe4XUEEAABFxLguREXuuU3l/iKg4OT5dJidHd5RfHPrfDBEgFhR8sjxXfJybuneT2NgCggAAJ2EpBXIoJFpCXYaToItnTRkGwlZuIrD8fKLE/k51SWPGyVfcsEhB2eEym9SS5N32ss88AbBEBANQHZu8U7N+7wOKg2EbT8mCEHiZaIPziQ/S/pgzx/124tlyfyVlq3VEDY8fKKkp+KGF0v50VM33PM+SGAAAioJSBkJxcXEj1neeasL/GRNgFGJjttYtHQWUqm5NBL+tEkKPTNOZFSy58SYrmAkHzNrix5hppCF0oRqZWbeIMACLiQgN7xSb/inaE8hZVbeKckoMOSMeSS+TmoG9IJ2cOSVhci7fzyyMg/6Tss/ghZnH9r9nz7WFNMTCSN8ARfwgsE3EtAyF6QA/HptOwY5Rkt4dWeADPhoO9t5aVvOfeh0Rchyjoz038VJBMv2wSEfZxXWbJMhMJnSPAbedsfAaUAAX8S0EWkpXOU31l57ufPcmZUqhZBZTYcWGMzSm9VZI02RWPilNkVIz60ykSifG0VEHZg9soRn4cbsk+UF1sLeRsBBEDA/QS4s5RaIr+2+lt+cE/qfr9Ne8jFbBNYMJiF6XyVZqC92RgNH//UquK1SrNNIzPbBYR9enLdsO3bKkrO1jQxU9OoifchgAAIeICAVBH5JpK9qOxXm3/ZLlfk95iceFlhk8uiyQ/51q+6ZFG5uHqwwp7RPKV/TRSj/y2vKJlk5j89jNrndI4ICBv+I4mmOZHiWVpMnKWRto33IYAACHiHQLxjJako8q1flUgtaRYV7xSj2VN2nNdkr8xlEUKQfOuBd7stSDflNIA2vryy5IdE/IsecuTlmIDESzt3VfGicH3OsRLIgvg+LEEABDxGQEh/ZY/bstBFRH6npajIt74ij7vpLQWj9SpDrhM7zv7JMrSu87Yrg/ZmVn3O2DmR0qVOu+e4gDCAJ+WQlrwaOU/DkBbjsC/AEghYREDvh7lTlkEIoQsKjwdxX60H/rDI9uHZatKWfOu7eanxjha/pGvEQT/o8g85UtMYi9FtPGT1RNVQV9zN6goBaa43oUkRmRWLhofKhvaH5n34BAEQ8AMBvZPmTlsWRi5aO23uy1uDPMbrrDbc0ct+QK7KNfnmdXlYfzfHabmykcfkW8bjbRk4howg3y0bpNtimyRfvBSCP+WGh95S9P4oouFhcytLfkYODlnRYS8XCUizZ/PWjNhYHin5ltC0s+SeFTLgDQIg4FMC3Je3BllGXuceX+/i5YcQ/MEHZGh58y7i3bzCS7lfX21ZJ7kh30Rym9z7SsszKYQVsSYxfk6k9Jvlq0duSiuRjZFcJyDxss+OlL7du6L4S1qM7tZIq4vvxxIEQAAEfE9Ao72y7/ufPpHiMTxP7NbyulZAGNgDJKL8JMlYY1apvITFsBZDQQABEPA1AR6uaoyGR8q+73HuA91cWFcLSBxcfFhLgj1RDnb+SYoJ/vEwDiegSxQbBHxFHZls/wAAAkBJREFUQKOYRtrL3MfxcJVTv+vIlKknBCReKAn2g/JI6SUh0kZLIfmtHB/EjxDjcLAEARDwHAEpGo2yL/s192lzKkov5j7OS4XwlIDEwT4ZKY1IIbmCSBspRWSeDAfjx7AEARAAAbcT4D5Lhnl8Z5Xsy67lPs3tPh/y79CaJwUk7r5U63VzIiU3Nx3IO4JiNFUjWiQrRS7iMbAEARAAAXcQ4L5Jdk6L5Pj7Ddxncd/lxjurMqHlaQGJF/SpDUftLq8s+eWcipLxsWj4KDmO+H0ZPosfxxIEQAAEnCKg90Wadhf3TdxHza0o+QX3WU75o9KuLwSkLRCecJdXJo/KMFaI8Bh57GdyqGurXOINAm4gAB8CQUDbQJp4hPsg7ovKI6WPcN/kt6L7TkDaVhA/Or68ooR/+j+oqUmMlmcC1/GElbyUrJBBXk22jY11EAABEMicgN6XaFpE9i/PihhdT9HQ0bLfKSqPFN/FfVDmOXonha8F5FA1CG3equKVcyKlv5JnAtfOiZSMyq7N70MU+poUlAelkvxZNoKKQ/GxBgIgAAKJCXBfwX2G3ndo2te5LymPlJbK/uW7/Pfdcl5jBbnocSNk4ctzAqKKxeObhuwqrxj5d1nx98lxySlzpKjIswbBZw8aiYtl47hP2vq9JifmSaNlRNrncn21XN8kww6NtP3yON4gAAIeJ6B/lzXaIb/Xm/TvuPyuy/Vlcp1vypkvi3dvLEZTtBiN4j6C+wruM8ojpfdJ0fgb9yUyTiDf/x8AAP//Eg2yLQAAAAZJREFUAwAIgeb1VtJgzwAAAABJRU5ErkJggg=="/>
<span class="text-headline-md font-bold text-on-surface">Jual Beli USU Polmed</span>
</div>
<p class="text-body-md text-on-surface-variant">Komunitas jual beli terpercaya khusus untuk mahasiswa USU dan Polmed.</p>
<div class="pt-2">
<p class="text-caption text-outline">© 2024 Jual Beli USU Polmed. All rights reserved.</p>
</div>
</div>
<div class="grid grid-cols-2 gap-md md:col-span-2 md:justify-items-end">
<div class="space-y-md">
<h4 class="text-label-md font-bold text-on-surface uppercase tracking-widest">Navigasi</h4>
<ul class="space-y-sm">
<li><a class="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Tentang Kami</a></li>
<li><a class="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Hubungi Admin</a></li>
</ul>
</div>
<div class="space-y-md">
<h4 class="text-label-md font-bold text-on-surface uppercase tracking-widest">Bantuan</h4>
<ul class="space-y-sm">
<li><a class="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Panduan Transaksi</a></li>
<li><a class="text-body-md text-on-surface-variant hover:text-primary transition-colors" href="#">Syarat &amp; Ketentuan</a></li>
</ul>
</div>
</div>
</div>
</footer>
<script>
    // Drag & Drop logic refined
    const dropzone = document.getElementById('dropzone');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.add('bg-primary/5', 'border-primary');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => {
            dropzone.classList.remove('bg-primary/5', 'border-primary');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            alert(files.length + ' foto terpilih!');
        }
    });

    // Type selection toggle logic refined
    const typeBarang = document.getElementById('type-barang');
    const typePoster = document.getElementById('type-poster');

    function setActive(activeBtn, inactiveBtn) {
        activeBtn.classList.remove('border-outline-variant', 'text-on-surface-variant');
        activeBtn.classList.add('border-primary', 'bg-primary/5', 'text-primary', 'border-2', 'font-bold');
        activeBtn.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 1";
        
        inactiveBtn.classList.add('border-outline-variant', 'text-on-surface-variant');
        inactiveBtn.classList.remove('border-primary', 'bg-primary/5', 'text-primary', 'border-2', 'font-bold');
        inactiveBtn.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 0";
    }

    typeBarang.addEventListener('click', () => setActive(typeBarang, typePoster));
    typePoster.addEventListener('click', () => setActive(typePoster, typeBarang));
</script>
</body></html>

<!-- Jual Beli USU Polmed - Modern Marketplace -->
<!DOCTYPE html>

<html class="light" lang="id"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Jual Beli USU Polmed - Marketplace Mahasiswa</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-tertiary": "#ffffff",
                        "primary-fixed-dim": "#d3bbff",
                        "tertiary-fixed": "#ffdbc8",
                        "surface-container-high": "#dce9ff",
                        "secondary-fixed": "#66ff8e",
                        "outline": "#7b7486",
                        "on-secondary-container": "#007232",
                        "on-secondary-fixed-variant": "#005322",
                        "surface-container-highest": "#d3e4fe",
                        "secondary-container": "#5dfd8a",
                        "surface-container-lowest": "#ffffff",
                        "tertiary": "#6b3000",
                        "inverse-surface": "#213145",
                        "on-primary-fixed-variant": "#5b00c5",
                        "on-tertiary-fixed-variant": "#743400",
                        "on-primary-fixed": "#250059",
                        "error-container": "#ffdad6",
                        "inverse-on-surface": "#eaf1ff",
                        "on-tertiary-fixed": "#321300",
                        "outline-variant": "#ccc3d7",
                        "primary": "#6d28d9",
                        "on-background": "#0b1c30",
                        "surface-variant": "#d3e4fe",
                        "surface-bright": "#f8f9ff",
                        "on-secondary": "#ffffff",
                        "secondary": "#25D366",
                        "surface-tint": "#7331df",
                        "tertiary-fixed-dim": "#ffb68b",
                        "on-surface-variant": "#4a4455",
                        "tertiary-container": "#8f4200",
                        "on-primary": "#ffffff",
                        "on-primary-container": "#dac5ff",
                        "surface-container-low": "#eff4ff",
                        "surface-dim": "#cbdbf5",
                        "surface": "#f8f9ff",
                        "inverse-primary": "#d3bbff",
                        "on-error": "#ffffff",
                        "on-secondary-fixed": "#002109",
                        "on-error-container": "#93000a",
                        "background": "#f8f9ff",
                        "on-surface": "#0b1c30",
                        "on-tertiary-container": "#ffc19e",
                        "primary-container": "#6d28d9",
                        "primary-fixed": "#ebddff",
                        "secondary-fixed-dim": "#3de273",
                        "error": "#ba1a1a",
                        "surface-container": "#e5eeff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "1rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "sm": "8px",
                        "margin-desktop": "48px",
                        "base": "4px",
                        "md": "20px",
                        "margin-mobile": "20px",
                        "lg": "32px",
                        "xs": "4px",
                        "gutter": "24px",
                        "xl": "48px"
                    },
                    "fontFamily": {
                        "headline-lg": ["Inter"],
                        "headline-lg-mobile": ["Inter"],
                        "label-sm": ["Inter"],
                        "body-sm": ["Inter"],
                        "label-md": ["Inter"],
                        "headline-md": ["Inter"],
                        "body-lg": ["Inter"]
                    },
                    "fontSize": {
                        "headline-lg": ["40px", {"lineHeight": "48px", "letterSpacing": "-0.02em", "fontWeight": "800"}],
                        "headline-lg-mobile": ["28px", {"lineHeight": "36px", "letterSpacing": "-0.01em", "fontWeight": "800"}],
                        "label-sm": ["12px", {"lineHeight": "16px", "fontWeight": "500"}],
                        "body-sm": ["14px", {"lineHeight": "20px", "fontWeight": "400"}],
                        "label-md": ["14px", {"lineHeight": "16px", "letterSpacing": "0.01em", "fontWeight": "600"}],
                        "headline-md": ["22px", {"lineHeight": "30px", "fontWeight": "700"}],
                        "body-lg": ["18px", {"lineHeight": "28px", "fontWeight": "400"}]
                    }
                }
            }
        }
    </script>
<style>
        body { font-family: 'Inter', sans-serif; background-color: #f8f9ff; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="text-on-background antialiased">
<!-- TopNavBar -->
<nav class="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-outline-variant/50 h-16">
<div class="flex items-center justify-between px-margin-mobile md:px-margin-desktop h-full w-full max-w-[1280px] mx-auto">
<div class="flex items-center gap-md">
<img alt="Jual Beli USU Polmed Logo" class="h-9 w-9 object-contain" src="data:image/png;base64,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"/>
<span class="hidden sm:block text-headline-md font-bold tracking-tight text-primary">Jual Beli USU Polmed</span>
</div>
<div class="hidden md:flex flex-1 max-w-lg mx-lg">
<div class="relative w-full">
<span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
<input class="w-full bg-surface-container-low border-none rounded-xl pl-12 pr-4 py-2.5 text-body-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/60" placeholder="Cari buku, kos, atau elektronik..." type="text"/>
</div>
</div>
<div class="flex items-center gap-md">
<a class="hidden lg:block text-on-surface font-semibold hover:text-primary transition-colors text-label-md" href="#">Kategori</a>
<div class="flex items-center gap-sm">
<button class="p-2.5 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-all">
<span class="material-symbols-outlined">notifications</span>
</button>
<button class="p-2.5 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-all">
<span class="material-symbols-outlined">person</span>
</button>
<button class="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-semibold text-label-md transition-all active:scale-95 shadow-sm hover:shadow-primary/20 hover:shadow-lg">
                        Jual
                    </button>
</div>
</div>
</div>
</nav>
<main class="pt-24 pb-xl max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop">
<!-- Hero Section -->
<section class="relative w-full h-[320px] md:h-[480px] rounded-xl overflow-hidden mb-xl group">
<div class="absolute inset-0 bg-gradient-to-tr from-primary/90 via-primary/40 to-transparent z-10 flex flex-col justify-center px-lg md:px-xl text-on-primary">
<h1 class="text-headline-lg-mobile md:text-headline-lg mb-4 max-w-xl">Upgrade Gear Kuliahmu</h1>
<p class="text-body-lg mb-8 max-w-md opacity-90 leading-relaxed">Temukan perlengkapan kos dan kuliah dari sesama mahasiswa dengan harga terbaik.</p>
<button class="w-fit bg-white text-primary px-8 py-3.5 rounded-xl font-bold text-label-md hover:bg-primary-fixed transition-all shadow-xl shadow-black/10 active:scale-95">
                    Lihat Promo Hari Ini
                </button>
</div>
<img class="w-full h-full object-cover transform transition-transform duration-1000 group-hover:scale-105" data-alt="A clean, vibrant top-down view of a student's workspace with a modern laptop, academic textbooks, a colorful notebook, and a coffee mug. The lighting is soft and natural, emphasizing a bright university atmosphere. The color palette incorporates shades of deep purple and white to match the university brand identity. The mood is productive, energetic, and professional." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBlojXSKzSzHxn4uAAJ9oSWfB6GpG7yLEZDub2grK9SJ7174ECVFwQmeF_gLzz-FhuSD0u4XeczHpw8DUnswCc2wPA7gRK5Xj2mP94SsPhmDbv4YsjxCY6FYj8UQQrWXgD-oi6UePL2QxZxzODwfCN7v3-CJtB57lyZ422uoijZ3DnyG2QhI-HlU7s2gju_5ERo6KCXxC-uR_D4-V8MfdklBy--shQ-B53rgMrznLnBlSF-HdfEQaoIomy1w065dnqkWXfLRCNwlo0"/>
<div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
<div class="w-2.5 h-2.5 rounded-full bg-white shadow-sm"></div>
<div class="w-2.5 h-2.5 rounded-full bg-white/40"></div>
<div class="w-2.5 h-2.5 rounded-full bg-white/40"></div>
</div>
</section>
<!-- Category Filters -->
<section class="mb-xl overflow-x-auto hide-scrollbar">
<div class="flex gap-4 py-2">
<button class="flex flex-col items-center justify-center min-w-[96px] h-24 gap-2 bg-primary text-on-primary rounded-xl transition-all shadow-lg shadow-primary/20">
<span class="material-symbols-outlined text-2xl">grid_view</span>
<span class="text-label-sm font-semibold">Semua</span>
</button>
<button class="flex flex-col items-center justify-center min-w-[96px] h-24 gap-2 bg-white border border-outline-variant/30 hover:border-primary/50 transition-all rounded-xl hover:bg-surface-container-lowest">
<span class="material-symbols-outlined text-primary text-2xl">devices</span>
<span class="text-label-sm font-medium text-on-surface-variant">Elektronik</span>
</button>
<button class="flex flex-col items-center justify-center min-w-[96px] h-24 gap-2 bg-white border border-outline-variant/30 hover:border-primary/50 transition-all rounded-xl hover:bg-surface-container-lowest">
<span class="material-symbols-outlined text-primary text-2xl">apparel</span>
<span class="text-label-sm font-medium text-on-surface-variant">Fashion</span>
</button>
<button class="flex flex-col items-center justify-center min-w-[96px] h-24 gap-2 bg-white border border-outline-variant/30 hover:border-primary/50 transition-all rounded-xl hover:bg-surface-container-lowest">
<span class="material-symbols-outlined text-primary text-2xl">menu_book</span>
<span class="text-label-sm font-medium text-on-surface-variant">Buku</span>
</button>
<button class="flex flex-col items-center justify-center min-w-[96px] h-24 gap-2 bg-white border border-outline-variant/30 hover:border-primary/50 transition-all rounded-xl hover:bg-surface-container-lowest">
<span class="material-symbols-outlined text-primary text-2xl">restaurant</span>
<span class="text-label-sm font-medium text-on-surface-variant">Makanan</span>
</button>
<button class="flex flex-col items-center justify-center min-w-[96px] h-24 gap-2 bg-white border border-outline-variant/30 hover:border-primary/50 transition-all rounded-xl hover:bg-surface-container-lowest">
<span class="material-symbols-outlined text-primary text-2xl">home_work</span>
<span class="text-label-sm font-medium text-on-surface-variant">Kos</span>
</button>
<button class="flex flex-col items-center justify-center min-w-[96px] h-24 gap-2 bg-white border border-outline-variant/30 hover:border-primary/50 transition-all rounded-xl hover:bg-surface-container-lowest">
<span class="material-symbols-outlined text-primary text-2xl">school</span>
<span class="text-label-sm font-medium text-on-surface-variant">Buku Kuliah</span>
</button>
<button class="flex flex-col items-center justify-center min-w-[96px] h-24 gap-2 bg-white border border-outline-variant/30 hover:border-primary/50 transition-all rounded-xl hover:bg-surface-container-lowest">
<span class="material-symbols-outlined text-primary text-2xl">handyman</span>
<span class="text-label-sm font-medium text-on-surface-variant">Jasa</span>
</button>
</div>
</section>
<!-- Active Listings Grid -->
<section>
<div class="flex items-center justify-between mb-lg">
<h2 class="text-headline-md text-on-surface tracking-tight">Iklan Terbaru</h2>
<a class="text-primary font-semibold text-label-md hover:underline underline-offset-4" href="#">Lihat Semua</a>
</div>
<div class="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
<!-- Product Card 1 -->
<div class="bg-white rounded-xl border border-outline-variant/40 overflow-hidden flex flex-col group transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5">
<div class="relative aspect-[4/5] overflow-hidden">
<img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" data-alt="A premium tablet device displayed on a sleek, minimalist wooden desk..." src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3Pqo_YAwPJ6Jg8s3wQhzAZ-55MoStFVY7jyDSgcI3PISEU1Y9MqsqCVssLpsdNCqfx1I-1iiPYJ5bdX3plheB8092co3k9AHsbDX7QIOPxokt_GsN4PUoQxCm_qGLCKoU_8DLQhh5adtpa2DWVU507Eipoj0bj03DgyaXT4FKjL5ArQS_2OMiBT5AVtwwwsi-q7RPh0Gbs_bUzKHzKHNryELZKSkPS8-Kff4-S5WSby5urxroFiIqteMxGXvOO2QRwm_Txdn658M"/>
<div class="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-primary px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Elektronik</div>
</div>
<div class="p-md flex flex-col flex-grow">
<h3 class="text-on-surface font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-colors">iPad Air 4th Gen + Pencil</h3>
<p class="text-headline-md text-primary font-bold mb-3">Rp 6.500.000</p>
<div class="flex items-center gap-1.5 mb-6 opacity-60">
<span class="material-symbols-outlined text-[16px]">person</span>
<span class="text-body-sm font-medium">Andika Pratama</span>
</div>
<button class="mt-auto w-full bg-secondary text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-label-md shadow-lg shadow-secondary/20 hover:brightness-105 active:scale-95 transition-all">
<span class="material-symbols-outlined text-[20px]">chat</span>
                            Minat
                        </button>
</div>
</div>
<!-- Product Card 2 -->
<div class="bg-white rounded-xl border border-outline-variant/40 overflow-hidden flex flex-col group transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5">
<div class="relative aspect-[4/5] overflow-hidden">
<img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" data-alt="A stack of thick, technical engineering..." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAr5xKYqUiNaRhpDQTc0IBnTSN3jWSmbgJtFybOdpUpUC3f4J97_bTnGrMEPLljqW1RzHWqv9V1EgrAtNwJBQsY34VIpiPTY8vo27abB3suJKXhh25FO8DsYmfz7e64NBxW1zU5km595uxtJ4r3wh13g6kQIoYlui8GnO-mQ4qhqgvJYsVToGtjIVTV1kDYJ2BzILVQBBO8FcaAN2jhjuO1Lv4sfSb6A3ySLC4udK_wBqzDlUCyzDIfiodJ4zZOJzSWeLPOU5CvvTQ"/>
<div class="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-primary px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Buku Kuliah</div>
</div>
<div class="p-md flex flex-col flex-grow">
<h3 class="text-on-surface font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-colors">Kalkulus Edisi 9 - Purcell</h3>
<p class="text-headline-md text-primary font-bold mb-3">Rp 120.000</p>
<div class="flex items-center gap-1.5 mb-6 opacity-60">
<span class="material-symbols-outlined text-[16px]">person</span>
<span class="text-body-sm font-medium">Siti Aminah</span>
</div>
<button class="mt-auto w-full bg-secondary text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-label-md shadow-lg shadow-secondary/20 hover:brightness-105 active:scale-95 transition-all">
<span class="material-symbols-outlined text-[20px]">chat</span>
                            Minat
                        </button>
</div>
</div>
<!-- Product Card 3 -->
<div class="bg-white rounded-xl border border-outline-variant/40 overflow-hidden flex flex-col group transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5">
<div class="relative aspect-[4/5] overflow-hidden">
<img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" data-alt="A professional business-style laptop bag..." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEfsC0utXW0MByYwPsmN6Jpap4n2Vt-wLIjnjkwtoLMEWpeGpAwpaKodtD4K1MOkPD_oPhpsDpiqnbsjDqTkA9nNfjE9PECLXTP7YfS39GOKXSA6hnZ-JsGdKwNhXqZjPlo7twfkl97RkxTFCRE8DOVRlZYT7BUs9k_WyaNKhI9WpmjBjLHFV_2KcHKNuhl_AydncktLU8fcGaGOhavqw7SOSizxKQVShZ_D2gtcm-RkDGiMPvNjV--IasPaStLx6L_a7_QKqf1gc"/>
<div class="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-primary px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Fashion</div>
</div>
<div class="p-md flex flex-col flex-grow">
<h3 class="text-on-surface font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-colors">Tas Ransel Anti-Theft Waterproof</h3>
<p class="text-headline-md text-primary font-bold mb-3">Rp 250.000</p>
<div class="flex items-center gap-1.5 mb-6 opacity-60">
<span class="material-symbols-outlined text-[16px]">person</span>
<span class="text-body-sm font-medium">Rizky Ramadhan</span>
</div>
<button class="mt-auto w-full bg-secondary text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-label-md shadow-lg shadow-secondary/20 hover:brightness-105 active:scale-95 transition-all">
<span class="material-symbols-outlined text-[20px]">chat</span>
                            Minat
                        </button>
</div>
</div>
<!-- Product Card 4 -->
<div class="bg-white rounded-xl border border-outline-variant/40 overflow-hidden flex flex-col group transition-all hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5">
<div class="relative aspect-[4/5] overflow-hidden">
<img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" data-alt="A cozy and modern studio apartment..." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsfcbpAFABgTfkh0-Vz3ahiseSgDqbdwC8fX1AOVLDvj0X9eW-ZdVarunmYqPc4LsLqo3hdJezRdWHSBEcHF50FCylJzgTdsJTQWy5wy-mno61XysL01fbhE_H-Yu7ui48hIMQaVVl8_OEZY1vOfPU7yTmNRf8rcCZhSDxmb5vYXsOdZ39S8YUkhRnDDwHuE1TtdWR1N6eAAYuE4uffhSjOP4JdOhJlxH3G3xvvbN5ODnPn4sGkuWS3Zo3Lr_niF3s92_iJ3CqTbw"/>
<div class="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-primary px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Kos</div>
</div>
<div class="p-md flex flex-col flex-grow">
<h3 class="text-on-surface font-semibold mb-1 line-clamp-1 group-hover:text-primary transition-colors">Kos AC Dekat Pintu 1 USU</h3>
<p class="text-headline-md text-primary font-bold mb-3">Rp 1.200.000 / Bln</p>
<div class="flex items-center gap-1.5 mb-6 opacity-60">
<span class="material-symbols-outlined text-[16px]">person</span>
<span class="text-body-sm font-medium">Ibu Kos Melati</span>
</div>
<button class="mt-auto w-full bg-secondary text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-label-md shadow-lg shadow-secondary/20 hover:brightness-105 active:scale-95 transition-all">
<span class="material-symbols-outlined text-[20px]">chat</span>
                            Minat
                        </button>
</div>
</div>
</div>
<div class="mt-xl flex justify-center">
<button class="bg-white border border-outline-variant/50 text-on-surface px-10 py-3.5 rounded-xl font-semibold text-label-md hover:bg-surface-container-low transition-all active:scale-95">
                    Muat Lebih Banyak
                </button>
</div>
</section>
</main>
<!-- Footer -->
<footer class="bg-white border-t border-outline-variant/30 w-full">
<div class="grid grid-cols-1 md:grid-cols-4 gap-xl px-margin-mobile md:px-margin-desktop py-xl max-w-[1280px] mx-auto">
<div class="md:col-span-2 flex flex-col gap-6">
<div class="flex items-center gap-3">
<img alt="Jual Beli USU Polmed Logo" class="h-8 w-8 object-contain" src="data:image/png;base64,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"/>
<span class="text-headline-md font-bold tracking-tight text-on-surface">Jual Beli USU Polmed</span>
</div>
<p class="text-body-sm text-on-surface-variant max-w-sm leading-relaxed">
                    Platform marketplace khusus komunitas mahasiswa USU dan Polmed. Bertransaksi aman, mudah, dan terpercaya di lingkungan kampus.
                </p>
<div class="flex gap-4">
<a class="p-2.5 bg-surface-container text-primary rounded-xl hover:bg-primary hover:text-white transition-all" href="#"><span class="material-symbols-outlined">public</span></a>
<a class="p-2.5 bg-surface-container text-primary rounded-xl hover:bg-primary hover:text-white transition-all" href="#"><span class="material-symbols-outlined">alternate_email</span></a>
</div>
</div>
<div class="flex flex-col gap-6">
<h4 class="text-label-md font-bold text-on-surface uppercase tracking-widest text-[10px]">Tautan Cepat</h4>
<div class="flex flex-col gap-4">
<a class="text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">Tentang Kami</a>
<a class="text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">Hubungi Admin</a>
<a class="text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">Grup WhatsApp</a>
<a class="text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">Panduan Transaksi</a>
</div>
</div>
<div class="flex flex-col gap-6">
<h4 class="text-label-md font-bold text-on-surface uppercase tracking-widest text-[10px]">Bantuan</h4>
<div class="flex flex-col gap-4">
<a class="text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">Syarat &amp; Ketentuan</a>
<a class="text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">Kebijakan Privasi</a>
<a class="text-body-sm text-on-surface-variant hover:text-primary transition-all" href="#">Laporkan Penipuan</a>
</div>
</div>
</div>
<div class="border-t border-outline-variant/30 py-8 text-center">
<p class="text-label-sm text-on-surface-variant/70 font-medium">
                © 2024 Jual Beli USU Polmed. Komunitas Jual Beli Mahasiswa Terpercaya.
            </p>
</div>
</footer>
<!-- FAB for Mobile Sale -->
<div class="md:hidden fixed bottom-8 right-8 z-40">
<button class="bg-primary text-on-primary w-16 h-16 rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center transition-transform active:scale-90">
<span class="material-symbols-outlined text-[32px]">add</span>
</button>
</div>
<script>
        document.addEventListener('DOMContentLoaded', () => {
            const carousel = document.querySelector('section.relative.rounded-xl');
            const dots = carousel.querySelectorAll('.absolute.bottom-8 div');
            let currentSlide = 0;

            setInterval(() => {
                dots[currentSlide].classList.remove('bg-white');
                dots[currentSlide].classList.add('bg-white/40');
                currentSlide = (currentSlide + 1) % dots.length;
                dots[currentSlide].classList.remove('bg-white/40');
                dots[currentSlide].classList.add('bg-white');
            }, 5000);

            const buttons = document.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    btn.classList.add('scale-95');
                    setTimeout(() => btn.classList.remove('scale-95'), 100);
                });
            });
        });
    </script>
</body></html>

<!-- Detail Produk - MacBook Air M1 2020 -->
<!DOCTYPE html>

<html lang="id"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "secondary": "#006d2f",
                        "surface-dim": "#cbdbf5",
                        "primary-container": "#6d28d9",
                        "on-surface": "#0b1c30",
                        "on-primary-fixed-variant": "#5b00c5",
                        "surface-container": "#e5eeff",
                        "outline": "#7b7486",
                        "tertiary-container": "#8f4200",
                        "error": "#ba1a1a",
                        "surface": "#f8f9ff",
                        "secondary-fixed": "#66ff8e",
                        "secondary-container": "#5dfd8a",
                        "on-tertiary-fixed": "#321300",
                        "on-surface-variant": "#4a4455",
                        "on-primary-fixed": "#250059",
                        "surface-container-high": "#dce9ff",
                        "on-secondary-container": "#007232",
                        "on-background": "#0b1c30",
                        "surface-container-lowest": "#ffffff",
                        "tertiary-fixed": "#ffdbc8",
                        "inverse-on-surface": "#eaf1ff",
                        "background": "#f8f9ff",
                        "primary": "#5300b7",
                        "surface-bright": "#f8f9ff",
                        "surface-tint": "#7331df",
                        "secondary-fixed-dim": "#3de273",
                        "primary-fixed-dim": "#d3bbff",
                        "on-secondary-fixed-variant": "#005322",
                        "on-tertiary-fixed-variant": "#743400",
                        "on-primary": "#ffffff",
                        "on-error-container": "#93000a",
                        "tertiary": "#6b3000",
                        "surface-container-highest": "#d3e4fe",
                        "primary-fixed": "#ebddff",
                        "on-tertiary": "#ffffff",
                        "on-primary-container": "#dac5ff",
                        "error-container": "#ffdad6",
                        "inverse-primary": "#d3bbff",
                        "on-secondary": "#ffffff",
                        "tertiary-fixed-dim": "#ffb68b",
                        "on-tertiary-container": "#ffc19e",
                        "surface-variant": "#d3e4fe",
                        "surface-container-low": "#eff4ff",
                        "inverse-surface": "#213145",
                        "outline-variant": "#ccc3d7",
                        "on-secondary-fixed": "#002109",
                        "on-error": "#ffffff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "margin-mobile": "16px",
                        "lg": "2.5rem",
                        "max-width": "1280px",
                        "sm": "1rem",
                        "md": "1.5rem",
                        "margin-desktop": "48px",
                        "gutter": "24px",
                        "xl": "4rem",
                        "xs": "0.5rem",
                        "base": "4px"
                    },
                    "fontFamily": {
                        "label-md": ["Inter"],
                        "display-lg": ["Inter"],
                        "caption": ["Inter"],
                        "body-lg": ["Inter"],
                        "headline-lg": ["Inter"],
                        "headline-md": ["Inter"],
                        "headline-lg-mobile": ["Inter"],
                        "body-md": ["Inter"]
                    },
                    "fontSize": {
                        "label-md": ["14px", {"lineHeight": "1.2", "letterSpacing": "0.04em", "fontWeight": "500"}],
                        "display-lg": ["48px", {"lineHeight": "1.1", "letterSpacing": "0.02em", "fontWeight": "700"}],
                        "caption": ["12px", {"lineHeight": "1.4", "letterSpacing": "0", "fontWeight": "400"}],
                        "body-lg": ["18px", {"lineHeight": "1.6", "letterSpacing": "0", "fontWeight": "400"}],
                        "headline-lg": ["32px", {"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "600"}],
                        "headline-md": ["20px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "600"}],
                        "headline-lg-mobile": ["24px", {"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "600"}],
                        "body-md": ["16px", {"lineHeight": "1.5", "letterSpacing": "0", "fontWeight": "400"}]
                    }
                },
            },
        }
    </script>
<style>
        body { font-family: 'Inter', sans-serif; background-color: #f8f9ff; }
        .product-gallery::-webkit-scrollbar { display: none; }
        .glass-effect { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); }
    </style>
</head>
<body class="text-on-surface">
<!-- TopNavBar -->
<nav class="fixed top-0 w-full z-50 bg-surface border-b border-outline-variant shadow-sm">
<div class="flex items-center justify-between px-margin-desktop h-16 w-full max-w-[1200px] mx-auto">
<div class="text-headline-md font-headline-md font-bold text-primary">Jual Beli USU Polmed</div>
<div class="hidden md:flex items-center gap-md">
<a class="text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md" href="#">Kategori</a>
<div class="relative w-64">
<input class="w-full bg-surface-container-low border-outline-variant rounded-full px-4 py-2 text-body-md focus:ring-2 focus:ring-primary-container outline-none transition-all" placeholder="Cari di kampus..." type="text"/>
</div>
<button class="flex items-center gap-xs px-4 py-2 bg-primary text-on-primary rounded-full font-label-md text-label-md transition-all active:scale-95">
<span class="material-symbols-outlined text-sm">add</span> Jual
                </button>
<div class="flex items-center gap-sm">
<span class="material-symbols-outlined text-on-surface-variant cursor-pointer hover:bg-surface-container-low p-2 rounded-full transition-colors">notifications</span>
<span class="material-symbols-outlined text-on-surface-variant cursor-pointer hover:bg-surface-container-low p-2 rounded-full transition-colors">person</span>
</div>
</div>
<!-- Mobile Menu Icon -->
<div class="md:hidden">
<span class="material-symbols-outlined">menu</span>
</div>
</div>
</nav>
<!-- Main Content -->
<main class="mt-20 px-margin-mobile md:px-margin-desktop max-w-[1200px] mx-auto pb-xl">
<!-- Breadcrumb -->
<nav class="flex items-center gap-xs text-on-surface-variant mb-md text-label-md font-label-md">
<a class="hover:text-primary" href="#">Beranda</a>
<span class="material-symbols-outlined text-sm">chevron_right</span>
<a class="hover:text-primary" href="#">Elektronik</a>
<span class="material-symbols-outlined text-sm">chevron_right</span>
<span class="text-on-surface">MacBook Air M1</span>
</nav>
<div class="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
<!-- Left Column: Image Gallery -->
<div class="lg:col-span-7 space-y-md">
<div class="aspect-[4/3] rounded-xl overflow-hidden bg-surface-container shadow-sm border border-outline-variant relative group">
<img alt="MacBook Air M1" class="w-full h-full object-cover" data-alt="A professional, high-resolution product photograph of a silver MacBook Air M1 2020 resting on a minimalist white oak desk. The scene is bathed in soft, natural morning light coming from a nearby window, emphasizing the laptop's slim profile and premium aluminum finish. The background is a clean, out-of-focus academic environment with a few stacked textbooks and a ceramic coffee mug, reflecting a modern university student aesthetic. The overall mood is bright, airy, and sophisticated." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAPSRy3lhqxfIIm2DtItsopR8MT5-NC0FBbe3U4bXeyTD3Hcm-jzmGpW6MUCKVO8xyRd5X3fzVp-pxVVIwBJZ-uh8_wH8T2vWtRB2ixupfL-kjVvQSD_xTe4d2UyL5u1EggbpgEBR7cfEz-3sgqypV_GgW5v4_x4JK2-NAnAMl0kFr8ZS-XThfRP0mSTYQBWYoXEUWPtUAJElXIx1gj3KR5ZK8d1OZqG9oT3E8VaX3b2qHharmlMAi5kxWgurNieS35cxbqhddM-M"/>
<div class="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="bg-surface/80 p-2 rounded-full shadow-md"><span class="material-symbols-outlined">chevron_left</span></button>
<button class="bg-surface/80 p-2 rounded-full shadow-md"><span class="material-symbols-outlined">chevron_right</span></button>
</div>
</div>
<!-- Thumbnails -->
<div class="flex gap-sm overflow-x-auto pb-2 product-gallery">
<div class="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border-2 border-primary cursor-pointer">
<img alt="Thumbnail 1" class="w-full h-full object-cover" data-alt="Close up shot of a sleek silver MacBook Air M1 focusing on the keyboard and trackpad area. The lighting is soft and even, highlighting the texture of the aluminum and the clean keycaps. The background is a blurred study space with neutral tones and a hint of a green plant, maintaining a minimalist and modern university student lifestyle vibe." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCW-JgBVwGeZkRQOouTDHkkETfqOksm41lNEBQ3BYjjpbM4IUXwra3-Gqao_fFuvoXTILbTOlnRvmW4Pdg-j8nb3QsLmjUw7ODQahHb2eWVepBkhlDCkK3BxMWLkkn9ZIxvelQpVEIkX7tJAE1X1e9nAGJEVThfZHeFihWUrPpfPaamjBFXVZFt_4mopj8z0gGvSjB0IXVTqrk-AfC51r1ibpWNQ9FjQYHr3e8D9Kc-clVo7UOsZsVloaxi9PBCmVvCBxAOgoXEiXs"/>
</div>
<div class="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-outline-variant hover:border-primary cursor-pointer transition-colors">
<img alt="Thumbnail 2" class="w-full h-full object-cover" data-alt="A side profile view of a thin MacBook Air M1 to showcase its slim wedge design. The laptop is placed on a light grey textured surface with clean lines. The lighting is crisp, casting a subtle soft shadow. The background includes a corner of a university notebook and a designer pen, creating a productive and organized student workspace atmosphere." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzLLlyGaDMPhTAjFNY1OXDB5Ns-v7zS_p0FNNu_3n3Rr8p3xd8yy_lsYcXnOvPYlDeEulZIsIe9XePBE8_2wK5P4XYTOOOnBQE_ezOmsBfXBlDkhopKZQlmdbF8LoRYjmOd-vwNsdgm7dK7q79gr3eZprZOcAR6X20ITNtoepGWFh-iTfDG_tW5crfhc5Fvc5jlftjj173B3GIkXj8ODTf946FuvoJqEXFcX7y3G4DGGO07mRT98oqf0SYjVMOGTaTvaD5VmBinDU"/>
</div>
<div class="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-outline-variant hover:border-primary cursor-pointer transition-colors">
<img alt="Thumbnail 3" class="w-full h-full object-cover" data-alt="A lifestyle photograph of a student using a MacBook Air M1 in a brightly lit, modern university library or common area. The screen shows a clean coding interface or academic paper. The setting is characterized by light wood furniture, large windows, and a palette of soft whites and blues, evoking a sense of focus, productivity, and academic excellence." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNApeTgmP2mHUNFqV2FUTiG7oofpvoZIpXFdOPqaf4zNzi8FiLHUjeaXorjnBoJEyadcGCipHd-nMcrwXm2ByZuU9o8QXsqxbvWIL12o5NIZnbyfGvNnX6zLJds82G6p7gncrxJ9QjqCGFHAngdaLNY3lrh15vSnxPPxnJy9Hw7j94tBTTjgiuXOJe06gcEoMMryuFl0DsWckLFZa9vhQW2gbVsdsLuwe1A7zocKfo-hn0aY21mUos9WK_D0twuFIdedhPNSiNl9U"/>
</div>
</div>
</div>
<!-- Right Column: Details & CTA -->
<div class="lg:col-span-5 space-y-md">
<div class="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm space-y-md">
<div>
<div class="flex justify-between items-start">
<span class="inline-block px-2 py-1 bg-surface-container-high text-on-surface-variant text-label-md font-label-md rounded-lg mb-2">Elektronik • Bekas</span>
<button class="text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined">favorite</span></button>
</div>
<h1 class="text-headline-lg font-headline-lg text-on-surface leading-tight">MacBook Air M1 2020 Space Grey 8/256GB</h1>
<p class="text-display-lg font-display-lg text-primary mt-2">Rp 9.500.000</p>
</div>
<hr class="border-outline-variant"/>
<!-- Seller Card -->
<div class="flex items-center justify-between p-sm bg-surface rounded-lg border border-outline-variant">
<div class="flex items-center gap-sm">
<div class="w-12 h-12 rounded-full overflow-hidden bg-secondary-container">
<img alt="Seller Profile" class="w-full h-full object-cover" data-alt="A friendly and professional portrait of a young male university student with a warm smile, wearing a clean white t-shirt. The background is a soft-focus campus setting with green trees and university architecture under bright, natural daylight. The image has a clean, trustworthy, and approachable aesthetic, typical of a peer-to-peer marketplace platform." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCl9C6TwLEwR0U7oqez4wrOkjnuOcstpJnNpIZs1LI-tr2rpgh4UqWyhuAAi9YBHP8I-mnX1rBDxWCUwfbIb1s0xzpw_mAs1WR1dCXMfFfo5iC54AUd05wWGHTJF7LlbJCD9rcqJRasz4_1bUHlsvVQDXS2eCFIGvTuKqD-k3YRvxCMxY2y0Wh0HWzjBqNX7y9bMVpM0tHmtAmh8pZictIOLYPUxDOw-EufEXb5TS3sIgGU7icjN8qCl3aRcBVnCAn90rC6fBMJM0E"/>
</div>
<div>
<p class="text-body-md font-bold">Andi Pratama</p>
<div class="flex items-center gap-1 text-label-md font-label-md text-secondary">
<span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">verified</span>
<span>Mahasiswa Polmed (Terverifikasi)</span>
</div>
</div>
</div>
<button class="text-primary font-label-md text-label-md hover:underline">Lihat Profil</button>
</div>
<!-- Actions -->
<div class="space-y-sm pt-md">
<a class="flex items-center justify-center gap-sm w-full h-12 bg-secondary text-on-secondary rounded-full font-headline-md text-headline-md hover:opacity-90 transition-all active:scale-95 shadow-md" href="https://wa.me/628123456789" target="_blank">
<span class="material-symbols-outlined">chat</span> Hubungi Penjual
                        </a>
<button class="flex items-center justify-center gap-sm w-full h-12 border border-outline text-on-surface rounded-full font-label-md text-label-md hover:bg-surface-container-low transition-all active:scale-95" onclick="document.getElementById('ig-share-modal').classList.remove('hidden')">
<span class="material-symbols-outlined">photo_camera</span> Share to IG Story
                        </button>
</div>
</div>
<!-- Product Description -->
<div class="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
<h3 class="text-headline-md font-headline-md mb-sm">Deskripsi Produk</h3>
<div class="text-body-md text-on-surface-variant space-y-md">
<p>Dijual santai MacBook Air M1 2020 warna Space Grey. Pemakaian pribadi untuk tugas kuliah dan sesekali editing ringan.</p>
<ul class="list-disc pl-5 space-y-1">
<li>Chip Apple M1 (8-core CPU, 7-core GPU)</li>
<li>RAM 8GB / SSD 256GB</li>
<li>Battery Health 92% (Normal)</li>
<li>Cycle Count: 180</li>
<li>Kelengkapan: Unit &amp; Charger Original</li>
</ul>
<p class="font-bold text-on-surface">Lokasi COD: Kantin Teknik Polmed atau Perpustakaan USU.</p>
</div>
</div>
</div>
</div>
<!-- Related Listings -->
<section class="mt-xl">
<div class="flex justify-between items-end mb-lg">
<div>
<h2 class="text-headline-lg font-headline-lg">Lainnya di Elektronik</h2>
<p class="text-body-md text-on-surface-variant">Pilihan serupa yang mungkin kamu suka</p>
</div>
<a class="text-primary font-label-md text-label-md hover:underline flex items-center gap-1" href="#">Lihat Semua <span class="material-symbols-outlined text-sm">arrow_forward</span></a>
</div>
<div class="grid grid-cols-2 md:grid-cols-4 gap-gutter">
<!-- Card 1 -->
<div class="group bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden hover:shadow-lg transition-all cursor-pointer">
<div class="aspect-[4/3] overflow-hidden">
<img alt="iPad Air" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="A clean, minimalist shot of an iPad Air with an Apple Pencil resting on a light-colored wooden table. The lighting is soft and diffuse, highlighting the sleek design of the tablet. The environment is a bright university common area, with hints of other students in the soft-focus background. The palette is dominated by whites, light greys, and natural wood tones." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCq-KjyUuP6F0sjKF4yUYZsk8JlkgucULQfJYPQlaA4oxGo5j7L7LeWf0L8UvN1f62V1QuUqGQ9NI8GpEnoLLomqhuNSnPtxg_Qz2fESaistB93Jj0w81vMjVMKXdVF5UU9tAAyBNpncHnN5f7A0qi_YuPGYvlc4_hisOtIauznNSl4EeA2FlSEHvakQJrYdTd1ZccbsPbTyCmOHahkBvdV_XYEgjNDFoSes4U19y487guQcAfyKflIMz4LKBEd7FVHP4RFMCVPvPc"/>
</div>
<div class="p-sm">
<p class="text-label-md font-label-md text-on-surface-variant mb-1">Tablet</p>
<h4 class="text-body-md font-bold line-clamp-1">iPad Air 4 64GB + Pencil</h4>
<p class="text-body-lg font-bold text-primary mt-2">Rp 5.200.000</p>
<p class="text-caption text-on-surface-variant mt-2 flex items-center gap-1"><span class="material-symbols-outlined text-xs">location_on</span> Medan Baru</p>
</div>
</div>
<!-- Card 2 -->
<div class="group bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden hover:shadow-lg transition-all cursor-pointer">
<div class="aspect-[4/3] overflow-hidden">
<img alt="Headphones" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="A high-end pair of over-ear studio headphones resting on a stack of textbooks on a minimalist desk. The scene is illuminated by warm, localized lighting, creating a cozy and focused study atmosphere. The color palette is composed of deep blacks, rich browns, and creamy whites, aiming for a professional yet student-friendly aesthetic." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUu7ZWbelz-9S6yxJsA_8tV4IKzwppjyvllVN1udawY9YTr9fw9eIRyvPWHzm4qovVzbroUqyB1VN57L2plyVpOBWY9LXxL4a0B_siQ_i9L1LKQV9EVvuOgJLKONnF-c7tfEc9W0aVmDOdHlGRCEGQtHTK8eHlONyMEU5v042kOojalLeKourdrmRO2i1cGHZX2qKJOMRP5VKUVDCAJFaM0r2b8d2ajdvtNVwS01NXIg9wX2x5CpmuHjLljbyw9fGoU_KbtchmgF8"/>
</div>
<div class="p-sm">
<p class="text-label-md font-label-md text-on-surface-variant mb-1">Audio</p>
<h4 class="text-body-md font-bold line-clamp-1">Sony WH-1000XM4 Mulus</h4>
<p class="text-body-lg font-bold text-primary mt-2">Rp 2.850.000</p>
<p class="text-caption text-on-surface-variant mt-2 flex items-center gap-1"><span class="material-symbols-outlined text-xs">location_on</span> Polmed Area</p>
</div>
</div>
<!-- Card 3 -->
<div class="group bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden hover:shadow-lg transition-all cursor-pointer">
<div class="aspect-[4/3] overflow-hidden">
<img alt="Gaming Mouse" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="A professional gaming mouse displayed on a sleek black mousepad with subtle RGB lighting illuminating the edges. The environment is a modern, darkened student dormitory room with a glowing computer monitor in the background. The visual style is tech-focused and energetic, with deep shadows and vibrant light accents, fitting a university gaming community theme." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbHNYVVnE-ih-mb6bVuKZoPIrWwuzlw5nOA7FHKwSZebB4Hdl5XfdlRZsiLMRmN_1y3A7oYMcgs7SFStci4hlfRxJuYFSUJUbjbk1eiuv1lENh2u2AE3CjedCFoJgjQ6gtaWSp_jBJ8n_ncgVG7VKMFRlGHEirBGi4N3yOcq5Ta_aQPiKHv8Sy78hakNlip4L-2tcWAQq9ipUQwNXn6RCxs0dBC-H_DWTgxxIpE3Y4Zl2wXkbas0iewQNo8v8VNYrS69P8-k-Hlvs"/>
</div>
<div class="p-sm">
<p class="text-label-md font-label-md text-on-surface-variant mb-1">Aksesoris</p>
<h4 class="text-body-md font-bold line-clamp-1">Logitech G Pro X Superlight</h4>
<p class="text-body-lg font-bold text-primary mt-2">Rp 1.100.000</p>
<p class="text-caption text-on-surface-variant mt-2 flex items-center gap-1"><span class="material-symbols-outlined text-xs">location_on</span> USU Pintu 1</p>
</div>
</div>
<!-- Card 4 -->
<div class="group bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden hover:shadow-lg transition-all cursor-pointer">
<div class="aspect-[4/3] overflow-hidden">
<img alt="Smartphone" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="A high-resolution photograph of a sleek modern smartphone held in a person's hand against a bright, out-of-focus background of a university campus. The phone's screen is clear and reflective. The lighting is vibrant and sunny, emphasizing a sense of connectivity and mobility. The overall aesthetic is clean, energetic, and contemporary, reflecting a typical student life scene." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAhMzK7D6pzxHDfbAfZD3iVQmZS2e_XdZZZY8AlW3nkmOoPqWt-ocenLvGuvqatDGMnku0zIW4o08FbvV2pwPKW_iWTmcygOgP-gNirWfr276_83--OiUxyNaYL6v1FLG9goT4_nwJV_z4Lazy1CukSUgYKr-g1JvutUXrQ9zUd9dO19fu72LmYl_6S1m-MZWOTCCJzEUMF_hXuQla7UMts0AQcFLKG39OarrzHM0DZs9XwP1qo7wY0DV47ycQUT1ldZMG_qaOy-wI"/>
</div>
<div class="p-sm">
<p class="text-label-md font-label-md text-on-surface-variant mb-1">HP &amp; Gadget</p>
<h4 class="text-body-md font-bold line-clamp-1">iPhone 12 Mini 128GB</h4>
<p class="text-body-lg font-bold text-primary mt-2">Rp 6.400.000</p>
<p class="text-caption text-on-surface-variant mt-2 flex items-center gap-1"><span class="material-symbols-outlined text-xs">location_on</span> Padang Bulan</p>
</div>
</div>
</div>
</section>
</main>
<!-- Footer -->
<footer class="w-full mt-auto bg-surface-container-lowest border-t border-outline-variant">
<div class="grid grid-cols-1 md:grid-cols-3 gap-lg px-margin-desktop py-xl max-w-[1200px] mx-auto">
<div class="space-y-sm">
<div class="text-headline-sm font-headline-sm text-on-surface font-bold">Jual Beli USU Polmed</div>
<p class="text-body-sm font-body-sm text-on-surface-variant">© 2024 Jual Beli USU Polmed. Komunitas Jual Beli Mahasiswa Terpercaya.</p>
</div>
<div class="space-y-sm">
<h4 class="font-bold text-on-surface">Tautan</h4>
<div class="flex flex-col gap-2">
<a class="text-label-sm font-label-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Tentang Kami</a>
<a class="text-label-sm font-label-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Hubungi Admin</a>
<a class="text-label-sm font-label-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Grup WhatsApp</a>
</div>
</div>
<div class="space-y-sm">
<h4 class="font-bold text-on-surface">Legal</h4>
<div class="flex flex-col gap-2">
<a class="text-label-sm font-label-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Panduan Transaksi</a>
<a class="text-label-sm font-label-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Syarat &amp; Ketentuan</a>
</div>
</div>
</div>
</footer>
<!-- IG Share Modal Preview -->
<div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 hidden px-4" id="ig-share-modal">
<div class="bg-surface p-6 rounded-2xl w-full max-w-sm relative">
<button class="absolute top-4 right-4 text-on-surface-variant" onclick="document.getElementById('ig-share-modal').classList.add('hidden')"><span class="material-symbols-outlined">close</span></button>
<h3 class="text-headline-md font-headline-md mb-md text-center">Preview IG Story</h3>
<!-- 9:16 Mockup -->
<div class="aspect-[9/16] w-full bg-gradient-to-br from-primary via-primary-container to-secondary rounded-xl p-6 flex flex-col text-on-primary shadow-2xl relative overflow-hidden">
<div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
<div class="z-10 flex flex-col h-full">
<div class="text-sm font-bold opacity-80 mb-2">JUAL BELI USU POLMED</div>
<div class="w-full aspect-square rounded-lg overflow-hidden mb-4 shadow-lg border-2 border-white/20">
<img alt="Product" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFM3Ww6iHQsmsUd0pCq8jNqmVWsHUQwuLdd3sW76DlczFUMJTEHKmuRQnugZJfVIpV8taUEaqC4sNwIiXfT8WzgK5JiU0r2mtaYRKqujHtXpQOZazvTubbh2pWTwrbEf8GfR4_Y2seID_64lEYsWPY2VZiM9l_DP8ie-FSdn1UAdFQ5e-tsinc_msWJEUnJXQuPflHbM3nI_DygKI_tsW73XgLzIzk6MLY2Ck9BgB7x6YvlkoGuSmhrA4mMCVYPajZNECYI472u3M"/>
</div>
<h2 class="text-2xl font-bold leading-tight">MacBook Air M1 2020 8/256GB</h2>
<p class="text-xl mt-2 font-mono">Rp 9.500.000</p>
<div class="mt-auto space-y-4">
<div class="bg-white/20 backdrop-blur-md rounded-lg p-3 text-sm border border-white/20 text-center">
                            🤝 COD @ Kampus USU/Polmed
                        </div>
<div class="flex items-center justify-between">
<div class="flex items-center gap-2">
<div class="w-8 h-8 rounded-full bg-white/30"></div>
<div class="text-xs">Andi Pratama</div>
</div>
<div class="px-3 py-1 bg-white text-primary text-xs font-bold rounded-full">CEK LINK BIO</div>
</div>
</div>
</div>
</div>
<button class="w-full mt-6 py-3 bg-primary text-on-primary rounded-full font-bold transition-all active:scale-95">Download &amp; Buka Instagram</button>
</div>
</div>
<script>
        // Simple Interaction for navigation and modal
        document.querySelectorAll('a[href="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
            });
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.getElementById('ig-share-modal').classList.add('hidden');
            }
        });
    </script>
</body></html>

<!-- Admin Dashboard - Overview & Management -->
<!DOCTYPE html>

<html class="light" lang="id"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Admin Panel - Jual Beli USU Polmed</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<!-- Shared Tailwind Config -->
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "on-error-container": "#93000a",
                    "inverse-primary": "#d3bbff",
                    "tertiary": "#6b3000",
                    "on-primary-container": "#dac5ff",
                    "background": "#f8f9ff",
                    "surface-tint": "#7331df",
                    "surface-container-high": "#dce9ff",
                    "primary-container": "#6d28d9",
                    "primary": "#5300b7",
                    "on-secondary": "#ffffff",
                    "on-tertiary-fixed": "#321300",
                    "surface-container-low": "#eff4ff",
                    "surface-variant": "#d3e4fe",
                    "secondary": "#006d2f",
                    "outline": "#7b7486",
                    "on-primary-fixed": "#250059",
                    "on-tertiary": "#ffffff",
                    "surface-container": "#e5eeff",
                    "secondary-fixed": "#66ff8e",
                    "surface-container-lowest": "#ffffff",
                    "tertiary-fixed-dim": "#ffb68b",
                    "tertiary-fixed": "#ffdbc8",
                    "secondary-fixed-dim": "#3de273",
                    "tertiary-container": "#8f4200",
                    "on-primary": "#ffffff",
                    "on-error": "#ffffff",
                    "secondary-container": "#5dfd8a",
                    "surface-dim": "#cbdbf5",
                    "primary-fixed-dim": "#d3bbff",
                    "outline-variant": "#ccc3d7",
                    "on-secondary-container": "#007232",
                    "surface": "#f8f9ff",
                    "on-primary-fixed-variant": "#5b00c5",
                    "error": "#ba1a1a",
                    "surface-container-highest": "#d3e4fe",
                    "on-tertiary-container": "#ffc19e",
                    "on-tertiary-fixed-variant": "#743400",
                    "primary-fixed": "#ebddff",
                    "on-surface": "#0b1c30",
                    "inverse-on-surface": "#eaf1ff",
                    "surface-bright": "#f8f9ff",
                    "error-container": "#ffdad6",
                    "on-background": "#0b1c30",
                    "on-surface-variant": "#4a4455",
                    "inverse-surface": "#213145",
                    "on-secondary-fixed-variant": "#005322",
                    "on-secondary-fixed": "#002109"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "margin-desktop": "48px",
                    "md": "1.5rem",
                    "max-width": "1280px",
                    "sm": "1rem",
                    "base": "4px",
                    "xs": "0.5rem",
                    "xl": "4rem",
                    "gutter": "24px",
                    "margin-mobile": "16px",
                    "lg": "2.5rem"
            },
            "fontFamily": {
                    "headline-lg-mobile": ["Inter"],
                    "body-lg": ["Inter"],
                    "headline-md": ["Inter"],
                    "display-lg": ["Inter"],
                    "caption": ["Inter"],
                    "label-md": ["Inter"],
                    "headline-lg": ["Inter"],
                    "body-md": ["Inter"]
            },
            "fontSize": {
                    "headline-lg-mobile": ["24px", {"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "600"}],
                    "body-lg": ["18px", {"lineHeight": "1.6", "letterSpacing": "0", "fontWeight": "400"}],
                    "headline-md": ["20px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "600"}],
                    "display-lg": ["48px", {"lineHeight": "1.1", "letterSpacing": "0.02em", "fontWeight": "700"}],
                    "caption": ["12px", {"lineHeight": "1.4", "letterSpacing": "0", "fontWeight": "400"}],
                    "label-md": ["14px", {"lineHeight": "1.2", "letterSpacing": "0.04em", "fontWeight": "500"}],
                    "headline-lg": ["32px", {"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "600"}],
                    "body-md": ["16px", {"lineHeight": "1.5", "letterSpacing": "0", "fontWeight": "400"}]
            }
          },
        },
      }
    </script>
<style>
        body { font-family: 'Inter', sans-serif; background-color: #f8f9ff; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .sidebar-item-active { background-color: #f0ebff; color: #5300b7; border-right: 3px solid #5300b7; }
        .glass-panel { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(10px); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc3d7; border-radius: 10px; }
    </style>
</head>
<body class="text-on-surface">
<!-- Top Navigation (Admin Shell) -->
<header class="fixed top-0 w-full z-50 bg-surface dark:bg-surface-container-high border-b border-outline-variant dark:border-outline shadow-sm h-16 flex items-center">
<div class="flex items-center justify-between px-margin-desktop w-full max-w-[1440px] mx-auto">
<div class="flex items-center gap-md">
<span class="text-headline-md font-headline-md font-bold text-primary dark:text-inverse-primary">Admin Panel</span>
<span class="text-label-md font-label-md text-on-surface-variant px-3 py-1 bg-surface-container rounded-full">JB USU Polmed</span>
</div>
<div class="hidden md:flex flex-1 max-w-md mx-8">
<div class="relative w-full">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
<input class="w-full bg-surface-container-low border-none rounded-xl py-2 pl-10 pr-4 text-body-md focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Cari listing, user, atau nomor WA..." type="text"/>
</div>
</div>
<div class="flex items-center gap-sm">
<button class="p-2 rounded-full hover:bg-surface-container-low transition-colors relative">
<span class="material-symbols-outlined text-on-surface-variant">notifications</span>
<span class="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
</button>
<div class="h-8 w-px bg-outline-variant mx-2"></div>
<div class="flex items-center gap-xs cursor-pointer group">
<div class="w-9 h-9 rounded-full overflow-hidden border border-outline-variant">
<img class="w-full h-full object-cover" data-alt="A professional headshot of a young male administrator with a friendly expression, set against a clean, neutral studio background with soft cinematic lighting, embodying modern professionalism and trust for an academic marketplace admin profile." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEq9ESyRua1W7jX7wNWzXwD8EkmX5kTcOzWlnGQ2cGCfcX_5ei9jRbE8uMx5AKj5eb5Mt-6oSqj-TmMZAkP5jogawQRhdAmmYlozga8fB9AwsyIb6jozfVYwx-HcLd_nfs8TaeOyIMQJZmog1KBIvP2bq5tw2LzAlsBBMzSNGPTnTK0kC1K_HBivAx7TuzGYjy-CLDt1UhQsp3I3jyfAIqOl2mcJnCtBakUtshFRzLLPZ4qfe2QsirG_uPKUJM8SJt24NhmhCtAsU"/>
</div>
<div class="hidden md:block">
<p class="text-label-md font-label-md font-bold leading-none">Admin Utama</p>
<p class="text-caption text-on-surface-variant">Super Admin</p>
</div>
<span class="material-symbols-outlined text-on-surface-variant group-hover:translate-y-0.5 transition-transform">expand_more</span>
</div>
</div>
</div>
</header>
<div class="pt-16 flex min-h-screen">
<!-- Sidebar Navigation -->
<aside class="w-64 bg-surface border-r border-outline-variant hidden lg:block sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
<nav class="py-lg px-4 space-y-2">
<a class="sidebar-item-active flex items-center gap-3 px-4 py-3 rounded-lg text-label-md transition-all" href="#">
<span class="material-symbols-outlined">dashboard</span> Dashboard
                </a>
<a class="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-low text-label-md transition-all" href="#">
<span class="material-symbols-outlined">inventory_2</span> Management Listing
                </a>
<a class="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-low text-label-md transition-all" href="#">
<span class="material-symbols-outlined">group</span> Database Mahasiswa
                </a>
<a class="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-low text-label-md transition-all" href="#">
<span class="material-symbols-outlined">payments</span> Laporan Keuangan
                </a>
<div class="py-4 px-4">
<p class="text-[10px] font-bold text-outline uppercase tracking-widest">Moderasi</p>
</div>
<a class="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-low text-label-md transition-all" href="#">
<span class="material-symbols-outlined">verified_user</span> Verifikasi Seller
                    <span class="ml-auto bg-error text-white text-[10px] px-1.5 py-0.5 rounded-full">12</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-low text-label-md transition-all" href="#">
<span class="material-symbols-outlined">block</span> Blacklist WA
                </a>
<a class="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-low text-label-md transition-all" href="#">
<span class="material-symbols-outlined">settings</span> Pengaturan Sistem
                </a>
</nav>
</aside>
<!-- Main Content Area -->
<main class="flex-1 px-4 md:px-lg py-md md:py-lg max-w-[1200px] mx-auto overflow-x-hidden">
<!-- Dashboard Header -->
<div class="mb-lg flex flex-col md:flex-row md:items-end justify-between gap-md">
<div>
<h1 class="text-headline-lg font-headline-lg text-on-surface">Overview Dashboard</h1>
<p class="text-body-md text-on-surface-variant">Selamat datang kembali, Admin. Berikut ringkasan aktivitas marketplace hari ini.</p>
</div>
<div class="flex gap-sm">
<button class="flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-label-md hover:bg-surface-container transition-all">
<span class="material-symbols-outlined text-[20px]">calendar_today</span> 30 Hari Terakhir
                    </button>
<button class="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-label-md hover:opacity-90 active:scale-95 transition-all shadow-sm">
<span class="material-symbols-outlined text-[20px]">file_download</span> Export Laporan
                    </button>
</div>
</div>
<!-- KPI Grid -->
<section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
<div class="bg-surface-container-lowest p-md rounded-xl border border-outline-variant hover:shadow-md transition-all">
<div class="flex items-center justify-between mb-2">
<span class="p-2 bg-primary/10 text-primary rounded-lg material-symbols-outlined">shopping_bag</span>
<span class="text-secondary text-caption flex items-center font-bold">
<span class="material-symbols-outlined text-[14px]">trending_up</span> +12%
                        </span>
</div>
<p class="text-on-surface-variant text-label-md">Total Active Listings</p>
<h3 class="text-headline-lg font-headline-lg mt-1">2,842</h3>
</div>
<div class="bg-surface-container-lowest p-md rounded-xl border border-outline-variant hover:shadow-md transition-all">
<div class="flex items-center justify-between mb-2">
<span class="p-2 bg-secondary/10 text-secondary rounded-lg material-symbols-outlined">payments</span>
<span class="text-secondary text-caption flex items-center font-bold">
<span class="material-symbols-outlined text-[14px]">trending_up</span> +8%
                        </span>
</div>
<p class="text-on-surface-variant text-label-md">Total Fee Collected</p>
<h3 class="text-headline-lg font-headline-lg mt-1">Rp 4.2M</h3>
</div>
<div class="bg-surface-container-lowest p-md rounded-xl border border-outline-variant hover:shadow-md transition-all">
<div class="flex items-center justify-between mb-2">
<span class="p-2 bg-tertiary-container/10 text-tertiary-container rounded-lg material-symbols-outlined">person_add</span>
<span class="text-on-surface-variant text-caption flex items-center">
                            Hari ini
                        </span>
</div>
<p class="text-on-surface-variant text-label-md">New Users Today</p>
<h3 class="text-headline-lg font-headline-lg mt-1">48</h3>
</div>
<div class="bg-surface-container-lowest p-md rounded-xl border border-outline-variant hover:shadow-md transition-all border-l-4 border-l-error">
<div class="flex items-center justify-between mb-2">
<span class="p-2 bg-error/10 text-error rounded-lg material-symbols-outlined">pending_actions</span>
<span class="text-error text-caption font-bold">Urgent</span>
</div>
<p class="text-on-surface-variant text-label-md">Pending Verifications</p>
<h3 class="text-headline-lg font-headline-lg mt-1">12</h3>
</div>
</section>
<!-- Revenue Chart & Category Performance -->
<section class="grid grid-cols-1 lg:grid-cols-3 gap-lg mb-lg">
<div class="lg:col-span-2 bg-surface-container-lowest p-md md:p-lg rounded-xl border border-outline-variant">
<div class="flex items-center justify-between mb-lg">
<h4 class="text-headline-md font-headline-md">Fee Pemasukan (30 Hari)</h4>
<div class="flex gap-2">
<span class="flex items-center gap-1 text-caption text-on-surface-variant"><span class="w-3 h-3 bg-primary rounded-full"></span> Pendapatan</span>
</div>
</div>
<!-- Placeholder for Chart -->
<div class="relative h-64 w-full flex items-end justify-between gap-2 px-2">
<!-- Mockup Bar Chart Bars -->
<div class="w-full bg-primary/20 rounded-t-sm h-[40%] hover:bg-primary transition-all"></div>
<div class="w-full bg-primary/20 rounded-t-sm h-[55%] hover:bg-primary transition-all"></div>
<div class="w-full bg-primary/20 rounded-t-sm h-[45%] hover:bg-primary transition-all"></div>
<div class="w-full bg-primary/20 rounded-t-sm h-[70%] hover:bg-primary transition-all"></div>
<div class="w-full bg-primary/20 rounded-t-sm h-[60%] hover:bg-primary transition-all"></div>
<div class="w-full bg-primary/20 rounded-t-sm h-[85%] hover:bg-primary transition-all"></div>
<div class="w-full bg-primary/20 rounded-t-sm h-[50%] hover:bg-primary transition-all"></div>
<div class="w-full bg-primary/20 rounded-t-sm h-[40%] hover:bg-primary transition-all"></div>
<div class="w-full bg-primary/20 rounded-t-sm h-[65%] hover:bg-primary transition-all"></div>
<div class="w-full bg-primary/20 rounded-t-sm h-[90%] hover:bg-primary transition-all"></div>
<div class="w-full bg-primary/20 rounded-t-sm h-[75%] hover:bg-primary transition-all"></div>
<div class="w-full bg-primary/20 rounded-t-sm h-[60%] hover:bg-primary transition-all"></div>
</div>
<div class="flex justify-between mt-4 text-caption text-on-surface-variant border-t border-outline-variant pt-2">
<span>1 Nov</span>
<span>10 Nov</span>
<span>20 Nov</span>
<span>30 Nov</span>
</div>
</div>
<div class="bg-surface-container-lowest p-md md:p-lg rounded-xl border border-outline-variant flex flex-col">
<h4 class="text-headline-md font-headline-md mb-lg">Category Activity</h4>
<div class="space-y-6 flex-1">
<div>
<div class="flex justify-between text-label-md mb-1">
<span>Buku &amp; Fotokopi</span>
<span class="font-bold">42%</span>
</div>
<div class="h-2 bg-surface-container rounded-full overflow-hidden">
<div class="h-full bg-primary w-[42%]"></div>
</div>
</div>
<div>
<div class="flex justify-between text-label-md mb-1">
<span>Elektronik</span>
<span class="font-bold">28%</span>
</div>
<div class="h-2 bg-surface-container rounded-full overflow-hidden">
<div class="h-full bg-secondary w-[28%]"></div>
</div>
</div>
<div>
<div class="flex justify-between text-label-md mb-1">
<span>Kos &amp; Kontrakan</span>
<span class="font-bold">15%</span>
</div>
<div class="h-2 bg-surface-container rounded-full overflow-hidden">
<div class="h-full bg-tertiary-container w-[15%]"></div>
</div>
</div>
<div>
<div class="flex justify-between text-label-md mb-1">
<span>Lainnya</span>
<span class="font-bold">15%</span>
</div>
<div class="h-2 bg-surface-container rounded-full overflow-hidden">
<div class="h-full bg-outline w-[15%]"></div>
</div>
</div>
</div>
<button class="mt-lg w-full py-2 border border-primary text-primary text-label-md rounded-xl hover:bg-primary/5 transition-colors">Lihat Detail Kategori</button>
</div>
</section>
<!-- Main Management & Actions -->
<div class="grid grid-cols-1 lg:grid-cols-4 gap-lg items-start">
<!-- Recent Listings Table -->
<section class="lg:col-span-3 bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
<div class="p-md border-b border-outline-variant flex items-center justify-between">
<h4 class="text-headline-md font-headline-md">Management Recent Listings</h4>
<div class="flex gap-2">
<select class="text-label-md border-outline-variant rounded-lg focus:ring-primary focus:border-primary">
<option>Semua Status</option>
<option>Active</option>
<option>Sold</option>
<option>Expired</option>
</select>
</div>
</div>
<div class="overflow-x-auto">
<table class="w-full text-left">
<thead class="bg-surface-container-low text-on-surface-variant text-label-md uppercase tracking-wider">
<tr>
<th class="px-6 py-4 font-semibold">Title</th>
<th class="px-6 py-4 font-semibold">Seller</th>
<th class="px-6 py-4 font-semibold">Category</th>
<th class="px-6 py-4 font-semibold">Price</th>
<th class="px-6 py-4 font-semibold">Status</th>
<th class="px-6 py-4 font-semibold text-right">Actions</th>
</tr>
</thead>
<tbody class="divide-y divide-outline-variant text-body-md">
<tr class="hover:bg-surface-container-lowest transition-colors group">
<td class="px-6 py-4 font-medium">Kalkulator Casio FX-991</td>
<td class="px-6 py-4">Budi Santoso (USU)</td>
<td class="px-6 py-4"><span class="px-2 py-1 bg-surface-container text-on-surface-variant rounded-md text-[12px]">Elektronik</span></td>
<td class="px-6 py-4 font-bold">Rp 250.000</td>
<td class="px-6 py-4">
<span class="flex items-center gap-1.5 text-secondary text-label-md font-bold">
<span class="w-1.5 h-1.5 bg-secondary rounded-full"></span> Active
                                        </span>
</td>
<td class="px-6 py-4 text-right">
<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="p-1.5 text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined text-[20px]">visibility</span></button>
<button class="p-1.5 text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined text-[20px]">block</span></button>
<button class="p-1.5 text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined text-[20px]">delete</span></button>
</div>
</td>
</tr>
<tr class="hover:bg-surface-container-lowest transition-colors group">
<td class="px-6 py-4 font-medium">Buku Struktur Data C++</td>
<td class="px-6 py-4">Ani Wijaya (Polmed)</td>
<td class="px-6 py-4"><span class="px-2 py-1 bg-surface-container text-on-surface-variant rounded-md text-[12px]">Buku</span></td>
<td class="px-6 py-4 font-bold">Rp 85.000</td>
<td class="px-6 py-4">
<span class="flex items-center gap-1.5 text-outline text-label-md font-bold">
<span class="w-1.5 h-1.5 bg-outline rounded-full"></span> Sold
                                        </span>
</td>
<td class="px-6 py-4 text-right">
<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="p-1.5 text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined text-[20px]">visibility</span></button>
<button class="p-1.5 text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined text-[20px]">delete</span></button>
</div>
</td>
</tr>
<tr class="hover:bg-surface-container-lowest transition-colors group">
<td class="px-6 py-4 font-medium">Meja Belajar Lipat</td>
<td class="px-6 py-4">Rizky (USU)</td>
<td class="px-6 py-4"><span class="px-2 py-1 bg-surface-container text-on-surface-variant rounded-md text-[12px]">Furniture</span></td>
<td class="px-6 py-4 font-bold">Rp 120.000</td>
<td class="px-6 py-4">
<span class="flex items-center gap-1.5 text-secondary text-label-md font-bold">
<span class="w-1.5 h-1.5 bg-secondary rounded-full"></span> Active
                                        </span>
</td>
<td class="px-6 py-4 text-right">
<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="p-1.5 text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined text-[20px]">visibility</span></button>
<button class="p-1.5 text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined text-[20px]">block</span></button>
<button class="p-1.5 text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined text-[20px]">delete</span></button>
</div>
</td>
</tr>
<tr class="hover:bg-surface-container-lowest transition-colors group border-b-0">
<td class="px-6 py-4 font-medium">Headset Gaming NYK</td>
<td class="px-6 py-4">Desta (USU)</td>
<td class="px-6 py-4"><span class="px-2 py-1 bg-surface-container text-on-surface-variant rounded-md text-[12px]">Elektronik</span></td>
<td class="px-6 py-4 font-bold">Rp 150.000</td>
<td class="px-6 py-4">
<span class="flex items-center gap-1.5 text-error text-label-md font-bold">
<span class="w-1.5 h-1.5 bg-error rounded-full"></span> Expired
                                        </span>
</td>
<td class="px-6 py-4 text-right">
<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="p-1.5 text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined text-[20px]">visibility</span></button>
<button class="p-1.5 text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined text-[20px]">delete</span></button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
<div class="p-4 bg-surface-container-low border-t border-outline-variant flex justify-center">
<button class="text-label-md text-primary font-bold hover:underline">Lihat Semua Listings</button>
</div>
</section>
<!-- Blacklist WA Sidebar -->
<section class="bg-surface-container-lowest p-md md:p-lg rounded-xl border border-outline-variant shadow-sm lg:sticky lg:top-24">
<div class="flex items-center gap-2 mb-lg text-error">
<span class="material-symbols-outlined">gpp_maybe</span>
<h4 class="text-headline-md font-headline-md">Blacklist Nomor WA</h4>
</div>
<form class="space-y-4">
<div>
<label class="block text-label-md text-on-surface-variant mb-1.5">Nomor WhatsApp</label>
<input class="w-full bg-background border-outline-variant rounded-xl py-3 focus:ring-2 focus:ring-error/20 focus:border-error transition-all text-body-md" placeholder="08..." type="text"/>
</div>
<div>
<label class="block text-label-md text-on-surface-variant mb-1.5">Alasan Pemblokiran</label>
<textarea class="w-full bg-background border-outline-variant rounded-xl py-3 focus:ring-2 focus:ring-error/20 focus:border-error transition-all text-body-md" placeholder="Contoh: Spam berulang, penipuan harga..." rows="3"></textarea>
</div>
<button class="w-full py-3 bg-error text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all" type="submit">Submit Blacklist</button>
</form>
<div class="mt-lg pt-lg border-t border-outline-variant">
<p class="text-[10px] font-bold text-outline uppercase tracking-widest mb-3">Terakhir Diblacklist</p>
<div class="space-y-3">
<div class="flex items-center justify-between text-body-md">
<span class="font-medium">0812****4321</span>
<span class="text-caption text-error bg-error/10 px-2 py-0.5 rounded">Scam</span>
</div>
<div class="flex items-center justify-between text-body-md">
<span class="font-medium">0852****9910</span>
<span class="text-caption text-error bg-error/10 px-2 py-0.5 rounded">Spam</span>
</div>
</div>
</div>
</section>
</div>
</main>
</div>
<!-- Footer Component -->
<footer class="w-full mt-auto bg-surface-container-lowest dark:bg-inverse-surface border-t border-outline-variant">
<div class="grid grid-cols-1 md:grid-cols-3 gap-lg px-margin-desktop py-xl max-w-[1200px] mx-auto">
<div>
<span class="text-headline-sm font-headline-sm text-on-surface dark:text-inverse-on-surface block mb-2">Jual Beli USU Polmed</span>
<p class="text-body-sm font-body-sm text-on-surface-variant">© 2024 Jual Beli USU Polmed. Komunitas Jual Beli Mahasiswa Terpercaya.</p>
</div>
<div class="flex flex-col gap-xs">
<p class="text-label-md font-bold mb-2">Tautan Cepat</p>
<a class="text-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Tentang Kami</a>
<a class="text-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Hubungi Admin</a>
<a class="text-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Grup WhatsApp</a>
</div>
<div class="flex flex-col gap-xs">
<p class="text-label-md font-bold mb-2">Bantuan</p>
<a class="text-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Panduan Transaksi</a>
<a class="text-body-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Syarat &amp; Ketentuan</a>
</div>
</div>
</footer>
<script>
        // Micro-interactions and effects
        document.querySelectorAll('button, a').forEach(el => {
            el.addEventListener('click', function(e) {
                if (this.tagName === 'BUTTON' && !this.classList.contains('no-anim')) {
                    this.classList.add('scale-95');
                    setTimeout(() => this.classList.remove('scale-95'), 100);
                }
            });
        });

        // Simple mock search behavior
        const searchInput = document.querySelector('input[type="text"]');
        searchInput.addEventListener('focus', () => {
            searchInput.parentElement.classList.add('ring-2', 'ring-primary/20');
        });
        searchInput.addEventListener('blur', () => {
            searchInput.parentElement.classList.remove('ring-2', 'ring-primary/20');
        });
    </script>
</body></html>

<!-- Cara Bergabung - Jual Beli USU Polmed -->
<!DOCTYPE html>

<html class="light" lang="id"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Cara Bergabung - Jual Beli USU Polmed</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                    "secondary": "#006d2f",
                    "surface-dim": "#cbdbf5",
                    "primary-container": "#6d28d9",
                    "on-surface": "#0b1c30",
                    "on-primary-fixed-variant": "#5b00c5",
                    "surface-container": "#e5eeff",
                    "outline": "#7b7486",
                    "tertiary-container": "#8f4200",
                    "error": "#ba1a1a",
                    "surface": "#f8f9ff",
                    "secondary-fixed": "#66ff8e",
                    "secondary-container": "#5dfd8a",
                    "on-tertiary-fixed": "#321300",
                    "on-surface-variant": "#4a4455",
                    "on-primary-fixed": "#250059",
                    "surface-container-high": "#dce9ff",
                    "on-secondary-container": "#007232",
                    "on-background": "#0b1c30",
                    "surface-container-lowest": "#ffffff",
                    "tertiary-fixed": "#ffdbc8",
                    "inverse-on-surface": "#eaf1ff",
                    "background": "#f8f9ff",
                    "primary": "#5300b7",
                    "surface-bright": "#f8f9ff",
                    "surface-tint": "#7331df",
                    "secondary-fixed-dim": "#3de273",
                    "primary-fixed-dim": "#d3bbff",
                    "on-secondary-fixed-variant": "#005322",
                    "on-tertiary-fixed-variant": "#743400",
                    "on-primary": "#ffffff",
                    "on-error-container": "#93000a",
                    "tertiary": "#6b3000",
                    "surface-container-highest": "#d3e4fe",
                    "primary-fixed": "#ebddff",
                    "on-tertiary": "#ffffff",
                    "on-primary-container": "#dac5ff",
                    "error-container": "#ffdad6",
                    "inverse-primary": "#d3bbff",
                    "on-secondary": "#ffffff",
                    "tertiary-fixed-dim": "#ffb68b",
                    "on-tertiary-container": "#ffc19e",
                    "surface-variant": "#d3e4fe",
                    "surface-container-low": "#eff4ff",
                    "inverse-surface": "#213145",
                    "outline-variant": "#ccc3d7",
                    "on-secondary-fixed": "#002109",
                    "on-error": "#ffffff"
            },
            "borderRadius": {
                    "DEFAULT": "0.25rem",
                    "lg": "0.5rem",
                    "xl": "0.75rem",
                    "full": "9999px"
            },
            "spacing": {
                    "margin-mobile": "16px",
                    "lg": "2.5rem",
                    "max-width": "1280px",
                    "sm": "1rem",
                    "md": "1.5rem",
                    "margin-desktop": "48px",
                    "gutter": "24px",
                    "xl": "4rem",
                    "xs": "0.5rem",
                    "base": "4px"
            },
            "fontFamily": {
                    "label-md": ["Inter"],
                    "display-lg": ["Inter"],
                    "caption": ["Inter"],
                    "body-lg": ["Inter"],
                    "headline-lg": ["Inter"],
                    "headline-md": ["Inter"],
                    "headline-lg-mobile": ["Inter"],
                    "body-md": ["Inter"]
            },
            "fontSize": {
                    "label-md": ["14px", {"lineHeight": "1.2", "letterSpacing": "0.04em", "fontWeight": "500"}],
                    "display-lg": ["48px", {"lineHeight": "1.1", "letterSpacing": "0.02em", "fontWeight": "700"}],
                    "caption": ["12px", {"lineHeight": "1.4", "letterSpacing": "0", "fontWeight": "400"}],
                    "body-lg": ["18px", {"lineHeight": "1.6", "letterSpacing": "0", "fontWeight": "400"}],
                    "headline-lg": ["32px", {"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "600"}],
                    "headline-md": ["20px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "600"}],
                    "headline-lg-mobile": ["24px", {"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "600"}],
                    "body-md": ["16px", {"lineHeight": "1.5", "letterSpacing": "0", "fontWeight": "400"}]
            }
          },
        },
      }
    </script>
<style>
        body { font-family: 'Inter', sans-serif; }
        .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
        .glass-card { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); border: 1px solid #E2E8F0; }
        .step-number { text-shadow: 0 0 20px rgba(109, 40, 217, 0.2); }
    </style>
</head>
<body class="bg-surface text-on-surface">
<!-- TopNavBar -->
<nav class="fixed top-0 w-full z-50 bg-surface dark:bg-surface-container-high border-b border-outline-variant dark:border-outline shadow-sm">
<div class="flex items-center justify-between px-margin-desktop h-16 w-full max-w-[1200px] mx-auto">
<div class="text-headline-md font-headline-md font-bold text-primary dark:text-inverse-primary">
                Jual Beli USU Polmed
            </div>
<div class="hidden md:flex items-center gap-md">
<a class="text-on-surface-variant hover:text-primary transition-colors text-label-md font-label-md" href="#">Kategori</a>
<a class="text-primary font-bold border-b-2 border-primary pb-1 text-label-md font-label-md" href="#">Cara Bergabung</a>
<button class="bg-primary text-on-primary px-6 py-2 rounded-full font-label-md transition-all duration-200 ease-in-out active:scale-95 hover:bg-primary-container">Jual</button>
<div class="flex items-center gap-sm ml-4">
<span class="material-symbols-outlined text-on-surface-variant cursor-pointer">notifications</span>
<span class="material-symbols-outlined text-on-surface-variant cursor-pointer">person</span>
</div>
</div>
</div>
</nav>
<main class="pt-24 pb-xl max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop">
<!-- Hero Header -->
<header class="mb-xl text-center">
<h1 class="text-display-lg font-display-lg text-primary mb-4">Bergabung dengan Komunitas</h1>
<p class="text-body-lg font-body-lg text-on-surface-variant max-w-2xl mx-auto">
                Platform jual beli khusus mahasiswa USU &amp; Polmed. Aman, mudah, dan terpercaya untuk transaksi barang bekas maupun baru di sekitar kampus.
            </p>
</header>
<!-- Bento Grid: Selling & Buying Guide -->
<section class="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-xl">
<!-- How to Sell -->
<div class="md:col-span-7 glass-card rounded-xl p-md flex flex-col gap-md">
<div class="flex items-center gap-sm">
<span class="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">storefront</span>
<h2 class="text-headline-lg font-headline-lg">Cara Berjualan</h2>
</div>
<div class="grid grid-cols-1 sm:grid-cols-2 gap-md mt-4">
<div class="space-y-4">
<div class="flex gap-4">
<span class="text-primary font-bold text-headline-md step-number">01</span>
<div>
<p class="font-bold text-body-md">Siapkan Foto</p>
<p class="text-caption text-on-surface-variant">Ambil foto produk yang jelas dengan pencahayaan yang baik.</p>
</div>
</div>
<div class="flex gap-4">
<span class="text-primary font-bold text-headline-md step-number">02</span>
<div>
<p class="font-bold text-body-md">Klik Tombol "Jual"</p>
<p class="text-caption text-on-surface-variant">Isi detail produk, harga, dan kategori yang sesuai.</p>
</div>
</div>
</div>
<div class="space-y-4">
<div class="flex gap-4">
<span class="text-primary font-bold text-headline-md step-number">03</span>
<div>
<p class="font-bold text-body-md">Verifikasi Akun</p>
<p class="text-caption text-on-surface-variant">Gunakan email kampus atau KTM untuk kepercayaan pembeli.</p>
</div>
</div>
<div class="flex gap-4">
<span class="text-primary font-bold text-headline-md step-number">04</span>
<div>
<p class="font-bold text-body-md">Tunggu Chat</p>
<p class="text-caption text-on-surface-variant">Balas pesan calon pembeli melalui WhatsApp atau pesan platform.</p>
</div>
</div>
</div>
</div>
</div>
<!-- How to Buy -->
<div class="md:col-span-5 bg-primary rounded-xl p-md text-on-primary flex flex-col justify-between">
<div>
<div class="flex items-center gap-sm mb-6">
<span class="material-symbols-outlined bg-white/20 p-2 rounded-lg">shopping_bag</span>
<h2 class="text-headline-lg font-headline-lg">Cara Membeli</h2>
</div>
<ul class="space-y-6">
<li class="flex items-start gap-4">
<div class="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center shrink-0">1</div>
<p class="text-body-md">Cari barang yang kamu butuhkan melalui filter kategori atau bar pencarian.</p>
</li>
<li class="flex items-start gap-4">
<div class="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center shrink-0">2</div>
<p class="text-body-md">Chat penjual untuk tanya stok atau nego harga lewat WhatsApp resmi.</p>
</li>
<li class="flex items-start gap-4">
<div class="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center shrink-0">3</div>
<p class="text-body-md">Lakukan COD di lokasi yang ramai (sekitar kampus) untuk keamanan.</p>
</li>
</ul>
</div>
<div class="mt-8 border-t border-white/20 pt-4">
<p class="text-caption opacity-80">Selalu periksa kondisi barang sebelum melakukan pembayaran.</p>
</div>
</div>
</section>
<!-- Rules & Safety Section -->
<section class="mb-xl grid grid-cols-1 md:grid-cols-2 gap-xl">
<div class="space-y-md">
<h2 class="text-headline-lg font-headline-lg flex items-center gap-sm">
<span class="material-symbols-outlined text-error">gavel</span>
                    Peraturan Platform
                </h2>
<div class="space-y-4">
<div class="p-sm bg-surface-container rounded-xl flex gap-md border border-outline-variant">
<span class="material-symbols-outlined text-error shrink-0">block</span>
<div>
<p class="font-bold text-body-md">Barang Terlarang</p>
<p class="text-caption text-on-surface-variant">Dilarang menjual rokok, miras, obat-obatan terlarang, senjata, dan barang akademik ilegal (jasa joki/skripsi).</p>
</div>
</div>
<div class="p-sm bg-surface-container rounded-xl flex gap-md border border-outline-variant">
<span class="material-symbols-outlined text-secondary shrink-0">verified_user</span>
<div>
<p class="font-bold text-body-md">Keamanan Transaksi</p>
<p class="text-caption text-on-surface-variant">Gunakan sistem COD di area terbuka kampus. Jangan pernah mentransfer uang sebelum melihat barang.</p>
</div>
</div>
<div class="p-sm bg-surface-container rounded-xl flex gap-md border border-outline-variant">
<span class="material-symbols-outlined text-primary shrink-0">campaign</span>
<div>
<p class="font-bold text-body-md">Etika Beriklan</p>
<p class="text-caption text-on-surface-variant">Gunakan foto asli produk sendiri, deskripsi yang jujur, dan update status jika barang sudah terjual.</p>
</div>
</div>
</div>
</div>
<!-- Image/Atmospheric Side -->
<div class="relative rounded-2xl overflow-hidden min-h-[300px]">
<img class="absolute inset-0 w-full h-full object-cover" data-alt="A group of diverse university students sitting together in a modern campus courtyard, interacting with their smartphones and tablets in a bright and airy environment. The lighting is warm and natural, suggesting a safe and friendly community atmosphere. The overall style is clean and professional with a focus on trust and connection within the university ecosystem." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHAgfR-jGVcWudOtRYj9oT0Ass_FgRHLNN2-si_OjZO8JyUcFh_2FFmL12grcnmPr6Ir16Ke3IHZ4iJHQHpK2KuX6mjMlmLo1KKxIL-mFXBNVRGSsJLaRpSr126emrB5RfxSvqZTqI0KFYlnunSq8fgigx-6uVxhSIZ-AIhDzCfepwDcS0Do2JlLgB1nDRAw6wmN5ZGbP9USN0MDIHydrTRbv-2dJIMp94r2ruxRWvMFyca7mapEIKAKeoPSjDBFvVWoE24t8fmvQ"/>
<div class="absolute inset-0 bg-gradient-to-t from-on-surface/80 to-transparent flex items-end p-md">
<p class="text-on-primary font-headline-md">Komunitas Mahasiswa Berintegritas</p>
</div>
</div>
</section>
<!-- Call to Action: WhatsApp & Link -->
<section class="mb-xl text-center py-xl px-md bg-secondary/5 rounded-3xl border-2 border-dashed border-secondary/20">
<h2 class="text-headline-lg font-headline-lg text-secondary mb-2">Gabung WhatsApp Group</h2>
<p class="text-body-md text-on-surface-variant mb-8">Dapatkan update barang terbaru lebih cepat langsung di HP kamu!</p>
<div class="flex flex-col md:flex-row items-center justify-center gap-lg">
<div class="bg-white p-4 rounded-2xl shadow-xl border border-outline-variant">
<img alt="QR Code" class="w-32 h-32" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZT7XsVoLw1fMG8-udo0FBc93Q9GBGfTZ1AVSUhWnqgvy0t3XvKonLVuI4AuN4aZzRBWRgEgjp8EYjbuQktY_-EQmHyGSwh_uk_GLlF3tJqSBrUOUTRik4Pvg4VaKwu5jDALFZjwNfvgBfkckhBIeA2aFTxfZD8WyYCKfFrvKxJRUjOEAU7MHOJLn7nvRs-5KFWK6W3lqB5sNeQnmC50NVCAys-Ic3rMKimBHWRTwexjzw7oWl6r51Z4DtFB2XwNcCwewPK8WHIL8"/>
<p class="text-caption mt-2 font-bold text-on-surface-variant">Scan QR Code</p>
</div>
<div class="flex flex-col gap-md items-center md:items-start">
<a class="flex items-center gap-sm bg-secondary text-on-primary px-8 py-4 rounded-full font-bold hover:shadow-lg transition-all active:scale-95" href="https://bit.ly/jualbeliusupolmed" target="_blank">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">chat</span>
                        bit.ly/jualbeliusupolmed
                    </a>
<p class="text-caption text-on-surface-variant">Atau klik tombol di atas untuk masuk otomatis</p>
</div>
</div>
</section>
<!-- FAQ Section -->
<section class="max-w-3xl mx-auto mb-xl">
<h2 class="text-headline-lg font-headline-lg mb-8 text-center">Sering Ditanyakan (FAQ)</h2>
<div class="space-y-4">
<details class="group glass-card rounded-xl overflow-hidden [&amp;_summary::-webkit-details-marker]:hidden">
<summary class="flex items-center justify-between p-md cursor-pointer list-none">
<h3 class="font-bold text-body-md">Apakah platform ini khusus mahasiswa USU &amp; Polmed?</h3>
<span class="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
</summary>
<div class="p-md pt-0 text-on-surface-variant text-body-md border-t border-outline-variant/30">
                        Ya, platform ini diutamakan untuk sivitas akademika USU dan Polmed untuk mempermudah transaksi antar mahasiswa dan memastikan keamanan karena kedekatan lokasi.
                    </div>
</details>
<details class="group glass-card rounded-xl overflow-hidden [&amp;_summary::-webkit-details-marker]:hidden">
<summary class="flex items-center justify-between p-md cursor-pointer list-none">
<h3 class="font-bold text-body-md">Bagaimana jika terjadi penipuan?</h3>
<span class="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
</summary>
<div class="p-md pt-0 text-on-surface-variant text-body-md border-t border-outline-variant/30">
                        Kami sangat menyarankan sistem COD (Cash On Delivery). Jika terjadi masalah, segera laporkan admin grup WhatsApp atau gunakan fitur report di platform dengan bukti yang jelas.
                    </div>
</details>
<details class="group glass-card rounded-xl overflow-hidden [&amp;_summary::-webkit-details-marker]:hidden">
<summary class="flex items-center justify-between p-md cursor-pointer list-none">
<h3 class="font-bold text-body-md">Apakah ada biaya admin untuk berjualan?</h3>
<span class="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
</summary>
<div class="p-md pt-0 text-on-surface-variant text-body-md border-t border-outline-variant/30">
                        Saat ini layanan Jual Beli USU Polmed sepenuhnya GRATIS untuk seluruh mahasiswa. Tidak ada biaya pendaftaran atau potongan komisi penjualan.
                    </div>
</details>
</div>
</section>
</main>
<!-- Footer -->
<footer class="w-full mt-auto bg-surface-container-lowest dark:bg-inverse-surface border-t border-outline-variant">
<div class="grid grid-cols-1 md:grid-cols-3 gap-lg px-margin-desktop py-xl max-w-[1200px] mx-auto">
<div>
<div class="text-headline-sm font-headline-sm text-on-surface dark:text-inverse-on-surface mb-4">
                    Jual Beli USU Polmed
                </div>
<p class="text-body-sm font-body-sm text-on-surface-variant">© 2024 Jual Beli USU Polmed. Komunitas Jual Beli Mahasiswa Terpercaya.</p>
</div>
<div>
<h4 class="font-bold mb-4">Navigasi</h4>
<div class="flex flex-col gap-2">
<a class="text-label-sm font-label-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Tentang Kami</a>
<a class="text-label-sm font-label-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Hubungi Admin</a>
<a class="text-label-sm font-label-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Grup WhatsApp</a>
</div>
</div>
<div>
<h4 class="font-bold mb-4">Legal &amp; Support</h4>
<div class="flex flex-col gap-2">
<a class="text-label-sm font-label-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Panduan Transaksi</a>
<a class="text-label-sm font-label-sm text-on-surface-variant hover:text-primary hover:underline transition-all" href="#">Syarat &amp; Ketentuan</a>
</div>
</div>
</div>
</footer>
<script>
        // Micro-interaction for accordions
        document.querySelectorAll('details').forEach((el) => {
            el.addEventListener('toggle', (event) => {
                if (el.open) {
                    document.querySelectorAll('details').forEach((otherEl) => {
                        if (otherEl !== el) otherEl.open = false;
                    });
                }
            });
        });
    </script>
</body></html>

<!-- Admin - Management Listing -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Management Listing | Jual Beli USU Polmed</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
      tailwind.config = {
        darkMode: "class",
        theme: {
          extend: {
            "colors": {
                "outline": "#7b7486",
                "on-secondary-container": "#007232",
                "on-primary": "#ffffff",
                "tertiary-fixed-dim": "#ffb68b",
                "surface-container-high": "#dce9ff",
                "inverse-on-surface": "#eaf1ff",
                "secondary-fixed-dim": "#3de273",
                "surface-variant": "#d3e4fe",
                "surface-container-lowest": "#ffffff",
                "on-background": "#0b1c30",
                "primary": "#5300b7",
                "surface-bright": "#f8f9ff",
                "surface-dim": "#cbdbf5",
                "on-tertiary": "#ffffff",
                "tertiary-fixed": "#ffdbc8",
                "on-error-container": "#93000a",
                "surface-container-low": "#eff4ff",
                "secondary": "#006d2f",
                "surface-container": "#e5eeff",
                "surface": "#f8f9ff",
                "on-tertiary-fixed": "#321300",
                "inverse-surface": "#213145",
                "inverse-primary": "#d3bbff",
                "on-error": "#ffffff",
                "primary-fixed-dim": "#d3bbff",
                "on-primary-fixed": "#250059",
                "on-tertiary-fixed-variant": "#743400",
                "outline-variant": "#ccc3d7",
                "error-container": "#ffdad6",
                "on-surface-variant": "#4a4455",
                "on-primary-container": "#dac5ff",
                "on-secondary": "#ffffff",
                "primary-container": "#6d28d9",
                "on-secondary-fixed-variant": "#005322",
                "on-tertiary-container": "#ffc19e",
                "on-surface": "#0b1c30",
                "error": "#ba1a1a",
                "secondary-fixed": "#66ff8e",
                "secondary-container": "#5dfd8a",
                "tertiary-container": "#8f4200",
                "tertiary": "#6b3000",
                "primary-fixed": "#ebddff",
                "on-primary-fixed-variant": "#5b00c5",
                "on-secondary-fixed": "#002109",
                "surface-tint": "#7331df",
                "surface-container-highest": "#d3e4fe",
                "background": "#f8f9ff"
            },
            "borderRadius": {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
            "spacing": {
                "xs": "0.5rem",
                "max-width": "1280px",
                "margin-desktop": "48px",
                "gutter": "24px",
                "lg": "2.5rem",
                "base": "4px",
                "margin-mobile": "16px",
                "xl": "4rem",
                "sm": "1rem",
                "md": "1.5rem"
            },
            "fontFamily": {
                "headline-lg-mobile": ["Inter"],
                "headline-md": ["Inter"],
                "headline-lg": ["Inter"],
                "caption": ["Inter"],
                "body-md": ["Inter"],
                "label-md": ["Inter"],
                "display-lg": ["Inter"],
                "body-lg": ["Inter"]
            },
            "fontSize": {
                "headline-lg-mobile": ["24px", {"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "600"}],
                "headline-md": ["20px", {"lineHeight": "1.4", "letterSpacing": "0.01em", "fontWeight": "600"}],
                "headline-lg": ["32px", {"lineHeight": "1.2", "letterSpacing": "0.01em", "fontWeight": "600"}],
                "caption": ["12px", {"lineHeight": "1.4", "letterSpacing": "0", "fontWeight": "400"}],
                "body-md": ["16px", {"lineHeight": "1.5", "letterSpacing": "0", "fontWeight": "400"}],
                "label-md": ["14px", {"lineHeight": "1.2", "letterSpacing": "0.04em", "fontWeight": "500"}],
                "display-lg": ["48px", {"lineHeight": "1.1", "letterSpacing": "0.02em", "fontWeight": "700"}],
                "body-lg": ["18px", {"lineHeight": "1.6", "letterSpacing": "0", "fontWeight": "400"}]
            }
          },
        },
      }
    </script>
<style>
        body { font-family: 'Inter', sans-serif; }
        .sidebar-active {
            @apply bg-primary-container text-white;
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
        }
        /* Custom scrollbar for clean UI */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ccc3d7; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #7b7486; }
    </style>
</head>
<body class="bg-background text-on-surface flex min-h-screen">
<!-- Sidebar Navigation -->
<aside class="hidden md:flex flex-col w-64 bg-surface border-r border-outline-variant fixed h-full z-40">
<div class="px-6 h-16 flex items-center border-b border-outline-variant">
<span class="text-headline-md font-bold text-primary">Jual Beli USU Polmed</span>
</div>
<nav class="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
<a class="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-all" href="#">
<span class="material-symbols-outlined">dashboard</span>
<span class="font-label-md text-label-md">Dashboard</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-container text-white shadow-md transition-all" href="#">
<span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">inventory_2</span>
<span class="font-label-md text-label-md">Management Listing</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-all" href="#">
<span class="material-symbols-outlined">group</span>
<span class="font-label-md text-label-md">Users</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-all" href="#">
<span class="material-symbols-outlined">category</span>
<span class="font-label-md text-label-md">Kategori</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-all" href="#">
<span class="material-symbols-outlined">report</span>
<span class="font-label-md text-label-md">Reports</span>
</a>
<div class="pt-4 mt-4 border-t border-outline-variant">
<a class="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-low transition-all" href="#">
<span class="material-symbols-outlined">settings</span>
<span class="font-label-md text-label-md">Settings</span>
</a>
</div>
</nav>
<div class="p-4 border-t border-outline-variant">
<div class="flex items-center gap-3 px-4 py-2">
<img alt="Admin Profile" class="w-10 h-10 rounded-full object-cover" data-alt="A professional headshot of a young male administrator in a brightly lit, modern office environment. He is wearing a minimalist dark shirt, and the background features clean, blurred architectural lines of a university campus. The lighting is soft and airy, emphasizing a reliable and modern management persona." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4wfEDuERf3zLhj3aDJmqV2-fOeGa852-Rf4TOeusAYVFrzynWRhapJi46iE0opd11_804RDFDTgFUmRB9Dra0ODfP1GLbuu_q6wmce0oNcMTRqpEhnIk9kzvbEgHLFH63O9x-gfVt77wIYENOI5MnqakgfI9s9wwQfuXTqmgTHXyku0gLzeptt-36IMh_u91oNKnFSsojHmLDgb0rO1VXeDT6Qq70EO_aWTS5KdNKKOk43InSOERY9gK88Ep2QJJyof3sczlbRW0"/>
<div class="flex flex-col">
<span class="font-label-md text-label-md font-bold">Admin Utama</span>
<span class="text-caption text-on-surface-variant">Administrator</span>
</div>
</div>
</div>
</aside>
<!-- Main Content Area -->
<main class="flex-1 md:ml-64 flex flex-col">
<!-- Header -->
<header class="h-16 flex items-center justify-between px-margin-desktop bg-surface sticky top-0 z-30 shadow-sm">
<h1 class="text-headline-md font-headline-md text-on-surface">Management Listing</h1>
<div class="flex items-center gap-4">
<button class="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full transition-all">
<span class="material-symbols-outlined">notifications</span>
</button>
<button class="bg-primary-container text-white px-6 py-2 rounded-full font-label-md text-label-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
<span class="material-symbols-outlined text-[20px]">add</span>
                    Jual Produk
                </button>
</div>
</header>
<!-- Content Canvas -->
<div class="p-margin-desktop space-y-md">
<!-- Filters & Bulk Actions -->
<div class="bg-white p-4 rounded-xl border border-outline-variant shadow-sm space-y-4">
<div class="flex flex-wrap items-center justify-between gap-4">
<div class="flex flex-wrap items-center gap-3">
<div class="relative w-full md:w-80">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
<input class="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-body-md transition-all" placeholder="Cari judul atau nama penjual..." type="text"/>
</div>
<select class="bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-body-md focus:ring-2 focus:ring-primary">
<option>Semua Kategori</option>
<option>Buku &amp; Alat Tulis</option>
<option>Elektronik</option>
<option>Fashion Mahasiswa</option>
<option>Kos &amp; Akomodasi</option>
</select>
<select class="bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2 text-body-md focus:ring-2 focus:ring-primary">
<option>Semua Status</option>
<option>Active</option>
<option>Pending</option>
<option>Sold</option>
<option>Expired</option>
</select>
</div>
<div class="flex items-center gap-2">
<button class="text-on-surface-variant font-label-md text-label-md px-4 py-2 hover:bg-surface-container-low rounded-lg transition-all border border-transparent hover:border-outline-variant">
                            Reset Filter
                        </button>
</div>
</div>
<div class="flex items-center gap-3 py-2 border-t border-outline-variant opacity-50 pointer-events-none transition-all" id="bulk-actions">
<span class="text-caption font-medium text-on-surface-variant uppercase tracking-wider">Aksi Masal:</span>
<button class="flex items-center gap-1 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-label-md hover:bg-opacity-80 transition-all">
<span class="material-symbols-outlined text-[18px]">check_circle</span>
                        Tandai Terjual
                    </button>
<button class="flex items-center gap-1 px-3 py-1 bg-error-container text-on-error-container rounded-full text-label-md hover:bg-opacity-80 transition-all">
<span class="material-symbols-outlined text-[18px]">delete</span>
                        Hapus Terpilih
                    </button>
</div>
</div>
<!-- Data Table Container -->
<div class="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
<div class="overflow-x-auto">
<table class="w-full text-left border-collapse">
<thead>
<tr class="bg-surface-container-low border-b border-outline-variant">
<th class="p-4 w-12 text-center">
<input class="rounded border-outline text-primary focus:ring-primary" id="select-all" type="checkbox"/>
</th>
<th class="p-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Product ID</th>
<th class="p-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Title</th>
<th class="p-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Seller</th>
<th class="p-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Category</th>
<th class="p-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Price</th>
<th class="p-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider">Status</th>
<th class="p-4 text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
</tr>
</thead>
<tbody class="divide-y divide-outline-variant">
<!-- Row 1 -->
<tr class="hover:bg-surface-bright transition-colors group">
<td class="p-4 text-center">
<input class="listing-checkbox rounded border-outline text-primary focus:ring-primary" type="checkbox"/>
</td>
<td class="p-4 font-mono text-caption text-on-surface-variant">#USU-9921</td>
<td class="p-4">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-highest">
<img alt="Product" class="w-full h-full object-cover" data-alt="A stack of modern hardcover university textbooks on a clean, light-colored desk. The lighting is crisp and natural, highlighting the textures of the book covers against a minimalist academic backdrop. The color scheme is soft and professional with purple accents." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAH0MSLsG3fJ0QY82CT-s1CDkPLVlpRb0bUhwQKBm4MjLJ0NRPYlztnO4pOPsCKv3jHxuz0lcEH4pFtEN8B8XV2aBeYSNjnbFyyTrJZPq_0UXbCHlrFhpQpanI7ufPRg9YJAcBnVZzHtml_wmyNJTffG1beHYEs8INE0FX2E0jUWsJYtjbYIcgMgm8lQcRDfdfoOMob8TujE6mCYcJ6tZEeRbZJIpYG1XNxWzvzZWjTWnGP0OqEpRUrCdE_WNvcgvH7OZ_mA0HtoAU"/>
</div>
<span class="font-medium text-body-md">Kalkulus Edisi 9 - Purcell</span>
</div>
</td>
<td class="p-4">
<div class="flex flex-col">
<span class="text-body-md font-medium">Budi Santoso</span>
<a class="text-caption text-on-secondary-container flex items-center gap-1 hover:underline" href="https://wa.me/62812345678">
<span class="material-symbols-outlined text-[14px]">chat</span>
                                            +62 812-3456-78
                                        </a>
</div>
</td>
<td class="p-4">
<span class="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-caption">Buku</span>
</td>
<td class="p-4 font-bold text-body-md text-primary">Rp 120.000</td>
<td class="p-4">
<span class="inline-flex items-center gap-1 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-caption font-bold">
<span class="w-2 h-2 rounded-full bg-secondary"></span>
                                        Active
                                    </span>
</td>
<td class="p-4 text-right">
<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="p-2 text-on-surface-variant hover:bg-primary-container hover:text-white rounded-lg transition-all" title="View"><span class="material-symbols-outlined">visibility</span></button>
<button class="p-2 text-on-surface-variant hover:bg-primary-container hover:text-white rounded-lg transition-all" title="Edit"><span class="material-symbols-outlined">edit</span></button>
<button class="p-2 text-on-surface-variant hover:bg-error hover:text-white rounded-lg transition-all" title="Delete"><span class="material-symbols-outlined">delete</span></button>
</div>
</td>
</tr>
<!-- Row 2 -->
<tr class="hover:bg-surface-bright transition-colors group">
<td class="p-4 text-center">
<input class="listing-checkbox rounded border-outline text-primary focus:ring-primary" type="checkbox"/>
</td>
<td class="p-4 font-mono text-caption text-on-surface-variant">#USU-9920</td>
<td class="p-4">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-highest">
<img alt="Laptop" class="w-full h-full object-cover" data-alt="A sleek, modern silver laptop sitting on a white minimalist workspace. A small green plant and a purple notebook are nearby. The scene is illuminated by soft morning light, creating a clean and productive atmosphere suited for a high-end tech marketplace." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTBlIMQZFr5f5f4VOrryz8tW245AzoqOTFQt5Et1IQbFJBpZTRc3WUrezk4EeeI0b4dNBvstqHNRsENgLxBpMyuuUxXautm5O9ZEqSV1_J-FZrIc5Z7rnRn5ZtEk2JqemMX4COGQ_HBVqdIvRjw-c5orW8mqyRse5l6HtxpADh8GfG0uYwwM9Z8h7vjjs7umzSh-5gNA2xGfQT21mJHQYx-1ziR0PQFoFKXh9Al_N6fYfTD6gexXpNfcy9mM-KyFrbriIX0IBCVLc"/>
</div>
<span class="font-medium text-body-md">MacBook Air M1 2020</span>
</div>
</td>
<td class="p-4">
<div class="flex flex-col">
<span class="text-body-md font-medium">Siti Aminah</span>
<a class="text-caption text-on-secondary-container flex items-center gap-1 hover:underline" href="#">
<span class="material-symbols-outlined text-[14px]">chat</span>
                                            +62 899-7722-11
                                        </a>
</div>
</td>
<td class="p-4">
<span class="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-caption">Elektronik</span>
</td>
<td class="p-4 font-bold text-body-md text-primary">Rp 9.500.000</td>
<td class="p-4">
<span class="inline-flex items-center gap-1 bg-surface-container-low text-on-surface-variant px-3 py-1 rounded-full text-caption font-bold">
<span class="w-2 h-2 rounded-full bg-outline"></span>
                                        Sold
                                    </span>
</td>
<td class="p-4 text-right">
<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="p-2 text-on-surface-variant hover:bg-primary-container hover:text-white rounded-lg transition-all" title="View"><span class="material-symbols-outlined">visibility</span></button>
<button class="p-2 text-on-surface-variant hover:bg-primary-container hover:text-white rounded-lg transition-all" title="Edit"><span class="material-symbols-outlined">edit</span></button>
<button class="p-2 text-on-surface-variant hover:bg-error hover:text-white rounded-lg transition-all" title="Delete"><span class="material-symbols-outlined">delete</span></button>
</div>
</td>
</tr>
<!-- Row 3 -->
<tr class="hover:bg-surface-bright transition-colors group">
<td class="p-4 text-center">
<input class="listing-checkbox rounded border-outline text-primary focus:ring-primary" type="checkbox"/>
</td>
<td class="p-4 font-mono text-caption text-on-surface-variant">#USU-9919</td>
<td class="p-4">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-highest text-on-surface-variant flex items-center justify-center">
<span class="material-symbols-outlined">image</span>
</div>
<span class="font-medium text-body-md">Kipas Angin Portable</span>
</div>
</td>
<td class="p-4">
<div class="flex flex-col">
<span class="text-body-md font-medium">Andi Wijaya</span>
<a class="text-caption text-on-secondary-container flex items-center gap-1 hover:underline" href="#">
<span class="material-symbols-outlined text-[14px]">chat</span>
                                            +62 821-2233-44
                                        </a>
</div>
</td>
<td class="p-4">
<span class="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-caption">Elektronik</span>
</td>
<td class="p-4 font-bold text-body-md text-primary">Rp 45.000</td>
<td class="p-4">
<span class="inline-flex items-center gap-1 bg-tertiary-fixed text-on-tertiary-fixed-variant px-3 py-1 rounded-full text-caption font-bold">
<span class="w-2 h-2 rounded-full bg-tertiary"></span>
                                        Pending
                                    </span>
</td>
<td class="p-4 text-right">
<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="p-2 text-on-surface-variant hover:bg-primary-container hover:text-white rounded-lg transition-all" title="View"><span class="material-symbols-outlined">visibility</span></button>
<button class="p-2 text-on-surface-variant hover:bg-primary-container hover:text-white rounded-lg transition-all" title="Edit"><span class="material-symbols-outlined">edit</span></button>
<button class="p-2 text-on-surface-variant hover:bg-error hover:text-white rounded-lg transition-all" title="Delete"><span class="material-symbols-outlined">delete</span></button>
</div>
</td>
</tr>
<!-- Row 4 -->
<tr class="hover:bg-surface-bright transition-colors group">
<td class="p-4 text-center">
<input class="listing-checkbox rounded border-outline text-primary focus:ring-primary" type="checkbox"/>
</td>
<td class="p-4 font-mono text-caption text-on-surface-variant">#USU-9918</td>
<td class="p-4">
<div class="flex items-center gap-3">
<div class="w-10 h-10 rounded-lg overflow-hidden bg-surface-container-highest">
<img alt="Watch" class="w-full h-full object-cover" data-alt="A minimalist white analog wristwatch with a silver frame, placed on a light grey textured surface. The image is bright and clean with a premium, high-tech aesthetic. Subtle purple light reflections on the glass surface tie it into the brand identity." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBx-zG7MRa7uOdQwURlTBgFVCMgNTJWjz_LB-LC9OZsoRE5jsBjdVdxhMp0mfVEQlvX5awLkpoPOwUiu1NPf9xYnMq77j_90DxRwSGPAbCjwF2_EpT9H4Nog9lbBuwXcF5saUvbpD9kqrl1qkfUEJJS1HSUk9OvNzCrTea_f2rg6uW-1MwNBDNCiQSTGddiAGRkTmAGwNaNjQuvCwgxcn0LkRxK7dlOHI1A9YwOHGFn1_VIkZYMW3Hyca2Y9ty3Scz6pZthvXawZ6k"/>
</div>
<span class="font-medium text-body-md">Smartwatch Gen 2</span>
</div>
</td>
<td class="p-4">
<div class="flex flex-col">
<span class="text-body-md font-medium">Reza Pratama</span>
<a class="text-caption text-on-secondary-container flex items-center gap-1 hover:underline" href="#">
<span class="material-symbols-outlined text-[14px]">chat</span>
                                            +62 856-1122-33
                                        </a>
</div>
</td>
<td class="p-4">
<span class="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-caption">Elektronik</span>
</td>
<td class="p-4 font-bold text-body-md text-primary">Rp 350.000</td>
<td class="p-4">
<span class="inline-flex items-center gap-1 bg-error-container text-on-error-container px-3 py-1 rounded-full text-caption font-bold">
<span class="w-2 h-2 rounded-full bg-error"></span>
                                        Expired
                                    </span>
</td>
<td class="p-4 text-right">
<div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button class="p-2 text-on-surface-variant hover:bg-primary-container hover:text-white rounded-lg transition-all" title="View"><span class="material-symbols-outlined">visibility</span></button>
<button class="p-2 text-on-surface-variant hover:bg-primary-container hover:text-white rounded-lg transition-all" title="Edit"><span class="material-symbols-outlined">edit</span></button>
<button class="p-2 text-on-surface-variant hover:bg-error hover:text-white rounded-lg transition-all" title="Delete"><span class="material-symbols-outlined">delete</span></button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
<!-- Pagination -->
<div class="p-4 flex items-center justify-between bg-surface-container-low border-t border-outline-variant">
<span class="text-caption text-on-surface-variant">Menampilkan 1-10 dari 45 listings</span>
<div class="flex items-center gap-1">
<button class="p-2 rounded-lg hover:bg-surface-container-high transition-all disabled:opacity-30" disabled="">
<span class="material-symbols-outlined">chevron_left</span>
</button>
<button class="w-8 h-8 rounded-lg bg-primary text-white text-caption font-bold">1</button>
<button class="w-8 h-8 rounded-lg hover:bg-surface-container-high text-caption transition-all">2</button>
<button class="w-8 h-8 rounded-lg hover:bg-surface-container-high text-caption transition-all">3</button>
<button class="p-2 rounded-lg hover:bg-surface-container-high transition-all">
<span class="material-symbols-outlined">chevron_right</span>
</button>
</div>
</div>
</div>
</div>
<!-- Footer -->
<footer class="w-full mt-auto bg-surface-container-lowest border-t border-outline-variant py-8 px-margin-desktop">
<div class="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-lg">
<div class="space-y-4">
<h2 class="text-headline-sm font-headline-sm text-on-surface">Jual Beli USU Polmed</h2>
<p class="text-body-sm text-on-surface-variant leading-relaxed">Platform marketplace khusus mahasiswa untuk memfasilitasi transaksi aman dan terpercaya di lingkungan kampus.</p>
</div>
<div class="space-y-4">
<h3 class="font-bold text-label-md uppercase tracking-widest text-on-surface-variant">Links Cepat</h3>
<ul class="space-y-2">
<li><a class="text-body-sm text-on-surface-variant hover:text-primary transition-all underline-offset-4 hover:underline" href="#">Tentang Kami</a></li>
<li><a class="text-body-sm text-on-surface-variant hover:text-primary transition-all underline-offset-4 hover:underline" href="#">Panduan Transaksi</a></li>
<li><a class="text-body-sm text-on-surface-variant hover:text-primary transition-all underline-offset-4 hover:underline" href="#">Syarat &amp; Ketentuan</a></li>
</ul>
</div>
<div class="space-y-4">
<h3 class="font-bold text-label-md uppercase tracking-widest text-on-surface-variant">Bantuan Admin</h3>
<ul class="space-y-2">
<li><a class="text-body-sm text-on-surface-variant hover:text-primary transition-all underline-offset-4 hover:underline" href="#">Grup WhatsApp</a></li>
<li><a class="text-body-sm text-on-surface-variant hover:text-primary transition-all underline-offset-4 hover:underline" href="#">Lapor Bug</a></li>
</ul>
</div>
</div>
<div class="max-w-[1200px] mx-auto mt-8 pt-6 border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4">
<p class="text-caption text-on-surface-variant">© 2024 Jual Beli USU Polmed. Komunitas Jual Beli Mahasiswa Terpercaya.</p>
<div class="flex gap-4">
<span class="w-2 h-2 rounded-full bg-secondary"></span>
<span class="text-caption text-secondary font-medium">System Online</span>
</div>
</div>
</footer>
</main>
<script>
        // Micro-interactions and Bulk Action handling
        const selectAll = document.getElementById('select-all');
        const checkboxes = document.querySelectorAll('.listing-checkbox');
        const bulkActions = document.getElementById('bulk-actions');

        function updateBulkActionsState() {
            const anyChecked = Array.from(checkboxes).some(cb => cb.checked);
            if (anyChecked) {
                bulkActions.classList.remove('opacity-50', 'pointer-events-none');
            } else {
                bulkActions.classList.add('opacity-50', 'pointer-events-none');
            }
        }

        selectAll?.addEventListener('change', (e) => {
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
            });
            updateBulkActionsState();
        });

        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                updateBulkActionsState();
                if (!cb.checked) {
                    selectAll.checked = false;
                } else if (Array.from(checkboxes).every(c => c.checked)) {
                    selectAll.checked = true;
                }
            });
        });

        // Search highlight interaction
        const searchInput = document.querySelector('input[type="text"]');
        searchInput?.addEventListener('focus', () => {
            searchInput.parentElement.classList.add('ring-2', 'ring-primary/20');
        });
        searchInput?.addEventListener('blur', () => {
            searchInput.parentElement.classList.remove('ring-2', 'ring-primary/20');
        });
    </script>
</body></html>

<!-- Admin - Database Mahasiswa -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Database Mahasiswa - Jual Beli USU Polmed Admin</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "outline": "#7b7486",
                        "on-secondary-container": "#007232",
                        "on-primary": "#ffffff",
                        "tertiary-fixed-dim": "#ffb68b",
                        "surface-container-high": "#dce9ff",
                        "inverse-on-surface": "#eaf1ff",
                        "secondary-fixed-dim": "#3de273",
                        "surface-variant": "#d3e4fe",
                        "surface-container-lowest": "#ffffff",
                        "on-background": "#0b1c30",
                        "primary": "#5300b7",
                        "surface-bright": "#f8f9ff",
                        "surface-dim": "#cbdbf5",
                        "on-tertiary": "#ffffff",
                        "tertiary-fixed": "#ffdbc8",
                        "on-error-container": "#93000a",
                        "surface-container-low": "#eff4ff",
                        "secondary": "#006d2f",
                        "surface-container": "#e5eeff",
                        "surface": "#f8f9ff",
                        "on-tertiary-fixed": "#321300",
                        "inverse-surface": "#213145",
                        "inverse-primary": "#d3bbff",
                        "on-error": "#ffffff",
                        "primary-fixed-dim": "#d3bbff",
                        "on-primary-fixed": "#250059",
                        "on-tertiary-fixed-variant": "#743400",
                        "outline-variant": "#ccc3d7",
                        "error-container": "#ffdad6",
                        "on-surface-variant": "#4a4455",
                        "on-primary-container": "#dac5ff",
                        "on-secondary": "#ffffff",
                        "primary-container": "#6d28d9",
                        "on-secondary-fixed-variant": "#005322",
                        "on-tertiary-container": "#ffc19e",
                        "on-surface": "#0b1c30",
                        "error": "#ba1a1a",
                        "secondary-fixed": "#66ff8e",
                        "secondary-container": "#5dfd8a",
                        "tertiary-container": "#8f4200",
                        "tertiary": "#6b3000",
                        "primary-fixed": "#ebddff",
                        "on-primary-fixed-variant": "#5b00c5",
                        "on-secondary-fixed": "#002109",
                        "surface-tint": "#7331df",
                        "surface-container-highest": "#d3e4fe",
                        "background": "#f8f9ff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "xs": "0.5rem",
                        "max-width": "1280px",
                        "margin-desktop": "48px",
                        "gutter": "24px",
                        "lg": "2.5rem",
                        "base": "4px",
                        "margin-mobile": "16px",
                        "xl": "4rem",
                        "sm": "1rem",
                        "md": "1.5rem"
                    },
                    "fontFamily": {
                        "headline-lg-mobile": ["Inter"],
                        "headline-md": ["Inter"],
                        "headline-lg": ["Inter"],
                        "caption": ["Inter"],
                        "body-md": ["Inter"],
                        "label-md": ["Inter"],
                        "display-lg": ["Inter"],
                        "body-lg": ["Inter"]
                    }
                }
            }
        }
    </script>
<style>
        body { font-family: 'Inter', sans-serif; }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="bg-background text-on-surface flex min-h-screen">
<!-- Sidebar Navigation -->
<aside class="w-64 bg-surface-container-low border-r border-outline-variant flex flex-col fixed h-full z-40">
<div class="px-6 h-16 flex items-center">
<span class="text-headline-md font-bold text-primary">Jual Beli Admin</span>
</div>
<nav class="flex-1 px-4 py-6 space-y-2">
<a class="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-highest transition-colors" href="#">
<span class="material-symbols-outlined">dashboard</span>
<span class="text-label-md">Dashboard</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-container text-on-primary-container font-bold shadow-sm" href="#">
<span class="material-symbols-outlined">groups</span>
<span class="text-label-md">Database Mahasiswa</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-highest transition-colors" href="#">
<span class="material-symbols-outlined">inventory_2</span>
<span class="text-label-md">Semua Listings</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-highest transition-colors" href="#">
<span class="material-symbols-outlined">payments</span>
<span class="text-label-md">Transaksi</span>
</a>
<a class="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-highest transition-colors" href="#">
<span class="material-symbols-outlined">report</span>
<span class="text-label-md">Laporan</span>
</a>
</nav>
<div class="p-4 border-t border-outline-variant">
<div class="flex items-center gap-3 px-2">
<img alt="Admin" class="w-10 h-10 rounded-full border border-outline-variant" data-alt="A close-up portrait of a professional young man with a friendly expression, wearing a minimalist white shirt in a clean office environment. The lighting is soft and natural, emphasizing a high-trust, modern administrative look. The background is a blurred university setting with neutral tones and soft purple accents consistent with the brand identity." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZ4EMA0AR1vWS3Qgs2jbFtEeMgICYqeSXpKVulrx65hpkqu7Mcj0zelyf7AJCRvxwxWds9zIjUJX8y004CiWpg4qGIbBZiXaiQ0U02ikxCDMEX4vIvaDquRlTSXDEWl8ayqHs0VROyDBfFoTUqXYhywgv6ZUMYumUt9Il1G4qSnD5hOLH0QbHeVXWSxjkA9aTAU4mXVig01LSQcSO6ieUIcFJuWf2z0mNqhJqZCDQJfaKud8XTx9nXPAyvkU-Vbb5zn8q7ogW2rqo"/>
<div class="overflow-hidden">
<p class="text-label-md font-bold truncate">Admin USU</p>
<p class="text-caption text-on-surface-variant truncate">Super Admin</p>
</div>
</div>
</div>
</aside>
<!-- Main Content Canvas -->
<main class="flex-1 ml-64 flex flex-col min-h-screen">
<!-- Header / Top Bar -->
<header class="h-16 bg-surface flex items-center justify-between px-margin-desktop sticky top-0 z-30 shadow-sm">
<div class="flex items-center gap-4">
<h1 class="text-headline-md font-headline-md text-on-surface">Database Mahasiswa</h1>
<span class="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-caption">1,248 Registered</span>
</div>
<div class="flex items-center gap-4">
<div class="relative flex items-center">
<span class="material-symbols-outlined absolute left-3 text-outline">search</span>
<input class="pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-80 transition-all" placeholder="Search by name or WA number..." type="text"/>
</div>
<button class="material-symbols-outlined p-2 text-on-surface-variant hover:bg-surface-container-highest rounded-full transition-all">notifications</button>
<button class="bg-primary text-on-primary px-6 py-2 rounded-xl text-label-md font-bold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95">
<span class="material-symbols-outlined">add</span>
                    Register Student
                </button>
</div>
</header>
<!-- Stats Overview Row -->
<section class="p-margin-desktop grid grid-cols-1 md:grid-cols-4 gap-gutter">
<div class="bg-surface-container-lowest border border-outline-variant p-md rounded-xl">
<p class="text-caption text-on-surface-variant uppercase tracking-wider mb-2">Total Verified</p>
<div class="flex items-end gap-2">
<span class="text-display-lg text-secondary leading-none">1,102</span>
<span class="text-secondary text-caption mb-1 flex items-center"><span class="material-symbols-outlined text-xs">trending_up</span> 12%</span>
</div>
</div>
<div class="bg-surface-container-lowest border border-outline-variant p-md rounded-xl">
<p class="text-caption text-on-surface-variant uppercase tracking-wider mb-2">Pending Verification</p>
<div class="flex items-end gap-2">
<span class="text-display-lg text-primary leading-none">84</span>
<span class="text-primary text-caption mb-1">Action Required</span>
</div>
</div>
<div class="bg-surface-container-lowest border border-outline-variant p-md rounded-xl">
<p class="text-caption text-on-surface-variant uppercase tracking-wider mb-2">Blacklisted</p>
<div class="flex items-end gap-2">
<span class="text-display-lg text-error leading-none">12</span>
<span class="text-error text-caption mb-1">Restricted</span>
</div>
</div>
<div class="bg-surface-container-lowest border border-outline-variant p-md rounded-xl">
<p class="text-caption text-on-surface-variant uppercase tracking-wider mb-2">Total Sales</p>
<div class="flex items-end gap-2">
<span class="text-display-lg text-on-surface leading-none">3.4k</span>
<span class="text-on-surface-variant text-caption mb-1">Cumulative</span>
</div>
</div>
</section>
<!-- Data Table Section -->
<section class="px-margin-desktop pb-xl">
<div class="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
<div class="overflow-x-auto">
<table class="w-full text-left border-collapse">
<thead>
<tr class="bg-surface-container border-b border-outline-variant">
<th class="px-6 py-4 text-label-md font-bold text-on-surface">Student Name</th>
<th class="px-6 py-4 text-label-md font-bold text-on-surface">WhatsApp Number</th>
<th class="px-6 py-4 text-label-md font-bold text-on-surface">Total Listings</th>
<th class="px-6 py-4 text-label-md font-bold text-on-surface">Total Sales</th>
<th class="px-6 py-4 text-label-md font-bold text-on-surface">Status</th>
<th class="px-6 py-4 text-label-md font-bold text-on-surface">Verified Date</th>
<th class="px-6 py-4 text-label-md font-bold text-on-surface text-center">Actions</th>
</tr>
</thead>
<tbody class="divide-y divide-outline-variant">
<!-- Row 1 -->
<tr class="hover:bg-surface-container-low transition-colors group">
<td class="px-6 py-4">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-bold text-caption">AF</div>
<div>
<p class="text-body-md font-semibold">Ahmad Fauzi</p>
<p class="text-caption text-on-surface-variant">Fakultas Teknik</p>
</div>
</div>
</td>
<td class="px-6 py-4 text-body-md text-on-surface-variant font-mono">+62 812-4456-7890</td>
<td class="px-6 py-4 text-body-md">24</td>
<td class="px-6 py-4 text-body-md">18</td>
<td class="px-6 py-4">
<span class="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-fixed-variant text-caption font-bold inline-flex items-center gap-1">
<span class="material-symbols-outlined text-xs" style="font-variation-settings: 'FILL' 1;">verified</span> Verified
                                    </span>
</td>
<td class="px-6 py-4 text-caption text-on-surface-variant">12 Oct 2024</td>
<td class="px-6 py-4">
<div class="flex items-center justify-center gap-2">
<button class="p-2 text-outline hover:text-primary transition-colors" title="Edit Profile">
<span class="material-symbols-outlined">edit</span>
</button>
<button class="p-2 text-outline hover:text-error transition-colors" title="Blacklist Number">
<span class="material-symbols-outlined">block</span>
</button>
</div>
</td>
</tr>
<!-- Row 2 -->
<tr class="hover:bg-surface-container-low transition-colors group">
<td class="px-6 py-4">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed font-bold text-caption">SN</div>
<div>
<p class="text-body-md font-semibold">Siti Nurhaliza</p>
<p class="text-caption text-on-surface-variant">FISIP</p>
</div>
</div>
</td>
<td class="px-6 py-4 text-body-md text-on-surface-variant font-mono">+62 852-9901-2234</td>
<td class="px-6 py-4 text-body-md">5</td>
<td class="px-6 py-4 text-body-md">2</td>
<td class="px-6 py-4">
<span class="px-3 py-1 rounded-full bg-surface-variant text-on-surface-variant text-caption font-bold inline-flex items-center gap-1">
<span class="material-symbols-outlined text-xs">pending_actions</span> Unverified
                                    </span>
</td>
<td class="px-6 py-4 text-caption text-on-surface-variant">—</td>
<td class="px-6 py-4">
<div class="flex items-center justify-center gap-2">
<button class="bg-primary text-on-primary px-3 py-1 rounded-lg text-caption font-bold hover:opacity-90 transition-all">Verify</button>
<button class="p-2 text-outline hover:text-error transition-colors">
<span class="material-symbols-outlined">block</span>
</button>
</div>
</td>
</tr>
<!-- Row 3 -->
<tr class="hover:bg-surface-container-low transition-colors group">
<td class="px-6 py-4">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-full bg-error-container flex items-center justify-center text-on-error-container font-bold text-caption">BR</div>
<div>
<p class="text-body-md font-semibold">Budi Ramadhan</p>
<p class="text-caption text-on-surface-variant">Polmed - Akuntansi</p>
</div>
</div>
</td>
<td class="px-6 py-4 text-body-md text-on-surface-variant font-mono">+62 821-3344-5566</td>
<td class="px-6 py-4 text-body-md">2</td>
<td class="px-6 py-4 text-body-md">0</td>
<td class="px-6 py-4">
<span class="px-3 py-1 rounded-full bg-error-container text-on-error-container text-caption font-bold inline-flex items-center gap-1">
<span class="material-symbols-outlined text-xs">dangerous</span> Blacklisted
                                    </span>
</td>
<td class="px-6 py-4 text-caption text-on-surface-variant">05 Sep 2024</td>
<td class="px-6 py-4">
<div class="flex items-center justify-center gap-2">
<button class="text-primary text-caption font-bold hover:underline">Revoke</button>
</div>
</td>
</tr>
<!-- Row 4 -->
<tr class="hover:bg-surface-container-low transition-colors group">
<td class="px-6 py-4">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed font-bold text-caption">RP</div>
<div>
<p class="text-body-md font-semibold">Rina Putri</p>
<p class="text-caption text-on-surface-variant">Fakultas Kedokteran</p>
</div>
</div>
</td>
<td class="px-6 py-4 text-body-md text-on-surface-variant font-mono">+62 813-7788-9900</td>
<td class="px-6 py-4 text-body-md">45</td>
<td class="px-6 py-4 text-body-md">39</td>
<td class="px-6 py-4">
<span class="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-fixed-variant text-caption font-bold inline-flex items-center gap-1">
<span class="material-symbols-outlined text-xs" style="font-variation-settings: 'FILL' 1;">verified</span> Verified
                                    </span>
</td>
<td class="px-6 py-4 text-caption text-on-surface-variant">20 Aug 2024</td>
<td class="px-6 py-4">
<div class="flex items-center justify-center gap-2">
<button class="p-2 text-outline hover:text-primary transition-colors">
<span class="material-symbols-outlined">edit</span>
</button>
<button class="p-2 text-outline hover:text-error transition-colors">
<span class="material-symbols-outlined">block</span>
</button>
</div>
</td>
</tr>
<!-- Row 5 -->
<tr class="hover:bg-surface-container-low transition-colors group">
<td class="px-6 py-4">
<div class="flex items-center gap-3">
<div class="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-caption">DW</div>
<div>
<p class="text-body-md font-semibold">Dedi Wijaya</p>
<p class="text-caption text-on-surface-variant">Polmed - Elektro</p>
</div>
</div>
</td>
<td class="px-6 py-4 text-body-md text-on-surface-variant font-mono">+62 811-2233-4455</td>
<td class="px-6 py-4 text-body-md">12</td>
<td class="px-6 py-4 text-body-md">8</td>
<td class="px-6 py-4">
<span class="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-fixed-variant text-caption font-bold inline-flex items-center gap-1">
<span class="material-symbols-outlined text-xs" style="font-variation-settings: 'FILL' 1;">verified</span> Verified
                                    </span>
</td>
<td class="px-6 py-4 text-caption text-on-surface-variant">30 Oct 2024</td>
<td class="px-6 py-4">
<div class="flex items-center justify-center gap-2">
<button class="p-2 text-outline hover:text-primary transition-colors">
<span class="material-symbols-outlined">edit</span>
</button>
<button class="p-2 text-outline hover:text-error transition-colors">
<span class="material-symbols-outlined">block</span>
</button>
</div>
</td>
</tr>
</tbody>
</table>
</div>
<!-- Pagination -->
<div class="bg-surface-container-low px-6 py-4 flex items-center justify-between border-t border-outline-variant">
<p class="text-caption text-on-surface-variant">Showing 1-10 of 1,248 students</p>
<div class="flex items-center gap-2">
<button class="p-1 rounded-lg border border-outline-variant hover:bg-surface-container-highest transition-colors disabled:opacity-50" disabled="">
<span class="material-symbols-outlined">chevron_left</span>
</button>
<button class="w-8 h-8 rounded-lg bg-primary text-on-primary text-caption font-bold">1</button>
<button class="w-8 h-8 rounded-lg hover:bg-surface-container-highest text-caption transition-colors">2</button>
<button class="w-8 h-8 rounded-lg hover:bg-surface-container-highest text-caption transition-colors">3</button>
<span class="text-caption px-1">...</span>
<button class="w-8 h-8 rounded-lg hover:bg-surface-container-highest text-caption transition-colors">125</button>
<button class="p-1 rounded-lg border border-outline-variant hover:bg-surface-container-highest transition-colors">
<span class="material-symbols-outlined">chevron_right</span>
</button>
</div>
</div>
</div>
</section>
</main>
<!-- Contextual Modal (Hidden by Default) -->
<div class="fixed inset-0 bg-on-background/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4" id="blacklist-modal">
<div class="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
<div class="p-6">
<div class="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center mb-4">
<span class="material-symbols-outlined">warning</span>
</div>
<h3 class="text-headline-md font-bold mb-2">Blacklist Number?</h3>
<p class="text-body-md text-on-surface-variant mb-6">This will immediately suspend the user's account and remove all their listings from the marketplace. This action can be revoked by a senior administrator.</p>
<div class="space-y-4">
<div>
<label class="text-label-md font-bold block mb-1">Reason for Blacklisting</label>
<select class="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-body-md focus:ring-primary focus:border-primary">
<option>Fraudulent Activity</option>
<option>Spam/Harassment</option>
<option>Multiple Policy Violations</option>
<option>Invalid Student ID</option>
<option>Other</option>
</select>
</div>
<div>
<label class="text-label-md font-bold block mb-1">Additional Notes</label>
<textarea class="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-body-md focus:ring-primary focus:border-primary h-24" placeholder="Describe the incident..."></textarea>
</div>
</div>
</div>
<div class="bg-surface-container p-4 flex items-center justify-end gap-3">
<button class="px-4 py-2 rounded-xl text-label-md font-bold text-on-surface-variant hover:bg-surface-container-highest transition-colors" onclick="toggleModal('blacklist-modal')">Cancel</button>
<button class="px-6 py-2 rounded-xl bg-error text-on-error text-label-md font-bold shadow-sm hover:opacity-90 transition-all">Confirm Blacklist</button>
</div>
</div>
</div>
<script>
        function toggleModal(id) {
            const modal = document.getElementById(id);
            modal.classList.toggle('hidden');
            modal.classList.toggle('flex');
        }

        // Logic for search interaction
        const searchInput = document.querySelector('input[type="text"]');
        searchInput.addEventListener('input', (e) => {
            // Simulated search feedback
            console.log('Searching for:', e.target.value);
        });

        // Event delegation for blacklist buttons (for demo)
        document.addEventListener('click', (e) => {
            if (e.target.closest('button') && e.target.closest('button').title === 'Blacklist Number') {
                toggleModal('blacklist-modal');
            }
        });
    </script>
</body></html>