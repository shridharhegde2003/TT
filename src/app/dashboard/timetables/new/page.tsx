'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export default function NewTimetablePage() {
    const [name, setName] = useState('')
    const [className, setClassName] = useState('')
    const [semester, setSemester] = useState('1')
    const [section, setSection] = useState('A')
    const [academicYear, setAcademicYear] = useState('2024-25')
    const [loading, setLoading] = useState(false)

    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        fontSize: '16px',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        outline: 'none',
        boxSizing: 'border-box' as const,
        background: 'white'
    }

    const labelStyle = {
        display: 'block',
        marginBottom: '6px',
        fontWeight: '600' as const,
        color: '#374151',
        fontSize: '14px'
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!className.trim()) {
            toast({ title: 'Error', description: 'Class name is required', variant: 'destructive' })
            return
        }

        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const ttTitle = name.trim() || `${className} - Sem ${semester} - Section ${section}`
            const { data, error } = await supabase.from('timetables').insert({
                user_id: user.id,
                title: ttTitle,
                class_name: className,
                semester,
                section,
                year: academicYear,
                status: 'in_progress',
                timetable_data: {}
            }).select().single()

            if (error) {
                console.error('Create error:', error)
                toast({ title: 'Error', description: error.message, variant: 'destructive' })
            } else {
                toast({ title: 'Created', description: 'Timetable created successfully' })
                router.push(`/dashboard/timetables/${data.id}`)
            }
        }
        setLoading(false)
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                Create New Timetable
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '32px' }}>
                Set up a new timetable for a class
            </p>

            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <form onSubmit={handleCreate}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Timetable Name (Optional)</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., CS 3rd Year - Section A"
                            style={inputStyle}
                        />
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            Leave blank to auto-generate
                        </p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Class Name *</label>
                        <input
                            type="text"
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            placeholder="e.g., B.Tech CSE 3rd Year"
                            style={inputStyle}
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={labelStyle}>Semester *</label>
                            <select value={semester} onChange={(e) => setSemester(e.target.value)} style={inputStyle}>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Section *</label>
                            <select value={section} onChange={(e) => setSection(e.target.value)} style={inputStyle}>
                                {['A', 'B', 'C', 'D', 'E'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '28px' }}>
                        <label style={labelStyle}>Academic Year *</label>
                        <input
                            type="text"
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            placeholder="e.g., 2024-25"
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '14px 24px',
                                background: loading ? '#9ca3af' : '#4f46e5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                fontSize: '16px',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Creating...' : 'Create Timetable'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            style={{
                                padding: '14px 24px',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
