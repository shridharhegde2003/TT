import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit'
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'TimeTable Pro - Smart Academic Scheduling',
  description: 'Create professional academic timetables with ease. Smart scheduling, conflict detection, and beautiful PDF exports.',
  keywords: ['timetable', 'scheduling', 'academic', 'college', 'university', 'class schedule'],
  authors: [{ name: 'TimeTable Pro' }],
  openGraph: {
    title: 'TimeTable Pro - Smart Academic Scheduling',
    description: 'Create professional academic timetables with ease.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${inter.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
