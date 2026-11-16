/**
 * Campus Configuration — Single Source of Truth for Multi-Campus Support
 *
 * ALL campus-specific values live here. To fork for another campus:
 * 1. Copy this file
 * 2. Change the values below
 * 3. Deploy — no grep/replace across codebase needed
 *
 * Usage:
 *   import { campusConfig } from '@/config/campus'
 *   campusConfig.name // "Kampus Kita"
 *   campusConfig.campuses[0].shortName // "USU"
 */

export interface Campus {
  id: string
  name: string
  shortName: string
  provinceId: string
  emailDomains?: string[]
  instagramHandle?: string
  whatsappGroupId?: string
  whatsappGroupLink?: string
}

export interface FeeConfig {
  listing: number
  bump: number
  featuredPerDay: number
  autoBump7Days: number
  renew: number
  distributorDefaultRules: DistributorFeeRule[]
}

export interface DistributorFeeRule {
  minPrice: number
  maxPrice: number | null
  feePercent: number
  flatFee?: number
}

export interface BrandingConfig {
  siteName: string
  siteShortName: string
  description: string
  logoUrl?: string
  faviconUrl?: string
  ogImageUrl?: string
  themeColor: string
  primaryColor: string
  secondaryColor: string
}

export interface CampusConfig {
  // Core identity
  name: string
  domain: string
  defaultCampus: string
  provinceDefault: string

  // Campuses served
  campuses: Campus[]

  // Fee structure (can be overridden per-campus in DB settings)
  fees: FeeConfig

  // Branding
  branding: BrandingConfig

  // WhatsApp integration
  whatsapp: {
    marketplaceNumber: string
    publicNumber: string
    mainGroupId: string
    broadcastGroups: string[]
    groupLink: string
  }

  // Instagram integration
  instagram: {
    menfessAccountId: string
    katalogAccountId: string
    menfessHandle: string
    katalogHandle: string
  }

  // Feature flags
  features: {
    freeMode: boolean
    distributorEnabled: boolean
    autoBumpEnabled: boolean
    featuredEnabled: boolean
    chatEnabled: boolean
    pushNotificationsEnabled: boolean
    instagramAutoPublish: boolean
    adminCommandsEnabled: boolean
  }

  // External service defaults (override via env)
  defaults: {
    cronSecret: string
    vapidEmail: string
  }
}

/**
 * DEFAULT CONFIGURATION — Kampus Kita (USU + Polmed)
 *
 * Override via environment variables where marked [ENV].
 * See .env.example for all env vars.
 */
