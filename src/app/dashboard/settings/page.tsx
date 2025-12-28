'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
    Save,
    Loader2,
    Building2,
    Clock,
    Coffee,
    UtensilsCrossed,
    Plus,
    Trash2,
    Calendar
} from 'lucide-react'
import type { CollegeSettings, BreakTime } from '@/lib/types'
import { DAYS_OF_WEEK } from '@/lib/types'

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState<CollegeSettings | null>(null)

    // Form state
    const [collegeName, setCollegeName] = useState('')
    const [collegeStartTime, setCollegeStartTime] = useState('08:30')
    const [collegeEndTime, setCollegeEndTime] = useState('17:00')
    const [defaultClassDuration, setDefaultClassDuration] = useState(55)
    const [lunchStartTime, setLunchStartTime] = useState('12:30')
    const [lunchEndTime, setLunchEndTime] = useState('13:30')
    const [breaks, setBreaks] = useState<BreakTime[]>([])
    const [workingDays, setWorkingDays] = useState<string[]>([])

    const supabase = createClient()
    const { toast } = useToast()

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('college_settings')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (error && error.code !== 'PGRST116') throw error

            if (data) {
                setSettings(data)
                setCollegeName(data.college_name)
                setCollegeStartTime(data.college_start_time)
                setCollegeEndTime(data.college_end_time)
                setDefaultClassDuration(data.default_class_duration)
                setLunchStartTime(data.lunch_start_time)
                setLunchEndTime(data.lunch_end_time)
                setBreaks(data.breaks || [])
                setWorkingDays(data.working_days || [])
            }
        } catch (error) {
            console.error('Error:', error)
            toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!collegeName.trim()) {
            toast({ title: 'Name Required', description: 'Please enter college name', variant: 'destructive' })
            return
        }

        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const settingsData = {
                college_name: collegeName,
                college_start_time: collegeStartTime,
                college_end_time: collegeEndTime,
                default_class_duration: defaultClassDuration,
                lunch_start_time: lunchStartTime,
                lunch_end_time: lunchEndTime,
                breaks: breaks.filter(b => b.name.trim()),
                working_days: workingDays
            }

            if (settings) {
                const { error } = await supabase
                    .from('college_settings')
                    .update(settingsData)
                    .eq('id', settings.id)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('college_settings')
                    .insert([{ ...settingsData, user_id: user.id }])

                if (error) throw error
            }

            toast({ title: 'Saved!', description: 'Settings updated successfully' })
            fetchSettings()
        } catch (error) {
            console.error('Error:', error)
            toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const addBreak = () => {
        setBreaks([...breaks, { name: '', start_time: '15:00', end_time: '15:15' }])
    }

    const updateBreak = (index: number, field: keyof BreakTime, value: string) => {
        const updated = [...breaks]
        updated[index] = { ...updated[index], [field]: value }
        setBreaks(updated)
    }

    const removeBreak = (index: number) => {
        setBreaks(breaks.filter((_, i) => i !== index))
    }

    const toggleWorkingDay = (day: string) => {
        if (workingDays.includes(day)) {
            setWorkingDays(workingDays.filter(d => d !== day))
        } else {
            setWorkingDays([...workingDays, day])
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Manage your college configuration
                </p>
            </div>

            {/* College Info */}
            <Card className="premium-card">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle>College Information</CardTitle>
                            <CardDescription>Basic institution details</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="collegeName">College/Institution Name</Label>
                        <Input
                            id="collegeName"
                            value={collegeName}
                            onChange={(e) => setCollegeName(e.target.value)}
                            placeholder="Enter college name"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Timings */}
            <Card className="premium-card">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle>College Timings</CardTitle>
                            <CardDescription>Operating hours and class duration</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>College Starts At</Label>
                            <Input
                                type="time"
                                value={collegeStartTime}
                                onChange={(e) => setCollegeStartTime(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>College Ends At</Label>
                            <Input
                                type="time"
                                value={collegeEndTime}
                                onChange={(e) => setCollegeEndTime(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Default Class Duration (minutes)</Label>
                        <Input
                            type="number"
                            min={30}
                            max={120}
                            value={defaultClassDuration}
                            onChange={(e) => setDefaultClassDuration(parseInt(e.target.value) || 55)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Lunch & Breaks */}
            <Card className="premium-card">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-red-600 flex items-center justify-center">
                            <UtensilsCrossed className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle>Breaks</CardTitle>
                            <CardDescription>Lunch and other break times</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Lunch */}
                    <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                        <Label className="font-semibold text-orange-700 dark:text-orange-400 mb-3 block">
                            Lunch Break
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-sm">Start</Label>
                                <Input
                                    type="time"
                                    value={lunchStartTime}
                                    onChange={(e) => setLunchStartTime(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-sm">End</Label>
                                <Input
                                    type="time"
                                    value={lunchEndTime}
                                    onChange={(e) => setLunchEndTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Other Breaks */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Coffee className="w-5 h-5 text-blue-600" />
                                <Label className="font-semibold">Other Breaks</Label>
                            </div>
                            <Button onClick={addBreak} variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-1" />
                                Add Break
                            </Button>
                        </div>

                        {breaks.map((brk, index) => (
                            <div
                                key={index}
                                className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div className="sm:col-span-2 space-y-1">
                                        <Label className="text-sm">Name</Label>
                                        <Input
                                            placeholder="e.g., Tea Break"
                                            value={brk.name}
                                            onChange={(e) => updateBreak(index, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm">Start</Label>
                                        <Input
                                            type="time"
                                            value={brk.start_time}
                                            onChange={(e) => updateBreak(index, 'start_time', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm">End</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="time"
                                                value={brk.end_time}
                                                onChange={(e) => updateBreak(index, 'end_time', e.target.value)}
                                            />
                                            <Button
                                                onClick={() => removeBreak(index)}
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Working Days */}
            <Card className="premium-card">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle>Working Days</CardTitle>
                            <CardDescription>Days when college operates</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {DAYS_OF_WEEK.map((day) => (
                            <button
                                key={day}
                                onClick={() => toggleWorkingDay(day)}
                                className={`p-3 rounded-xl border-2 font-medium transition-all ${workingDays.includes(day)
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="btn-gradient px-8">
                    {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Settings
                </Button>
            </div>
        </div>
    )
}
