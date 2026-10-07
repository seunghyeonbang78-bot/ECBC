import type { Metadata } from 'next';
import './globals.css';
import Shell from './shell';

export const metadata: Metadata = {
  title: 'East Coast Badminton Club',
  description:
    'Badminton in Maryland. Club calendar, news, coaching, and our story.',
  icons: {
    icon: '/favicon.svg'
  }
};

export default function Layout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
