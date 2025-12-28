'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
    Plus,
    Trash2,
    Calendar,
    Loader2,
    Search,
    ArrowRight,
    Download,
    CheckCircle2,
    Clock,
    Filter
} from 'lucide-react'
import type { Timetable } from '@/lib/types'

export default function TimetablesPage() {
    const [timetables, setTimetables] = useState<Timetable[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'done'>('all')
    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()

    useEffect(() => {
        fetchTimetables()
    }, [])

    const fetchTimetables = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('timetables')
                .select('*')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })

            if (error) throw error
            setTimetables(data || [])
        } catch (error) {
            console.error('Error fetching timetables:', error)
            toast({
                title: 'Error',
                description: 'Failed to load timetables',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!confirm('Are you sure you want to delete this timetable? All slots will be deleted.')) return

        try {
            const { error } = await supabase
                .from('timetables')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast({ title: 'Deleted', description: 'Timetable removed successfully' })
            fetchTimetables()
        } catch (error) {
            console.error('Error deleting timetable:', error)
            toast({
                title: 'Error',
                description: 'Failed to delete timetable',
                variant: 'destructive'
            })
        }
    }

    const filteredTimetables = timetables.filter(t => {
        const matchesSearch =
            t.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.semester.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.section?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.year.includes(searchQuery)

        const matchesStatus =
            statusFilter === 'all' || t.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const stats = {
        total: timetables.length,
        done: timetables.filter(t => t.status === 'done').length,
        inProgress: timetables.filter(t => t.status === 'in_progress').length
    }

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
                    <h1 className="text-3xl font-bold">Timetables</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage all your class timetables
                    </p>
                </div>
                <Link href="/dashboard/timetables/new">
                    <Button className="btn-gradient">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Timetable
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="premium-card">
                    <CardContent className="py-4 text-center">
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-sm text-gray-500">Total</p>
                    </CardContent>
                </Card>
                <Card className="premium-card">
                    <CardContent className="py-4 text-center">
                        <p className="text-2xl font-bold text-green-600">{stats.done}</p>
                        <p className="text-sm text-gray-500">Completed</p>
                    </CardContent>
                </Card>
                <Card className="premium-card">
                    <CardContent className="py-4 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
                        <p className="text-sm text-gray-500">In Progress</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        placeholder="Search timetables..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'in_progress', 'done'].map((status) => (
                        <Button
                            key={status}
                            variant={statusFilter === status ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(status as any)}
                            className={statusFilter === status ? 'btn-gradient' : ''}
                        >
                            {status === 'all' ? 'All' : status === 'done' ? 'Completed' : 'In Progress'}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Timetables List */}
            {filteredTimetables.length > 0 ? (
                <div className="grid gap-4">
                    {filteredTimetables.map((timetable) => (
                        <Link key={timetable.id} href={`/dashboard/timetables/${timetable.id}`}>
                            <Card className="premium-card hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer">
                                <CardContent className="flex items-center justify-between py-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${timetable.status === 'done'
                                                ? 'bg-green-100 dark:bg-green-900/30'
                                                : 'bg-purple-100 dark:bg-purple-900/30'
                                            }`}>
                                            {timetable.status === 'done' ? (
                                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                                            ) : (
                                                <Clock className="w-6 h-6 text-purple-600" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">
                                                {timetable.class_name} - Sem {timetable.semester}
                                                {timetable.section && ` (Section ${timetable.section})`}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {timetable.year} • Updated {new Date(timetable.updated_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={timetable.status === 'done' ? 'badge-done' : 'badge-progress'}>
                                            {timetable.status === 'done' ? 'Completed' : 'In Progress'}
                                        </span>
                                        {timetable.status === 'done' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    router.push(`/dashboard/timetables/${timetable.id}/export`)
                                                }}
                                                className="text-gray-500 hover:text-purple-600"
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => handleDelete(timetable.id, e)}
                                            className="text-gray-500 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <ArrowRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <Card className="premium-card">
                    <CardContent className="py-12 text-center">
                        <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-500 dark:text-gray-400 mb-2">
                            {searchQuery || statusFilter !== 'all' ? 'No Timetables Found' : 'No Timetables Created'}
                        </h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                            {searchQuery || statusFilter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Create your first timetable to get started'
                            }
                        </p>
                        {!searchQuery && statusFilter === 'all' && (
                            <Link href="/dashboard/timetables/new">
                                <Button className="btn-gradient">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Timetable
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
