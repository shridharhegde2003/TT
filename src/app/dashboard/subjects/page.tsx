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
    BookOpen,
    Loader2,
    Edit2,
    X,
    Search,
    Beaker
} from 'lucide-react'
import type { Subject } from '@/lib/types'
import { SUBJECT_COLORS } from '@/lib/types'

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [showAddForm, setShowAddForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form state
    const [name, setName] = useState('')
    const [code, setCode] = useState('')
    const [isPractical, setIsPractical] = useState(false)
    const [color, setColor] = useState(SUBJECT_COLORS[0])

    const supabase = createClient()
    const { toast } = useToast()

    useEffect(() => {
        fetchSubjects()
    }, [])

    const fetchSubjects = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .eq('user_id', user.id)
                .order('name', { ascending: true })

            if (error) throw error
            setSubjects(data || [])
        } catch (error) {
            console.error('Error fetching subjects:', error)
            toast({
                title: 'Error',
                description: 'Failed to load subjects',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setName('')
        setCode('')
        setIsPractical(false)
        const randomIndex = Math.floor(Math.random() * SUBJECT_COLORS.length)
        setColor(SUBJECT_COLORS[randomIndex])
        setEditingId(null)
        setShowAddForm(false)
    }

    const handleSave = async () => {
        if (!name.trim()) {
            toast({
                title: 'Name Required',
                description: 'Please enter the subject name',
                variant: 'destructive'
            })
            return
        }

        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const subjectData = {
                user_id: user.id,
                name: name.trim(),
                code: code.trim() || null,
                is_practical: isPractical,
                color: color
            }

            if (editingId) {
                const { error } = await supabase
                    .from('subjects')
                    .update(subjectData)
                    .eq('id', editingId)

                if (error) throw error
                toast({ title: 'Success', description: 'Subject updated successfully' })
            } else {
                const { error } = await supabase
                    .from('subjects')
                    .insert([subjectData])

                if (error) throw error
                toast({ title: 'Success', description: 'Subject added successfully' })
            }

            resetForm()
            fetchSubjects()
        } catch (error) {
            console.error('Error saving subject:', error)
            toast({
                title: 'Error',
                description: 'Failed to save subject',
                variant: 'destructive'
            })
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = (subject: Subject) => {
        setName(subject.name)
        setCode(subject.code || '')
        setIsPractical(subject.is_practical)
        setColor(subject.color)
        setEditingId(subject.id)
        setShowAddForm(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this subject?')) return

        try {
            const { error } = await supabase
                .from('subjects')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast({ title: 'Deleted', description: 'Subject removed successfully' })
            fetchSubjects()
        } catch (error) {
            console.error('Error deleting subject:', error)
            toast({
                title: 'Error',
                description: 'Failed to delete subject',
                variant: 'destructive'
            })
        }
    }

    const filteredSubjects = subjects.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code?.toLowerCase().includes(searchQuery.toLowerCase())
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
                    <h1 className="text-3xl font-bold">Subjects</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage courses and subjects
                    </p>
                </div>
                <Button
                    onClick={() => { resetForm(); setShowAddForm(true); }}
                    className="btn-gradient"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subject
                </Button>
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <Card className="premium-card border-green-200 dark:border-green-800">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>{editingId ? 'Edit Subject' : 'Add New Subject'}</CardTitle>
                            <Button variant="ghost" size="icon" onClick={resetForm}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Subject Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Data Structures"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="code">Subject Code (optional)</Label>
                                <Input
                                    id="code"
                                    placeholder="e.g., CS301"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={!isPractical}
                                            onChange={() => setIsPractical(false)}
                                            className="text-purple-600"
                                        />
                                        <span>Theory</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={isPractical}
                                            onChange={() => setIsPractical(true)}
                                            className="text-purple-600"
                                        />
                                        <span>Practical/Lab</span>
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-2 flex-1">
                                <Label>Color</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {SUBJECT_COLORS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setColor(c)}
                                            className={`w-8 h-8 rounded-lg transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                                                }`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
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
                    placeholder="Search subjects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Subjects List */}
            {filteredSubjects.length > 0 ? (
                <div className="grid gap-4">
                    {filteredSubjects.map((subject) => (
                        <Card key={subject.id} className="premium-card">
                            <CardContent className="flex items-center justify-between py-4">
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: subject.color }}
                                    >
                                        {subject.is_practical ? (
                                            <Beaker className="w-6 h-6 text-white" />
                                        ) : (
                                            <BookOpen className="w-6 h-6 text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{subject.name}</h3>
                                            {subject.is_practical && (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                                    Practical
                                                </span>
                                            )}
                                        </div>
                                        {subject.code && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {subject.code}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(subject)}
                                        className="text-gray-500 hover:text-blue-600"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(subject.id)}
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
                        <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            {searchQuery ? 'No Subjects Found' : 'No Subjects Added'}
                        </h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                            {searchQuery
                                ? 'Try a different search term'
                                : 'Add your first subject to get started'
                            }
                        </p>
                        {!searchQuery && (
                            <Button onClick={() => setShowAddForm(true)} className="btn-gradient">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Subject
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
