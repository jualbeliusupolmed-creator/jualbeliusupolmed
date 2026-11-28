'use client';

import { useEffect } from 'react';

export default function PwaRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/linusku/sw.js', { scope: '/linusku' })
        .catch((error: unknown) => {
          console.warn('Pendaftaran service worker LINUSKU gagal.', error);
        });
    }
  }, []);

  return null;
}
