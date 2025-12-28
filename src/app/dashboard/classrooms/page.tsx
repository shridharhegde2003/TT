'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, X, Save, Building } from 'lucide-react'

interface Classroom {
    id: string
    name: string
    capacity?: number
}

export default function ClassroomsPage() {
    const [classrooms, setClassrooms] = useState<Classroom[]>([])
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [capacity, setCapacity] = useState('')
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
        loadClassrooms()
    }, [])

    const loadClassrooms = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data, error } = await supabase.from('classrooms').select('*').eq('user_id', user.id).order('name')
            if (error) {
                console.error('Load error:', error)
            }
            setClassrooms(data || [])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) {
            toast({ title: 'Error', description: 'Name is required', variant: 'destructive' })
            return
        }

        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const roomData = {
                user_id: user.id,
                name: name.trim(),
                capacity: capacity ? parseInt(capacity) : null
            }

            if (editingId) {
                const { error } = await supabase.from('classrooms').update({
                    name: name.trim(),
                    capacity: capacity ? parseInt(capacity) : null
                }).eq('id', editingId)

                if (error) {
                    console.error('Update error:', error)
                    toast({ title: 'Error', description: error.message, variant: 'destructive' })
                } else {
                    toast({ title: 'Updated', description: 'Classroom updated successfully' })
                    resetForm()
                    loadClassrooms()
                }
            } else {
                const { error } = await supabase.from('classrooms').insert(roomData)

                if (error) {
                    console.error('Insert error:', error)
                    toast({ title: 'Error', description: error.message, variant: 'destructive' })
                } else {
                    toast({ title: 'Added', description: 'Classroom added successfully' })
                    resetForm()
                    loadClassrooms()
                }
            }
        }
        setLoading(false)
    }

    const handleEdit = (classroom: Classroom) => {
        setEditingId(classroom.id)
        setName(classroom.name)
        setCapacity(classroom.capacity?.toString() || '')
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (confirm('Delete this classroom?')) {
            const { error } = await supabase.from('classrooms').delete().eq('id', id)
            if (error) {
                toast({ title: 'Error', description: error.message, variant: 'destructive' })
            } else {
                toast({ title: 'Deleted', description: 'Classroom removed' })
                loadClassrooms()
            }
        }
    }

    const resetForm = () => {
        setShowForm(false)
        setEditingId(null)
        setName('')
        setCapacity('')
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
                        Classrooms & Labs
                    </h1>
                    <p style={{ color: '#6b7280' }}>{classrooms.length} room(s) added</p>
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
                    Add Room
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
                        {editingId ? 'Edit Room' : 'Add New Room'}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={labelStyle}>Room Name *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Room 101, Lab A, CS Lab"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Capacity (Optional)</label>
                                <input
                                    type="number"
                                    value={capacity}
                                    onChange={(e) => setCapacity(e.target.value)}
                                    placeholder="60"
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
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Save size={18} />
                                {loading ? 'Saving...' : editingId ? 'Update' : 'Add Room'}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {classrooms.length === 0 ? (
                    <div style={{
                        gridColumn: '1 / -1',
                        background: 'white',
                        borderRadius: '12px',
                        padding: '48px',
                        textAlign: 'center',
                        color: '#6b7280'
                    }}>
                        <Building size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
                        <p>No rooms added yet. Click "Add Room" to get started.</p>
                    </div>
                ) : (
                    classrooms.map(classroom => (
                        <div key={classroom.id} style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            borderLeft: '4px solid #3b82f6'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                                        {classroom.name}
                                    </h3>
                                </div>
                                <Building size={24} color="#3b82f6" />
                            </div>
                            {classroom.capacity && (
                                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
                                    Capacity: {classroom.capacity} students
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => handleEdit(classroom)}
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
                                    onClick={() => handleDelete(classroom.id)}
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
