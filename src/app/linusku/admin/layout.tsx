import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panel Operasional LINUSKU',
  description:
    'Kelola armada, driver, halte, posisi GPS, laporan kepadatan, dan jam layanan LINUSKU.',
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
