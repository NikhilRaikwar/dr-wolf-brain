import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Newsreader, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://dr-wolf-brain.vercel.app'),
  title: 'Dr. Wolf Brain — An AI Chess Coach That Learns How You Think',
  description:
    'An AI chess coach that listens before it speaks. Grounded in Stockfish analysis, structured learner evidence, and Socratic practice.',
  keywords: [
    'Dr. Wolf Brain',
    'AI Chess Coach',
    'Chess Pedagogy',
    'Stockfish',
    'Cognitive Learner Model',
    'Think First',
    'Socratic Chess Coach',
    'Chess Improvement',
  ],
  authors: [{ name: 'Nikhil Raikwar', url: 'https://github.com/NikhilRaikwar' }],
  creator: 'Nikhil Raikwar',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://dr-wolf-brain.vercel.app',
    siteName: 'Dr. Wolf Brain',
    title: 'Dr. Wolf Brain — An AI Chess Coach That Learns How You Think',
    description:
      'An AI chess coach that listens before it speaks. Grounded in Stockfish analysis, structured learner evidence, and Socratic practice.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Dr. Wolf Brain — AI Chess Coach That Learns How You Think',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dr. Wolf Brain — An AI Chess Coach That Learns How You Think',
    description:
      'An AI chess coach that listens before it speaks. Grounded in Stockfish analysis, structured learner evidence, and Socratic practice.',
    images: ['/og-image.png'],
    creator: '@NikhilRaikwar',
  },
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f6eedb',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${newsreader.variable} ${plusJakartaSans.variable}`} suppressHydrationWarning>
      <body className="antialiased font-serif-custom">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
