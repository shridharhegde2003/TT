'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, X, Save, BookOpen } from 'lucide-react'

interface Subject {
    id: string
    name: string
    code: string
    color: string
}

const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [code, setCode] = useState('')
    const [color, setColor] = useState(COLORS[0])
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
        loadSubjects()
    }, [])

    const loadSubjects = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data, error } = await supabase.from('subjects').select('*').eq('user_id', user.id).order('name')
            if (error) {
                console.error('Load error:', error)
            }
            setSubjects(data || [])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || !code.trim()) {
            toast({ title: 'Error', description: 'Name and code are required', variant: 'destructive' })
            return
        }

        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            if (editingId) {
                const { error } = await supabase.from('subjects').update({
                    name: name.trim(),
                    code: code.trim(),
                    color
                }).eq('id', editingId)

                if (error) {
                    console.error('Update error:', error)
                    toast({ title: 'Error', description: error.message, variant: 'destructive' })
                } else {
                    toast({ title: 'Updated', description: 'Subject updated successfully' })
                    resetForm()
                    loadSubjects()
                }
            } else {
                const { error } = await supabase.from('subjects').insert({
                    user_id: user.id,
                    name: name.trim(),
                    code: code.trim(),
                    color
                })

                if (error) {
                    console.error('Insert error:', error)
                    toast({ title: 'Error', description: error.message, variant: 'destructive' })
                } else {
                    toast({ title: 'Added', description: 'Subject added successfully' })
                    resetForm()
                    loadSubjects()
                }
            }
        }
        setLoading(false)
    }

    const handleEdit = (subject: Subject) => {
        setEditingId(subject.id)
        setName(subject.name)
        setCode(subject.code)
        setColor(subject.color || COLORS[0])
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (confirm('Delete this subject?')) {
            const { error } = await supabase.from('subjects').delete().eq('id', id)
            if (error) {
                toast({ title: 'Error', description: error.message, variant: 'destructive' })
            } else {
                toast({ title: 'Deleted', description: 'Subject removed' })
                loadSubjects()
            }
        }
    }

    const resetForm = () => {
        setShowForm(false)
        setEditingId(null)
        setName('')
        setCode('')
        setColor(COLORS[Math.floor(Math.random() * COLORS.length)])
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                        Subjects
                    </h1>
                    <p style={{ color: '#6b7280' }}>{subjects.length} subject(s) added</p>
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
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Plus size={20} />
                    Add Subject
                </button>
            </div>

            {/* Info Note */}
            <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '24px',
                color: '#0369a1',
                fontSize: '14px'
            }}>
                <strong>Note:</strong> Theory/Practical type and number of periods are set when creating timetable entries, not here. This allows the same subject to be used for both theory and lab sessions.
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
                        {editingId ? 'Edit Subject' : 'Add New Subject'}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={labelStyle}>Subject Name *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Python, DBMS, Web Technology"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Subject Code *</label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    placeholder="e.g., PY, DBMS, WT"
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Color (for timetable display)</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            background: c,
                                            border: color === c ? '3px solid #111827' : '3px solid transparent',
                                            cursor: 'pointer'
                                        }}
                                    />
                                ))}
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
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Save size={18} />
                                {loading ? 'Saving...' : editingId ? 'Update' : 'Add Subject'}
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
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <X size={18} />
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {subjects.length === 0 ? (
                    <div style={{
                        gridColumn: '1 / -1',
                        background: 'white',
                        borderRadius: '12px',
                        padding: '48px',
                        textAlign: 'center',
                        color: '#6b7280'
                    }}>
                        <BookOpen size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
                        <p>No subjects added yet. Click "Add Subject" to get started.</p>
                    </div>
                ) : (
                    subjects.map(subject => (
                        <div key={subject.id} style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            borderLeft: `4px solid ${subject.color || '#3b82f6'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                                        {subject.name}
                                    </h3>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        background: '#f3f4f6',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}>
                                        {subject.code}
                                    </span>
                                </div>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    background: subject.color || '#3b82f6'
                                }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => handleEdit(subject)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: '#f3f4f6',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Edit size={14} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(subject.id)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: '#fee2e2',
                                        color: '#dc2626',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <Trash2 size={14} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
