import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'BUFI Contracts - AI-Powered Escrow Contract Builder',
  description: 'Build smart escrow contracts with AI-powered clause generation, milestone-based payments, and visual flow logic for foreign trade and freelance work.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#F8F6FD',
  colorScheme: 'light dark',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <NuqsAdapter>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster 
              position="bottom-right"
              toastOptions={{
                classNames: {
                  toast: 'bg-card border-border text-foreground',
                  title: 'text-foreground',
                  description: 'text-muted-foreground',
                  actionButton: 'bg-primary text-primary-foreground',
                  cancelButton: 'bg-muted text-muted-foreground',
                },
              }}
            />
          </ThemeProvider>
        </NuqsAdapter>
        <Analytics />
      </body>
    </html>
  )
}
