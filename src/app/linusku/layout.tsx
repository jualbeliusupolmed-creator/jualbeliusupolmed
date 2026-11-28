import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import PwaRegistration from '@/components/PwaRegistration';
import PrimaryNavigation from '@/components/PrimaryNavigation';
import FrontendThemeShell from './frontend-theme';
import './globals.css';

export const metadata: Metadata = {
  title: { absolute: 'LINUSKU | Pelacak Bus Lintas USU' },
  description:
    'Pantau posisi dan estimasi tiba Bus Lintas USU. Beroperasi Senin-Jumat 07.00-17.00 WIB.',
  applicationName: 'LINUSKU',
  manifest: '/linusku/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/linusku/icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/linusku/icon.svg', type: 'image/svg+xml' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'LINUSKU',
    statusBarStyle: 'black-translucent',
  },
  robots: { index: false, follow: false },
};

export default function LinuskuLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <FrontendThemeShell>
      <PwaRegistration />
      {children}
      <PrimaryNavigation variant="mobile" />
      <div
        aria-hidden="true"
        className="xl:hidden"
        style={{ height: 'calc(66px + env(safe-area-inset-bottom, 0px))' }}
      />
    </FrontendThemeShell>
  );
}
