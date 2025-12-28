'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/dashboard/lecturers', label: 'Lecturers', icon: '👨‍🏫' },
    { href: '/dashboard/classrooms', label: 'Classrooms', icon: '🏫' },
    { href: '/dashboard/subjects', label: 'Subjects', icon: '📚' },
    { href: '/dashboard/timetables', label: 'Timetables', icon: '📅' },
    { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
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
                        <span style={{ fontSize: '24px' }}>📅</span>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>TimeTable Pro</span>
                    </Link>
                </div>

                {/* Nav Items */}
                <nav style={{ flex: 1, padding: '16px 12px' }}>
                    {navItems.map(item => (
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
                                color: pathname === item.href ? '#4f46e5' : '#374151',
                                background: pathname === item.href ? '#eef2ff' : 'transparent',
                                fontWeight: pathname === item.href ? '600' : '500'
                            }}
                        >
                            <span style={{ fontSize: '18px' }}>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
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
                            cursor: 'pointer'
                        }}
                    >
                        🚪 Logout
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
                            fontSize: '18px'
                        }}
                    >
                        ☰
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
                            color: 'white',
                            fontWeight: 'bold'
                        }}>
                            {user?.email?.[0]?.toUpperCase() || 'U'}
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
