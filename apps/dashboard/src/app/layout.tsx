import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TopNav } from '@/components/layout/top-nav';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Trust Gate',
  description: 'Trajectory-aware regression gate for autonomous coding agents.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-body antialiased">
        <TopNav />
        {children}
      </body>
    </html>
  );
}
