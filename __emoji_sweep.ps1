$ErrorActionPreference = 'Stop'

$replacements = @(
  @{ Path = 'src/app/admin/AdminPanel.jsx'; Find = 'icon: "💰"'; Replace = 'icon: "TW"' },
  @{ Path = 'src/app/admin/AdminPanel.jsx'; Find = 'icon: "👀"'; Replace = 'icon: "KP"' },
  @{ Path = 'src/app/admin/AdminPanel.jsx'; Find = 'icon: "📢"'; Replace = 'icon: "BC"' },
  @{ Path = 'src/app/admin/BroadcastPanel.jsx'; Find = 'status.includes("📅")'; Replace = 'status.includes("[scheduled]")' },
  @{ Path = 'src/app/mading/MadingClient.jsx'; Find = 'post.type === "info" ? "📢" : post.is_anon ? "👤" : post.sender_name?.charAt(0) || "👤"'; Replace = 'post.type === "info" ? <Icon.Megaphone className="h-4 w-4" /> : post.is_anon ? <Icon.User className="h-4 w-4" /> : post.sender_name?.charAt(0) || "A"' },
  @{ Path = 'src/app/mading/[id]/MadingDetailClient.jsx'; Find = 'post.type === "info" ? "📢" : post.is_anon ? "👤" : post.sender_name?.charAt(0) || "👤"'; Replace = 'post.type === "info" ? <Icon.Megaphone className="h-4 w-4" /> : post.is_anon ? <Icon.User className="h-4 w-4" /> : post.sender_name?.charAt(0) || "A"' },
  @{ Path = 'src/app/toko/[slug]/page.jsx'; Find = 'ikon="📝"'; Replace = 'ikon="Bio"' },
  @{ Path = 'src/app/toko/[slug]/page.jsx'; Find = 'ikon="📍"'; Replace = 'ikon="COD"' },
  @{ Path = 'src/app/toko/[slug]/page.jsx'; Find = 'ikon="🕒"'; Replace = 'ikon="Jam"' },
  @{ Path = 'src/app/toko/[slug]/page.jsx'; Find = 'ikon="📱"'; Replace = 'ikon="WA"' },
  @{ Path = 'src/app/toko/[slug]/page.jsx'; Find = 'ikon="🔗"'; Replace = 'ikon="Link"' },
  @{ Path = 'src/components/BagikanIklan.jsx'; Find = '`${isRental ? "🔑 *[SEWA]*" : "🛒"} *${listing.title}*\n` +'; Replace = '`${isRental ? "[SEWA]" : "[JUAL]"} *${listing.title}*\n` +' },
  @{ Path = 'src/components/BlogPenulisPanel.jsx'; Find = '{berbadge ? "✍️" : "📝"}'; Replace = '{berbadge ? "Edit" : "Catat"}' },
  @{ Path = 'src/components/admin/ModerasiClient.jsx'; Find = 'icon: "📦"'; Replace = 'icon: "BOX"' },
  @{ Path = 'src/components/admin/ModerasiClient.jsx'; Find = 'icon: "👤"'; Replace = 'icon: "USR"' },
  @{ Path = 'src/components/admin/ModerasiClient.jsx'; Find = 'icon: "💳"'; Replace = 'icon: "PAY"' },
  @{ Path = 'src/components/admin/OverviewView.jsx'; Find = 'icon: "📦"'; Replace = 'icon: "BOX"' },
  @{ Path = 'src/components/admin/OverviewView.jsx'; Find = 'icon: "🚀"'; Replace = 'icon: "UP"' },
  @{ Path = 'src/components/admin/OverviewView.jsx'; Find = 'icon: "🤝"'; Replace = 'icon: "PAY"' },
  @{ Path = 'src/components/admin/OverviewView.jsx'; Find = 'icon="📦"'; Replace = 'icon="BOX"' },
  @{ Path = 'src/components/admin/OverviewView.jsx'; Find = 'icon="🤝"'; Replace = 'icon="PAY"' },
  @{ Path = 'src/components/admin/OverviewView.jsx'; Find = 'icon="💳"'; Replace = 'icon="CC"' },
  @{ Path = 'src/components/admin/OverviewView.jsx'; Find = 'icon="📱"'; Replace = 'icon="HP"' },
  @{ Path = 'src/lib/demoData.js'; Find = 'icon: "💻"'; Replace = 'icon: "Laptop"' },
  @{ Path = 'src/lib/demoData.js'; Find = 'icon: "📚"'; Replace = 'icon: "Books"' },
  @{ Path = 'src/lib/demoData.js'; Find = 'icon: "🏠"'; Replace = 'icon: "Home"' },
  @{ Path = 'src/lib/demoData.js'; Find = 'icon: "👕"'; Replace = 'icon: "Fashion"' },
  @{ Path = 'src/lib/demoData.js'; Find = 'icon: "🛵"'; Replace = 'icon: "Motor"' },
  @{ Path = 'src/lib/demoData.js'; Find = 'icon: "🪑"'; Replace = 'icon: "Chair"' },
  @{ Path = 'src/lib/demoData.js'; Find = 'icon: "📦"'; Replace = 'icon: "Box"' },
  @{ Path = 'src/lib/fonnte.js'; Find = '`${isRental ? "🔑 *[SEWA]*" : "🛒"} *${listing.title}* — ${priceStr}\n` +'; Replace = '`${isRental ? "[SEWA]" : "[JUAL]"} *${listing.title}* — ${priceStr}\n` +' },
  @{ Path = 'src/lib/organisasi.js'; Find = 'label: "👑 BEM & Himpunan Mahasiswa (HIMA)", icon: "👑"'; Replace = 'label: "BEM & Himpunan Mahasiswa (HIMA)", icon: "BEM"' },
  @{ Path = 'src/lib/organisasi.js'; Find = 'label: "🏃 UKM Olahraga & Kebugaran", icon: "🏃"'; Replace = 'label: "UKM Olahraga & Kebugaran", icon: "Run"' },
  @{ Path = 'src/lib/organisasi.js'; Find = 'label: "🎨 UKM Seni, Musik & Budaya", icon: "🎨"'; Replace = 'label: "UKM Seni, Musik & Budaya", icon: "Art"' },
  @{ Path = 'src/lib/organisasi.js'; Find = 'label: "🔬 UKM Riset, Penalaran & Teknologi", icon: "🔬"'; Replace = 'label: "UKM Riset, Penalaran & Teknologi", icon: "Lab"' },
  @{ Path = 'src/lib/organisasi.js'; Find = 'label: "🕌 UKM Kerohanian & Keagamaan", icon: "🕌"'; Replace = 'label: "UKM Kerohanian & Keagamaan", icon: "Faith"' },
  @{ Path = 'src/lib/organisasi.js'; Find = 'label: "📰 Pers, Media & Jurnalistik Kampus", icon: "📰"'; Replace = 'label: "Pers, Media & Jurnalistik Kampus", icon: "News"' },
  @{ Path = 'src/lib/organisasi.js'; Find = 'label: "🌱 Komunitas Sosial & Lingkungan", icon: "🌱"'; Replace = 'label: "Komunitas Sosial & Lingkungan", icon: "Leaf"' },
  @{ Path = 'src/app/api/analytics/seller/route.js'; Find = 'icon: "📢"'; Replace = 'icon: "campaign"' },
  @{ Path = 'src/app/api/analytics/seller/route.js'; Find = 'icon: "🔥"'; Replace = 'icon: "hot"' },
  @{ Path = 'src/app/api/analytics/seller/route.js'; Find = 'icon: "🚀"'; Replace = 'icon: "boost"' },
  @{ Path = 'src/app/api/analytics/seller/route.js'; Find = 'icon: "💰"'; Replace = 'icon: "sales"' },
  @{ Path = 'src/app/api/analytics/seller/route.js'; Find = 'icon: "📊"'; Replace = 'icon: "stats"' },
  @{ Path = 'src/app/api/listings/[id]/view/route.js'; Find = 'const emoji = nextMilestone >= 500 ? "🔥🔥🔥" : nextMilestone >= 100 ? "🚀🚀" : "🎉";'; Replace = 'const emoji = nextMilestone >= 500 ? "Milestone 500" : nextMilestone >= 100 ? "Milestone 100" : "Milestone";' },
  @{ Path = 'src/app/api/wa/baileys/route.js'; Find = 'const emo = l.status === "active" ? "✅" : l.status === "sold" ? "🎉" : l.status === "deletion_pending" ? "🗑️" : "⏳";'; Replace = 'const emo = l.status === "active" ? "OK" : l.status === "sold" ? "DONE" : l.status === "deletion_pending" ? "DEL" : "WAIT";' },
  @{ Path = 'src/app/api/wa/baileys/route.js'; Find = 'const sEmo = { active: "✅", pending: "⏳", expired: "❌", sold: "🏷️", suspended: "⛔", deletion_pending: "🗑️" }[l.status] || "❓";'; Replace = 'const sEmo = { active: "OK", pending: "WAIT", expired: "ERR", sold: "SOLD", suspended: "STOP", deletion_pending: "DEL" }[l.status] || "UNK";' },
  @{ Path = 'src/app/api/wa/baileys/route.js'; Find = 'const statusEmoji = { active: "✅", pending: "⏳", sold: "🎉", expired: "❌", suspended: "⛔", deletion_pending: "🗑️" }[cek.status] || "❓";'; Replace = 'const statusEmoji = { active: "OK", pending: "WAIT", sold: "SOLD", expired: "ERR", suspended: "STOP", deletion_pending: "DEL" }[cek.status] || "UNK";' },
  @{ Path = 'src/app/chat/page.jsx'; Find = 'uploadingImg ? <span className="h-4 w-4 animate-pulse">...</span> : <Icon.Camera className="h-4 w-4" />'; Replace = 'uploadingImg ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" /> : <Icon.Camera className="h-4 w-4" />' }
)

foreach ($group in $replacements | Group-Object Path) {
  $path = Join-Path (Get-Location) $group.Name
  if (-not (Test-Path $path)) { continue }
  $text = [System.IO.File]::ReadAllText($path)
  $changed = $false
  foreach ($r in $group.Group) {
    $escaped = [regex]::Escape($r.Find)
    $next = [regex]::Replace($text, $escaped, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $r.Replace })
    if ($next -ne $text) {
      $text = $next
      $changed = $true
    }
  }
  if ($changed) {
    [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
  }
}
