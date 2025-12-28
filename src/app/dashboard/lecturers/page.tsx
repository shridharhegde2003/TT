'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface Lecturer {
    id: string
    full_name: string
    short_name: string
    email?: string
    department?: string
}

export default function LecturersPage() {
    const [lecturers, setLecturers] = useState<Lecturer[]>([])
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [fullName, setFullName] = useState('')
    const [shortName, setShortName] = useState('')
    const [email, setEmail] = useState('')
    const [department, setDepartment] = useState('')
    const [loading, setLoading] = useState(false)

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

    useEffect(() => {
        loadLecturers()
    }, [])

    const loadLecturers = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase.from('lecturers').select('*').eq('user_id', user.id).order('full_name')
            setLecturers(data || [])
        }
    }

    const generateShortName = (name: string) => {
        const words = name.trim().split(' ')
        if (words.length >= 2) {
            return words.map(w => w[0]).join('').toUpperCase()
        }
        return name.substring(0, 3).toUpperCase()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fullName.trim() || !shortName.trim()) {
            toast({ title: 'Error', description: 'Name and short name are required', variant: 'destructive' })
            return
        }

        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            if (editingId) {
                await supabase.from('lecturers').update({
                    full_name: fullName,
                    short_name: shortName,
                    email,
                    department
                }).eq('id', editingId)
                toast({ title: 'Updated', description: 'Lecturer updated successfully' })
            } else {
                await supabase.from('lecturers').insert({
                    user_id: user.id,
                    full_name: fullName,
                    short_name: shortName,
                    email,
                    department
                })
                toast({ title: 'Added', description: 'Lecturer added successfully' })
            }
            resetForm()
            loadLecturers()
        }
        setLoading(false)
    }

    const handleEdit = (lecturer: Lecturer) => {
        setEditingId(lecturer.id)
        setFullName(lecturer.full_name)
        setShortName(lecturer.short_name)
        setEmail(lecturer.email || '')
        setDepartment(lecturer.department || '')
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (confirm('Delete this lecturer?')) {
            await supabase.from('lecturers').delete().eq('id', id)
            toast({ title: 'Deleted', description: 'Lecturer removed' })
            loadLecturers()
        }
    }

    const resetForm = () => {
        setShowForm(false)
        setEditingId(null)
        setFullName('')
        setShortName('')
        setEmail('')
        setDepartment('')
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                        Lecturers
                    </h1>
                    <p style={{ color: '#6b7280' }}>{lecturers.length} lecturer(s) added</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowForm(true) }}
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
                    + Add Lecturer
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                        {editingId ? 'Edit Lecturer' : 'Add New Lecturer'}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={labelStyle}>Full Name *</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => {
                                        setFullName(e.target.value)
                                        if (!editingId) setShortName(generateShortName(e.target.value))
                                    }}
                                    placeholder="Dr. John Smith"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Short Name *</label>
                                <input
                                    type="text"
                                    value={shortName}
                                    onChange={(e) => setShortName(e.target.value.toUpperCase())}
                                    placeholder="JS"
                                    maxLength={5}
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={labelStyle}>Email (Optional)</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="john@college.edu"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Department (Optional)</label>
                                <input
                                    type="text"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    placeholder="Computer Science"
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    padding: '12px 24px',
                                    background: loading ? '#9ca3af' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? 'Saving...' : editingId ? 'Update' : 'Add Lecturer'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                style={{
                                    padding: '12px 24px',
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
            )}

            {/* List */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden'
            }}>
                {lecturers.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                        <p style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍🏫</p>
                        <p>No lecturers added yet. Click "Add Lecturer" to get started.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Name</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Short</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Department</th>
                                <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lecturers.map(lecturer => (
                                <tr key={lecturer.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '14px 20px' }}>
                                        <div style={{ fontWeight: '500', color: '#111827' }}>{lecturer.full_name}</div>
                                        {lecturer.email && <div style={{ fontSize: '13px', color: '#6b7280' }}>{lecturer.email}</div>}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '4px 10px',
                                            background: '#eef2ff',
                                            color: '#4f46e5',
                                            borderRadius: '4px',
                                            fontWeight: '600',
                                            fontSize: '13px'
                                        }}>
                                            {lecturer.short_name}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px', color: '#6b7280' }}>{lecturer.department || '-'}</td>
                                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleEdit(lecturer)}
                                            style={{
                                                padding: '6px 12px',
                                                background: '#f3f4f6',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                marginRight: '8px'
                                            }}
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(lecturer.id)}
                                            style={{
                                                padding: '6px 12px',
                                                background: '#fee2e2',
                                                color: '#dc2626',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🗑️ Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
