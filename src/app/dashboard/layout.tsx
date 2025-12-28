'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import {
    Calendar,
    LayoutDashboard,
    Users,
    Building2,
    BookOpen,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight
} from 'lucide-react'

interface DashboardLayoutProps {
    children: React.ReactNode
}

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/timetables', label: 'Timetables', icon: Calendar },
    { href: '/dashboard/lecturers', label: 'Lecturers', icon: Users },
    { href: '/dashboard/classrooms', label: 'Classrooms', icon: Building2 },
    { href: '/dashboard/subjects', label: 'Subjects', icon: BookOpen },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [collegeName, setCollegeName] = useState('')
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/auth')
            return
        }
        setUser(user)

        // Get college name
        const { data: settings } = await supabase
            .from('college_settings')
            .select('college_name')
            .eq('user_id', user.id)
            .single()

        if (settings) {
            setCollegeName(settings.college_name)
        }

        // Check if onboarded
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('is_onboarded')
            .eq('user_id', user.id)
            .single()

        if (!profile?.is_onboarded) {
            router.push('/onboarding')
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                        <Link href="/dashboard" className="flex items-center space-x-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <span className="text-lg font-bold text-gradient">TimeTable Pro</span>
                                {collegeName && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                                        {collegeName}
                                    </p>
                                )}
                            </div>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/dashboard' && pathname.startsWith(item.href))

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500'
                                        }`} />
                                    <span className="font-medium">{item.label}</span>
                                    {isActive && (
                                        <ChevronRight className="w-4 h-4 ml-auto text-purple-500" />
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-4">
                            <ThemeToggle />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                        {user && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                            </p>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="lg:ml-64">
                {/* Top bar (mobile) */}
                <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 lg:hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <Link href="/dashboard" className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-gradient">TimeTable Pro</span>
                        </Link>
                        <ThemeToggle />
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
