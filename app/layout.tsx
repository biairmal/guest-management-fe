import './globals.css';
import React from 'react';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import Script from 'next/script';
import ThemeModeProvider from './_components/ThemeModeProvider';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-ibm-plex-mono',
});

// Sets <html data-theme> from localStorage before hydration so the first
// paint already matches the persisted preference (DESIGN_SYSTEM.md §1) —
// no light->dark flash. ThemeModeProvider reads the same attribute back on
// mount so client/server first render agree.
const NO_FLASH_THEME_SCRIPT = `
try {
  var m = localStorage.getItem('gm-theme-mode');
  document.documentElement.setAttribute('data-theme', m === 'dark' ? 'dark' : 'light');
} catch (e) {}
`;

const RootLayout = ({ children }: React.PropsWithChildren) => (
  <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`} suppressHydrationWarning>
    <body>
      <Script id="no-flash-theme" strategy="beforeInteractive">
        {NO_FLASH_THEME_SCRIPT}
      </Script>
      <AntdRegistry layer>
        <ThemeModeProvider>{children}</ThemeModeProvider>
      </AntdRegistry>
    </body>
  </html>
);

export default RootLayout;
