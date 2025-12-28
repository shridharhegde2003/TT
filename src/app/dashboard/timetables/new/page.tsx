'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
    Calendar,
    Loader2,
    ArrowLeft
} from 'lucide-react'
import { SEMESTER_OPTIONS, getYearOptions } from '@/lib/types'
import Link from 'next/link'

export default function NewTimetablePage() {
    const [loading, setLoading] = useState(false)
    const [checkingData, setCheckingData] = useState(true)
    const [hasLecturers, setHasLecturers] = useState(false)
    const [hasClassrooms, setHasClassrooms] = useState(false)

    // Form state
    const [className, setClassName] = useState('')
    const [semester, setSemester] = useState('I')
    const [year, setYear] = useState(String(new Date().getFullYear()))
    const [section, setSection] = useState('')

    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()

    const yearOptions = getYearOptions()

    useEffect(() => {
        checkPrerequisites()
    }, [])

    const checkPrerequisites = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth')
                return
            }

            const [{ count: lecturerCount }, { count: classroomCount }] = await Promise.all([
                supabase.from('lecturers').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('classrooms').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
            ])

            setHasLecturers((lecturerCount || 0) > 0)
            setHasClassrooms((classroomCount || 0) > 0)
        } catch (error) {
            console.error('Error checking prerequisites:', error)
        } finally {
            setCheckingData(false)
        }
    }

    const handleCreate = async () => {
        if (!className.trim()) {
            toast({
                title: 'Class Name Required',
                description: 'Please enter the class/program name',
                variant: 'destructive'
            })
            return
        }

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const title = `${className} Sem ${semester}${section ? ` Section ${section}` : ''} - ${year}`

            const { data, error } = await supabase
                .from('timetables')
                .insert([{
                    user_id: user.id,
                    class_name: className.trim(),
                    semester,
                    year,
                    section: section.trim() || null,
                    title,
                    status: 'in_progress'
                }])
                .select()
                .single()

            if (error) throw error

            toast({ title: 'Success', description: 'Timetable created! Start adding classes.' })
            router.push(`/dashboard/timetables/${data.id}`)
        } catch (error) {
            console.error('Error creating timetable:', error)
            toast({
                title: 'Error',
                description: 'Failed to create timetable',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    if (checkingData) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    const canCreate = hasLecturers && hasClassrooms

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/timetables">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Create New Timetable</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Set up a timetable for a class
                    </p>
                </div>
            </div>

            {/* Prerequisites Warning */}
            {!canCreate && (
                <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                    <CardContent className="py-4">
                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                            Prerequisites Missing
                        </h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                            Before creating a timetable, you need to add:
                        </p>
                        <div className="flex gap-2">
                            {!hasLecturers && (
                                <Link href="/dashboard/lecturers">
                                    <Button size="sm" variant="outline" className="border-yellow-400 text-yellow-700">
                                        Add Lecturers First
                                    </Button>
                                </Link>
                            )}
                            {!hasClassrooms && (
                                <Link href="/dashboard/classrooms">
                                    <Button size="sm" variant="outline" className="border-yellow-400 text-yellow-700">
                                        Add Classrooms First
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Form */}
            <Card className="premium-card">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                            <Calendar className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <CardTitle>Timetable Details</CardTitle>
                            <CardDescription>
                                Enter the class information for this timetable
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="className">Class/Program Name *</Label>
                        <Input
                            id="className"
                            placeholder="e.g., MCA, B.Tech CSE, BCA"
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            className="text-lg"
                        />
                        <p className="text-sm text-gray-500">
                            The name of the program or class
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="semester">Semester *</Label>
                            <Select value={semester} onValueChange={setSemester}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SEMESTER_OPTIONS.map((sem) => (
                                        <SelectItem key={sem} value={sem}>
                                            Semester {sem}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year">Year *</Label>
                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {yearOptions.map((y) => (
                                        <SelectItem key={y} value={y}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="section">Section (optional)</Label>
                        <Input
                            id="section"
                            placeholder="e.g., A, B, or leave empty"
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                        />
                        <p className="text-sm text-gray-500">
                            If the class has multiple sections, specify which one
                        </p>
                    </div>

                    {/* Preview */}
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Preview:</p>
                        <p className="font-semibold text-lg">
                            {className || 'Class Name'} - Sem {semester}
                            {section && ` (Section ${section})`} - {year}
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <Link href="/dashboard/timetables" className="flex-1">
                            <Button variant="outline" className="w-full">
                                Cancel
                            </Button>
                        </Link>
                        <Button
                            onClick={handleCreate}
                            disabled={loading || !canCreate}
                            className="flex-1 btn-gradient"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Calendar className="w-4 h-4 mr-2" />
                            )}
                            Create Timetable
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