export const campusConfig: CampusConfig = {
  name: 'Kampus Kita',
  domain: process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, '') || 'kampuskita.my.id',
  defaultCampus: 'usu',
  provinceDefault: 'sumatera-utara',

  campuses: [
    {
      id: 'usu',
      name: 'Universitas Sumatera Utara',
      shortName: 'USU',
      provinceId: 'sumatera-utara',
      emailDomains: ['usu.ac.id', 'mahasiswa.usu.ac.id'],
      instagramHandle: '@usupolmedkatalog',
      whatsappGroupId: process.env.FONNTE_WA_GROUP_ID || '120363422379479724@g.us',
      whatsappGroupLink: process.env.NEXT_PUBLIC_WA_GROUP_LINK || 'https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA',
    },
    {
      id: 'polmed',
      name: 'Politeknik Negeri Medan',
      shortName: 'POLMED',
      provinceId: 'sumatera-utara',
      emailDomains: ['polmed.ac.id', 'student.polmed.ac.id'],
      instagramHandle: '@usupolmedkatalog',
      whatsappGroupId: process.env.FONNTE_WA_GROUP_ID || '120363422379479724@g.us',
      whatsappGroupLink: process.env.NEXT_PUBLIC_WA_GROUP_LINK || 'https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA',
    },
  ],

  fees: {
    listing: 2000,
    bump: 2000,
    featuredPerDay: 5000,
    autoBump7Days: 15000,
    renew: 2000,
    distributorDefaultRules: [
      { minPrice: 0, maxPrice: 50000, feePercent: 10, flatFee: 500 },
      { minPrice: 50001, maxPrice: 200000, feePercent: 8, flatFee: 1000 },
      { minPrice: 200001, maxPrice: 500000, feePercent: 6, flatFee: 2000 },
      { minPrice: 500001, maxPrice: 1000000, feePercent: 5, flatFee: 3000 },
      { minPrice: 1000001, maxPrice: null, feePercent: 4, flatFee: 5000 },
    ],
  },

  branding: {
    siteName: 'Kampus Kita',
    siteShortName: 'KampusKita',
    description: 'Marketplace & Komunitas Digital Mahasiswa Indonesia',
    logoUrl: '/icon.svg',
    faviconUrl: '/icon.svg',
    ogImageUrl: '/og-default.png',
    themeColor: '#16a34a',
    primaryColor: '#22c55e',
    secondaryColor: '#06b6d4',
  },

  whatsapp: {
    marketplaceNumber: process.env.MARKETPLACE_WA || '',
    publicNumber: process.env.NEXT_PUBLIC_MARKETPLACE_WA || '',
    mainGroupId: process.env.FONNTE_WA_GROUP_ID || '120363422379479724@g.us',
    broadcastGroups: (process.env.BAILEYS_BROADCAST_GROUPS || '').split(',').filter(Boolean),
    groupLink: process.env.NEXT_PUBLIC_WA_GROUP_LINK || 'https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA',
  },

  instagram: {
    menfessAccountId: process.env.META_MENFESS_IG_USER_ID || '',
    katalogAccountId: process.env.META_KATALOG_IG_USER_ID || '',
    menfessHandle: '@usupolmedmenfess',
    katalogHandle: '@katalogusupolmed',
  },

  features: {
    freeMode: true,
    distributorEnabled: true,
    autoBumpEnabled: true,
    featuredEnabled: true,
    chatEnabled: true,
    pushNotificationsEnabled: true,
    instagramAutoPublish: true,
    adminCommandsEnabled: true,
  },

  defaults: {
    cronSecret: process.env.CRON_SECRET || '',
    vapidEmail: process.env.VAPID_EMAIL || 'admin@kampuskita.my.id',
  },
}

/**
 * Helper Functions
 */

export function getCampusById(id: string): Campus | undefined {
  return campusConfig.campuses.find(c => c.id === id)
}

export function getCampusByShortName(shortName: string): Campus | undefined {
  return campusConfig.campuses.find(c => c.shortName.toLowerCase() === shortName.toLowerCase())
}

export function getAllCampusIds(): string[] {
  return campusConfig.campuses.map(c => c.id)
}

export function getAllCampusShortNames(): string[] {
  return campusConfig.campuses.map(c => c.shortName)
}

export function getDefaultCampus(): Campus {
  return getCampusById(campusConfig.defaultCampus) || campusConfig.campuses[0]
}

export function getProvinceForCampus(campusId: string): string {
  return getCampusById(campusId)?.provinceId || campusConfig.provinceDefault
}

export function isFeatureEnabled(feature: keyof CampusConfig['features']): boolean {
  return campusConfig.features[feature] === true
}

/**
 * Get fee for a specific campus (falls back to global default)
 * In production, this should check DB settings table first
 */
export function getFeeForCampus(campusId: string, feeType: keyof FeeConfig): number {
  // TODO: Check campus-specific override in DB settings
  return campusConfig.fees[feeType]
}

/**
 * Validate if an email domain belongs to a known campus
 */
export function getCampusFromEmail(email: string): Campus | null {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return null

  for (const campus of campusConfig.campuses) {
    if (campus.emailDomains?.some(d => d.toLowerCase() === domain)) {
      return campus
    }
  }
  return null
}