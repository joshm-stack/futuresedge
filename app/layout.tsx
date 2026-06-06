import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import ThemeProvider from '@/components/layout/ThemeProvider';

export const metadata: Metadata = {
  title: 'FuturesEdge — Your Trading Edge',
  description: 'Professional futures trading journal and analytics platform',
  manifest: '/manifest.json',
  themeColor: '#3d7fff',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FuturesEdge',
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3d7fff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FuturesEdge" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '13px',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
