'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  Users,
  Download,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

const features = [
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'Create multiple timetables for different classes, semesters, and sections with intelligent time calculations.'
  },
  {
    icon: Users,
    title: 'Lecturer Management',
    description: 'Maintain a complete database of lecturers with automatic short name generation and conflict detection.'
  },
  {
    icon: Bell,
    title: 'Conflict Alerts',
    description: 'Get instant alerts when a lecturer is double-booked across different sections or classes.'
  },
  {
    icon: LayoutGrid,
    title: 'Lab Batch Support',
    description: 'Handle practical sessions with multiple batches, each with different subjects and lab in-charges.'
  },
  {
    icon: Download,
    title: 'PDF Export',
    description: 'Export beautiful A4 timetables in portrait or landscape format with your college branding.'
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'Your data is securely stored and accessible only to you. No unauthorized access.'
  }
]

const stats = [
  { value: '100%', label: 'Free Forever' },
  { value: '5min', label: 'Setup Time' },
  { value: '∞', label: 'Timetables' },
  { value: 'A4', label: 'PDF Ready' }
]

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
          ? 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg shadow-lg'
          : 'bg-transparent'
        }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">TimeTable Pro</span>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link href="/auth">
                <Button className="btn-gradient">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center hero-gradient dot-pattern">
        <div className="absolute inset-0 overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl float animation-delay-200" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-6 pt-32 pb-20 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              Smart Academic Scheduling Made Simple
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Create Perfect
              <span className="block text-gradient">Timetables</span>
              <span className="block">In Minutes</span>
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              The ultimate timetable generator for colleges and universities.
              Manage lecturers, handle lab batches, detect conflicts, and export
              beautiful PDF schedules with ease.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth">
                <Button size="lg" className="btn-gradient text-lg px-8 py-6">
                  Start Creating Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2">
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800"
                >
                  <div className="text-3xl font-bold text-gradient">{stat.value}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-gray-400 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-gray-400 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful features designed specifically for academic institutions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="feature-card group"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Three simple steps to create your perfect timetable
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Setup Your College',
                description: 'Enter your college name, timings, breaks, and lunch schedule. This is a one-time setup.'
              },
              {
                step: '02',
                title: 'Add Master Data',
                description: 'Add your lecturers with short names and classrooms/labs. Manage them anytime.'
              },
              {
                step: '03',
                title: 'Create Timetables',
                description: 'Create timetables for each class and section. Add slots, handle labs, and download as PDF.'
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-8xl font-bold text-purple-100 dark:text-purple-900/30 absolute -top-6 -left-2">
                  {item.step}
                </div>
                <div className="relative pt-12 pl-4">
                  <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-purple-300 dark:text-purple-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 gradient-animated opacity-90" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Create Your Timetable?
            </h2>
            <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto">
              Join educators who trust TimeTable Pro for their scheduling needs.
              It's free, fast, and incredibly easy to use.
            </p>
            <Link href="/auth">
              <Button
                size="lg"
                className="bg-white text-purple-700 hover:bg-gray-100 text-lg px-10 py-6 font-semibold shadow-xl"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">TimeTable Pro</span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} TimeTable Pro. Built with ❤️ for educators.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
