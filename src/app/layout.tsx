import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HomeKeepr',
  description: 'Manage your home staff, tasks and salary.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.0.0/dist/tabler-icons.min.css" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#1D9E75" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', backgroundColor: '#f9fafb' }}>
        {children}
      </body>
    </html>
  )
}
