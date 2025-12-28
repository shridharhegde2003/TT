'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Home, Users, Building, BookOpen, Calendar, Settings, LogOut, Menu, User } from 'lucide-react'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/lecturers', label: 'Lecturers', icon: Users },
    { href: '/dashboard/classrooms', label: 'Classrooms', icon: Building },
    { href: '/dashboard/subjects', label: 'Subjects', icon: BookOpen },
    { href: '/dashboard/timetables', label: 'Timetables', icon: Calendar },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [user, setUser] = useState<any>(null)
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth')
            } else {
                setUser(user)
            }
        }
        checkAuth()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/auth')
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f3f4f6' }}>
            {/* Sidebar */}
            <aside style={{
                width: sidebarOpen ? '240px' : '0px',
                background: 'white',
                borderRight: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.2s',
                overflow: 'hidden'
            }}>
                {/* Logo */}
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                    <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={24} color="#4f46e5" />
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>TimeTable Pro</span>
                    </Link>
                </div>

                {/* Nav Items */}
                <nav style={{ flex: 1, padding: '16px 12px' }}>
                    {navItems.map(item => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    marginBottom: '4px',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    color: isActive ? '#4f46e5' : '#374151',
                                    background: isActive ? '#eef2ff' : 'transparent',
                                    fontWeight: isActive ? '600' : '500'
                                }}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                {/* Logout */}
                <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Top Bar */}
                <header style={{
                    background: 'white',
                    padding: '16px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{
                            padding: '8px 12px',
                            background: '#f3f4f6',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <Menu size={20} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>{user?.email}</span>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            background: '#4f46e5',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <User size={20} />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                    {children}
                </div>
            </main>
        </div>
    )
}
