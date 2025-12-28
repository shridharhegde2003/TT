'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface Timetable {
    id: string
    name: string
    class_name: string
    semester: string
    section?: string
    academic_year: string
    status: 'draft' | 'published'
    created_at: string
}

export default function TimetablesPage() {
    const [timetables, setTimetables] = useState<Timetable[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const { toast } = useToast()

    useEffect(() => {
        loadTimetables()
    }, [])

    const loadTimetables = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase.from('timetables').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
            setTimetables(data || [])
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (confirm('Delete this timetable?')) {
            await supabase.from('timetables').delete().eq('id', id)
            toast({ title: 'Deleted', description: 'Timetable removed' })
            loadTimetables()
        }
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                        Timetables
                    </h1>
                    <p style={{ color: '#6b7280' }}>{timetables.length} timetable(s) created</p>
                </div>
                <Link href="/dashboard/timetables/new" style={{ textDecoration: 'none' }}>
                    <button
                        style={{
                            padding: '12px 24px',
                            background: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        + Create Timetable
                    </button>
                </Link>
            </div>

            {/* List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>Loading...</div>
            ) : timetables.length === 0 ? (
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center',
                    color: '#6b7280',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <p style={{ fontSize: '48px', marginBottom: '16px' }}>📅</p>
                    <p style={{ marginBottom: '16px' }}>No timetables created yet.</p>
                    <Link href="/dashboard/timetables/new" style={{ textDecoration: 'none' }}>
                        <button
                            style={{
                                padding: '12px 24px',
                                background: '#4f46e5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Create Your First Timetable
                        </button>
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {timetables.map(tt => (
                        <div key={tt.id} style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '24px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                                        {tt.name || `${tt.class_name} - ${tt.section || 'A'}`}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            background: '#f3f4f6',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            color: '#374151'
                                        }}>
                                            {tt.class_name}
                                        </span>
                                        <span style={{
                                            padding: '4px 10px',
                                            background: '#f3f4f6',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            color: '#374151'
                                        }}>
                                            Sem {tt.semester}
                                        </span>
                                        {tt.section && (
                                            <span style={{
                                                padding: '4px 10px',
                                                background: '#eef2ff',
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                color: '#4f46e5'
                                            }}>
                                                Section {tt.section}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span style={{
                                    padding: '4px 10px',
                                    background: tt.status === 'published' ? '#d1fae5' : '#fef3c7',
                                    color: tt.status === 'published' ? '#059669' : '#d97706',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}>
                                    {tt.status === 'published' ? '✓ Published' : '📝 Draft'}
                                </span>
                            </div>
                            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
                                Academic Year: {tt.academic_year}
                            </p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <Link href={`/dashboard/timetables/${tt.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                                    <button style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: '#4f46e5',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}>
                                        ✏️ Edit
                                    </button>
                                </Link>
                                <Link href={`/dashboard/timetables/${tt.id}/export`} style={{ flex: 1, textDecoration: 'none' }}>
                                    <button style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}>
                                        📄 Export
                                    </button>
                                </Link>
                                <button
                                    onClick={() => handleDelete(tt.id)}
                                    style={{
                                        padding: '10px 14px',
                                        background: '#fee2e2',
                                        color: '#dc2626',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
