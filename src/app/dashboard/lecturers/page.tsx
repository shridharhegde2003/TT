'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
    Plus,
    Trash2,
    Save,
    Users,
    Loader2,
    Edit2,
    X,
    Search
} from 'lucide-react'
import type { Lecturer } from '@/lib/types'

export default function LecturersPage() {
    const [lecturers, setLecturers] = useState<Lecturer[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form state
    const [fullName, setFullName] = useState('')
    const [shortName, setShortName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [department, setDepartment] = useState('')
    const [autoGenerate, setAutoGenerate] = useState(true)

    const supabase = createClient()
    const { toast } = useToast()

    useEffect(() => {
        fetchLecturers()
    }, [])

    useEffect(() => {
        if (autoGenerate && fullName) {
            generateShortName(fullName)
        }
    }, [fullName, autoGenerate])

    const generateShortName = (name: string) => {
        const words = name.trim().split(' ').filter(w => w.length > 0)
        const initials = words.map(w => w[0].toUpperCase()).join('')
        setShortName(initials)
    }

    const fetchLecturers = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('lecturers')
                .select('*')
                .eq('user_id', user.id)
                .order('full_name', { ascending: true })

            if (error) throw error
            setLecturers(data || [])
        } catch (error) {
            console.error('Error fetching lecturers:', error)
            toast({
                title: 'Error',
                description: 'Failed to load lecturers',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFullName('')
        setShortName('')
        setEmail('')
        setPhone('')
        setDepartment('')
        setAutoGenerate(true)
        setEditingId(null)
        setShowAddForm(false)
    }

    const handleSave = async () => {
        if (!fullName.trim()) {
            toast({
                title: 'Name Required',
                description: 'Please enter the lecturer\'s full name',
                variant: 'destructive'
            })
            return
        }

        if (!shortName.trim()) {
            toast({
                title: 'Short Name Required',
                description: 'Please enter or generate a short name',
                variant: 'destructive'
            })
            return
        }

        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const lecturerData = {
                user_id: user.id,
                full_name: fullName.trim(),
                short_name: shortName.trim().toUpperCase(),
                email: email.trim() || null,
                phone: phone.trim() || null,
                department: department.trim() || null
            }

            if (editingId) {
                const { error } = await supabase
                    .from('lecturers')
                    .update(lecturerData)
                    .eq('id', editingId)

                if (error) throw error
                toast({ title: 'Success', description: 'Lecturer updated successfully' })
            } else {
                const { error } = await supabase
                    .from('lecturers')
                    .insert([lecturerData])

                if (error) throw error
                toast({ title: 'Success', description: 'Lecturer added successfully' })
            }

            resetForm()
            fetchLecturers()
        } catch (error) {
            console.error('Error saving lecturer:', error)
            toast({
                title: 'Error',
                description: 'Failed to save lecturer',
                variant: 'destructive'
            })
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (lecturer: Lecturer) => {
        setFullName(lecturer.full_name)
        setShortName(lecturer.short_name)
        setEmail(lecturer.email || '')
        setPhone(lecturer.phone || '')
        setDepartment(lecturer.department || '')
        setAutoGenerate(false)
        setEditingId(lecturer.id)
        setShowAddForm(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this lecturer?')) return

        try {
            const { error } = await supabase
                .from('lecturers')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast({ title: 'Deleted', description: 'Lecturer removed successfully' })
            fetchLecturers()
        } catch (error) {
            console.error('Error deleting lecturer:', error)
            toast({
                title: 'Error',
                description: 'Failed to delete lecturer',
                variant: 'destructive'
            })
        }
    }

    const filteredLecturers = lecturers.filter(l =>
        l.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.short_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.department?.toLowerCase().includes(searchQuery.toLowerCase())
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
                    <h1 className="text-3xl font-bold">Lecturers</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage faculty members and their short names
                    </p>
                </div>
                <Button
                    onClick={() => { resetForm(); setShowAddForm(true); }}
                    className="btn-gradient"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Lecturer
                </Button>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <Card className="premium-card border-purple-200 dark:border-purple-800">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>{editingId ? 'Edit Lecturer' : 'Add New Lecturer'}</CardTitle>
                            <Button variant="ghost" size="icon" onClick={resetForm}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name *</Label>
                                <Input
                                    id="fullName"
                                    placeholder="e.g., Ramesh Gupta"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="shortName">Short Name *</Label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={autoGenerate}
                                            onChange={(e) => {
                                                setAutoGenerate(e.target.checked)
                                                if (e.target.checked && fullName) {
                                                    generateShortName(fullName)
                                                }
                                            }}
                                            className="rounded"
                                        />
                                        Auto-generate
                                    </label>
                                </div>
                                <Input
                                    id="shortName"
                                    placeholder="e.g., RG"
                                    value={shortName}
                                    onChange={(e) => setShortName(e.target.value.toUpperCase())}
                                    disabled={autoGenerate}
                                    className={autoGenerate ? 'bg-gray-100 dark:bg-gray-800' : ''}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email (optional)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="ramesh@college.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone (optional)</Label>
                                <Input
                                    id="phone"
                                    placeholder="9876543210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="department">Department (optional)</Label>
                                <Input
                                    id="department"
                                    placeholder="Computer Science"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
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
                    placeholder="Search lecturers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Lecturers List */}
            {filteredLecturers.length > 0 ? (
                <div className="grid gap-4">
                    {filteredLecturers.map((lecturer) => (
                        <Card key={lecturer.id} className="premium-card">
                            <CardContent className="flex items-center justify-between py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold">
                                        {lecturer.short_name}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{lecturer.full_name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                            {lecturer.department && (
                                                <span>{lecturer.department}</span>
                                            )}
                                            {lecturer.email && (
                                                <>
                                                    {lecturer.department && <span>•</span>}
                                                    <span>{lecturer.email}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(lecturer)}
                                        className="text-gray-500 hover:text-blue-600"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(lecturer.id)}
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
                        <Users className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            {searchQuery ? 'No Lecturers Found' : 'No Lecturers Added'}
                        </h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Add your first lecturer to get started'
                            }
                        </p>
                        {!searchQuery && (
                            <Button onClick={() => setShowAddForm(true)} className="btn-gradient">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Lecturer
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
