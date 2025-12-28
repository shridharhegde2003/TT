'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
    const [stats, setStats] = useState({ lecturers: 0, classrooms: 0, subjects: 0, timetables: 0 })
    const [collegeName, setCollegeName] = useState('')
    const supabase = createClient()

    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const [lecturers, classrooms, subjects, timetables, settings] = await Promise.all([
                    supabase.from('lecturers').select('id', { count: 'exact' }).eq('user_id', user.id),
                    supabase.from('classrooms').select('id', { count: 'exact' }).eq('user_id', user.id),
                    supabase.from('subjects').select('id', { count: 'exact' }).eq('user_id', user.id),
                    supabase.from('timetables').select('id', { count: 'exact' }).eq('user_id', user.id),
                    supabase.from('college_settings').select('college_name').eq('user_id', user.id).single()
                ])
                setStats({
                    lecturers: lecturers.count || 0,
                    classrooms: classrooms.count || 0,
                    subjects: subjects.count || 0,
                    timetables: timetables.count || 0
                })
                setCollegeName(settings.data?.college_name || 'Your College')
            }
        }
        loadData()
    }, [])

    const statCards = [
        { label: 'Lecturers', value: stats.lecturers, icon: '👨‍🏫', color: '#3b82f6', href: '/dashboard/lecturers' },
        { label: 'Classrooms', value: stats.classrooms, icon: '🏫', color: '#10b981', href: '/dashboard/classrooms' },
        { label: 'Subjects', value: stats.subjects, icon: '📚', color: '#f59e0b', href: '/dashboard/subjects' },
        { label: 'Timetables', value: stats.timetables, icon: '📅', color: '#8b5cf6', href: '/dashboard/timetables' },
    ]

    const quickActions = [
        { label: 'Add Lecturer', href: '/dashboard/lecturers', icon: '➕' },
        { label: 'Add Classroom', href: '/dashboard/classrooms', icon: '🏫' },
        { label: 'Add Subject', href: '/dashboard/subjects', icon: '📖' },
        { label: 'Create Timetable', href: '/dashboard/timetables/new', icon: '📅' },
    ]

    return (
        <div>
            {/* Welcome */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                    Welcome to {collegeName}
                </h1>
                <p style={{ color: '#6b7280' }}>
                    Manage your timetables, lecturers, and more from here.
                </p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {statCards.map(card => (
                    <Link key={card.label} href={card.href} style={{ textDecoration: 'none' }}>
                        <div style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            borderLeft: `4px solid ${card.color}`,
                            cursor: 'pointer'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontSize: '32px' }}>{card.icon}</span>
                                <span style={{ fontSize: '36px', fontWeight: 'bold', color: card.color }}>{card.value}</span>
                            </div>
                            <p style={{ color: '#6b7280', fontWeight: '500' }}>{card.label}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                    Quick Actions
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    {quickActions.map(action => (
                        <Link key={action.label} href={action.href} style={{ textDecoration: 'none' }}>
                            <div style={{
                                background: 'white',
                                borderRadius: '12px',
                                padding: '20px',
                                textAlign: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                cursor: 'pointer',
                                border: '2px solid transparent'
                            }}>
                                <span style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }}>{action.icon}</span>
                                <span style={{ color: '#374151', fontWeight: '500' }}>{action.label}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Getting Started */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
                    Getting Started
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                        <span style={{ fontSize: '20px' }}>1️⃣</span>
                        <span style={{ color: '#374151' }}>Add your lecturers with their short names</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                        <span style={{ fontSize: '20px' }}>2️⃣</span>
                        <span style={{ color: '#374151' }}>Add classrooms and labs</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                        <span style={{ fontSize: '20px' }}>3️⃣</span>
                        <span style={{ color: '#374151' }}>Add subjects with colors</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                        <span style={{ fontSize: '20px' }}>4️⃣</span>
                        <span style={{ color: '#374151' }}>Create timetables and export as PDF</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
