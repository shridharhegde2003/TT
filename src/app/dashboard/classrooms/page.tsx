'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
    Plus,
    Trash2,
    Save,
    Building2,
    Loader2,
    Edit2,
    X,
    Search
} from 'lucide-react'
import type { Classroom } from '@/lib/types'

export default function ClassroomsPage() {
    const [classrooms, setClassrooms] = useState<Classroom[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form state
    const [name, setName] = useState('')
    const [capacity, setCapacity] = useState<number | ''>('')

    const supabase = createClient()
    const { toast } = useToast()

    useEffect(() => {
        fetchClassrooms()
    }, [])

    const fetchClassrooms = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('classrooms')
                .select('*')
                .eq('user_id', user.id)
                .order('name', { ascending: true })

            if (error) throw error
            setClassrooms(data || [])
        } catch (error) {
            console.error('Error fetching classrooms:', error)
            toast({
                title: 'Error',
                description: 'Failed to load classrooms',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setName('')
        setCapacity('')
        setEditingId(null)
        setShowAddForm(false)
    }

    const handleSave = async () => {
        if (!name.trim()) {
            toast({
                title: 'Name Required',
                description: 'Please enter the classroom/lab name',
                variant: 'destructive'
            })
            return
        }

        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const classroomData = {
                user_id: user.id,
                name: name.trim(),
                capacity: capacity || null
            }

            if (editingId) {
                const { error } = await supabase
                    .from('classrooms')
                    .update(classroomData)
                    .eq('id', editingId)

                if (error) throw error
                toast({ title: 'Success', description: 'Classroom updated successfully' })
            } else {
                const { error } = await supabase
                    .from('classrooms')
                    .insert([classroomData])

                if (error) throw error
                toast({ title: 'Success', description: 'Classroom added successfully' })
            }

            resetForm()
            fetchClassrooms()
        } catch (error) {
            console.error('Error saving classroom:', error)
            toast({
                title: 'Error',
                description: 'Failed to save classroom',
                variant: 'destructive'
            })
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (classroom: Classroom) => {
        setName(classroom.name)
        setCapacity(classroom.capacity || '')
        setEditingId(classroom.id)
        setShowAddForm(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this classroom?')) return

        try {
            const { error } = await supabase
                .from('classrooms')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast({ title: 'Deleted', description: 'Classroom removed successfully' })
            fetchClassrooms()
        } catch (error) {
            console.error('Error deleting classroom:', error)
            toast({
                title: 'Error',
                description: 'Failed to delete classroom',
                variant: 'destructive'
            })
        }
    }

    const filteredClassrooms = classrooms.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Classrooms & Labs</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage all rooms and laboratories
                    </p>
                </div>
                <Button
                    onClick={() => { resetForm(); setShowAddForm(true); }}
                    className="btn-gradient"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Classroom
                </Button>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <Card className="premium-card border-orange-200 dark:border-orange-800">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>{editingId ? 'Edit Classroom' : 'Add New Classroom'}</CardTitle>
                            <Button variant="ghost" size="icon" onClick={resetForm}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Room/Lab Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Room 101, Lab A, Seminar Hall"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capacity">Capacity (optional)</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    placeholder="e.g., 60"
                                    value={capacity}
                                    onChange={(e) => setCapacity(e.target.value ? parseInt(e.target.value) : '')}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={resetForm}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={saving} className="btn-gradient">
                                {saving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                {editingId ? 'Update' : 'Save'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                    placeholder="Search classrooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Classrooms List */}
            {filteredClassrooms.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClassrooms.map((classroom) => (
                        <Card key={classroom.id} className="premium-card">
                            <CardContent className="flex items-center justify-between py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{classroom.name}</h3>
                                        {classroom.capacity && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Capacity: {classroom.capacity}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(classroom)}
                                        className="text-gray-500 hover:text-blue-600"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(classroom.id)}
                                        className="text-gray-500 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="premium-card">
                    <CardContent className="py-12 text-center">
                        <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            {searchQuery ? 'No Classrooms Found' : 'No Classrooms Added'}
                        </h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Add your first classroom or lab'
                            }
                        </p>
                        {!searchQuery && (
                            <Button onClick={() => setShowAddForm(true)} className="btn-gradient">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Classroom
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
