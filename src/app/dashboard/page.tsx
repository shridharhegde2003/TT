'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Calendar,
    Users,
    Building2,
    BookOpen,
    Plus,
    ArrowRight,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react'
import type { Timetable, Lecturer, Classroom, Subject, CollegeSettings } from '@/lib/types'

interface DashboardStats {
    timetables: number
    timetablesDone: number
    lecturers: number
    classrooms: number
    subjects: number
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        timetables: 0,
        timetablesDone: 0,
        lecturers: 0,
        classrooms: 0,
        subjects: 0
    })
    const [recentTimetables, setRecentTimetables] = useState<Timetable[]>([])
    const [collegeSettings, setCollegeSettings] = useState<CollegeSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Fetch counts in parallel
            const [
                { count: timetableCount },
                { count: timetablesDoneCount },
                { count: lecturerCount },
                { count: classroomCount },
                { count: subjectCount },
                { data: recentData },
                { data: settingsData }
            ] = await Promise.all([
                supabase.from('timetables').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('timetables').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'done'),
                supabase.from('lecturers').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('classrooms').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('timetables').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5),
                supabase.from('college_settings').select('*').eq('user_id', user.id).single()
            ])

            setStats({
                timetables: timetableCount || 0,
                timetablesDone: timetablesDoneCount || 0,
                lecturers: lecturerCount || 0,
                classrooms: classroomCount || 0,
                subjects: subjectCount || 0
            })
            setRecentTimetables(recentData || [])
            setCollegeSettings(settingsData)
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const quickActions = [
        {
            title: 'Create Timetable',
            description: 'Start a new timetable for a class',
            href: '/dashboard/timetables/new',
            icon: Calendar,
            color: 'from-purple-600 to-indigo-600'
        },
        {
            title: 'Add Lecturer',
            description: 'Register a new faculty member',
            href: '/dashboard/lecturers',
            icon: Users,
            color: 'from-blue-600 to-cyan-600'
        },
        {
            title: 'Add Classroom',
            description: 'Add a new room or lab',
            href: '/dashboard/classrooms',
            icon: Building2,
            color: 'from-orange-600 to-red-600'
        },
        {
            title: 'Add Subject',
            description: 'Create a new subject/course',
            href: '/dashboard/subjects',
            icon: BookOpen,
            color: 'from-green-600 to-emerald-600'
        }
    ]

    const statCards = [
        {
            label: 'Total Timetables',
            value: stats.timetables,
            icon: Calendar,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100 dark:bg-purple-900/30'
        },
        {
            label: 'Completed',
            value: stats.timetablesDone,
            icon: CheckCircle2,
            color: 'text-green-600',
            bgColor: 'bg-green-100 dark:bg-green-900/30'
        },
        {
            label: 'Lecturers',
            value: stats.lecturers,
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100 dark:bg-blue-900/30'
        },
        {
            label: 'Classrooms',
            value: stats.classrooms,
            icon: Building2,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100 dark:bg-orange-900/30'
        },
        {
            label: 'Subjects',
            value: stats.subjects,
            icon: BookOpen,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
        }
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        )
    }

    const needsSetup = stats.lecturers === 0 || stats.classrooms === 0

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">
                    Welcome back! 👋
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    {collegeSettings?.college_name && `Managing timetables for ${collegeSettings.college_name}`}
                </p>
            </div>

            {/* Setup Alert */}
            {needsSetup && (
                <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                    <CardContent className="flex items-center gap-4 py-4">
                        <div className="w-10 h-10 rounded-full bg-yellow-200 dark:bg-yellow-800 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-yellow-700 dark:text-yellow-300" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Complete Your Setup</h3>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                Add lecturers and classrooms before creating timetables
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {stats.lecturers === 0 && (
                                <Link href="/dashboard/lecturers">
                                    <Button size="sm" variant="outline" className="border-yellow-400 text-yellow-700">
                                        Add Lecturers
                                    </Button>
                                </Link>
                            )}
                            {stats.classrooms === 0 && (
                                <Link href="/dashboard/classrooms">
                                    <Button size="sm" variant="outline" className="border-yellow-400 text-yellow-700">
                                        Add Classrooms
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {statCards.map((stat, index) => (
                    <Card key={index} className="premium-card">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action, index) => (
                        <Link key={index} href={action.href}>
                            <Card className="premium-card h-full group cursor-pointer">
                                <CardContent className="p-6">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <action.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="font-semibold mb-1">{action.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{action.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Timetables */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Recent Timetables</h2>
                    <Link href="/dashboard/timetables">
                        <Button variant="ghost" size="sm">
                            View All
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                </div>

                {recentTimetables.length > 0 ? (
                    <div className="space-y-3">
                        {recentTimetables.map((timetable) => (
                            <Link key={timetable.id} href={`/dashboard/timetables/${timetable.id}`}>
                                <Card className="premium-card hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer">
                                    <CardContent className="flex items-center justify-between py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">
                                                    {timetable.class_name} - Sem {timetable.semester}
                                                    {timetable.section && ` (Section ${timetable.section})`}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {timetable.year}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={timetable.status === 'done' ? 'badge-done' : 'badge-progress'}>
                                                {timetable.status === 'done' ? 'Completed' : 'In Progress'}
                                            </span>
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
                                No Timetables Yet
                            </h3>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                                Create your first timetable to get started
                            </p>
                            <Link href="/dashboard/timetables/new">
                                <Button className="btn-gradient">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Timetable
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* College Info Card */}
            {collegeSettings && (
                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle className="text-lg">College Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">College Hours</p>
                                <p className="font-medium">
                                    {collegeSettings.college_start_time} - {collegeSettings.college_end_time}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Class Duration</p>
                                <p className="font-medium">{collegeSettings.default_class_duration} minutes</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Lunch Break</p>
                                <p className="font-medium">
                                    {collegeSettings.lunch_start_time} - {collegeSettings.lunch_end_time}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Working Days</p>
                                <p className="font-medium">{collegeSettings.working_days?.length || 0} days</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
