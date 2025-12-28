'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
    Building2,
    Clock,
    Coffee,
    UtensilsCrossed,
    Plus,
    Trash2,
    Loader2,
    CheckCircle2,
    ArrowRight,
    ArrowLeft
} from 'lucide-react'
import { DAYS_OF_WEEK } from '@/lib/types'

interface BreakTime {
    name: string
    start_time: string
    end_time: string
}

export default function OnboardingPage() {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)

    // Form data
    const [collegeName, setCollegeName] = useState('')
    const [collegeStartTime, setCollegeStartTime] = useState('08:30')
    const [collegeEndTime, setCollegeEndTime] = useState('17:00')
    const [defaultClassDuration, setDefaultClassDuration] = useState(55)
    const [lunchStartTime, setLunchStartTime] = useState('12:30')
    const [lunchEndTime, setLunchEndTime] = useState('13:30')
    const [breaks, setBreaks] = useState<BreakTime[]>([
        { name: 'Tea Break', start_time: '10:30', end_time: '10:45' }
    ])
    const [workingDays, setWorkingDays] = useState<string[]>([
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ])

    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/auth')
            return
        }

        // Check if already onboarded
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('is_onboarded')
            .eq('user_id', user.id)
            .single()

        if (profile?.is_onboarded) {
            router.push('/dashboard')
            return
        }

        setCheckingAuth(false)
    }

    const addBreak = () => {
        setBreaks([...breaks, { name: '', start_time: '15:00', end_time: '15:15' }])
    }

    const removeBreak = (index: number) => {
        setBreaks(breaks.filter((_, i) => i !== index))
    }

    const updateBreak = (index: number, field: keyof BreakTime, value: string) => {
        const updated = [...breaks]
        updated[index][field] = value
        setBreaks(updated)
    }

    const toggleWorkingDay = (day: string) => {
        if (workingDays.includes(day)) {
            setWorkingDays(workingDays.filter(d => d !== day))
        } else {
            setWorkingDays([...workingDays, day])
        }
    }

    const validateStep1 = () => {
        if (!collegeName.trim()) {
            toast({
                title: 'College Name Required',
                description: 'Please enter your college/institution name',
                variant: 'destructive'
            })
            return false
        }
        return true
    }

    const validateStep2 = () => {
        if (collegeStartTime >= collegeEndTime) {
            toast({
                title: 'Invalid Timings',
                description: 'College end time must be after start time',
                variant: 'destructive'
            })
            return false
        }
        if (defaultClassDuration < 30 || defaultClassDuration > 120) {
            toast({
                title: 'Invalid Duration',
                description: 'Class duration should be between 30 and 120 minutes',
                variant: 'destructive'
            })
            return false
        }
        return true
    }

    const validateStep3 = () => {
        if (lunchStartTime >= lunchEndTime) {
            toast({
                title: 'Invalid Lunch Time',
                description: 'Lunch end time must be after start time',
                variant: 'destructive'
            })
            return false
        }
        for (const brk of breaks) {
            if (brk.name && brk.start_time >= brk.end_time) {
                toast({
                    title: 'Invalid Break Time',
                    description: `Break "${brk.name}" end time must be after start time`,
                    variant: 'destructive'
                })
                return false
            }
        }
        return true
    }

    const validateStep4 = () => {
        if (workingDays.length === 0) {
            toast({
                title: 'No Working Days',
                description: 'Please select at least one working day',
                variant: 'destructive'
            })
            return false
        }
        return true
    }

    const nextStep = () => {
        if (step === 1 && !validateStep1()) return
        if (step === 2 && !validateStep2()) return
        if (step === 3 && !validateStep3()) return
        if (step === 4 && !validateStep4()) return

        if (step < 4) {
            setStep(step + 1)
        } else {
            handleComplete()
        }
    }

    const prevStep = () => {
        if (step > 1) setStep(step - 1)
    }

    const handleComplete = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth')
                return
            }

            // Filter out empty breaks
            const validBreaks = breaks.filter(b => b.name.trim() !== '')

            // Save college settings
            const { error: settingsError } = await supabase
                .from('college_settings')
                .insert([{
                    user_id: user.id,
                    college_name: collegeName,
                    college_start_time: collegeStartTime,
                    college_end_time: collegeEndTime,
                    default_class_duration: defaultClassDuration,
                    lunch_start_time: lunchStartTime,
                    lunch_end_time: lunchEndTime,
                    breaks: validBreaks,
                    working_days: workingDays
                }])

            if (settingsError) {
                console.error('Settings error:', settingsError)
                toast({
                    title: 'Error',
                    description: 'Failed to save settings. Please try again.',
                    variant: 'destructive'
                })
                return
            }

            // Update user profile as onboarded
            const { error: profileError } = await supabase
                .from('user_profiles')
                .update({ is_onboarded: true })
                .eq('user_id', user.id)

            if (profileError) {
                console.error('Profile error:', profileError)
            }

            toast({
                title: 'Setup Complete!',
                description: 'Your college settings have been saved',
            })
            router.push('/dashboard')
        } catch (error) {
            console.error('Error:', error)
            toast({
                title: 'Error',
                description: 'An unexpected error occurred',
                variant: 'destructive'
            })
        } finally {
            setLoading(false)
        }
    }

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Progress indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        {[1, 2, 3, 4].map((s) => (
                            <div key={s} className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${s < step
                                        ? 'bg-green-500 text-white'
                                        : s === step
                                            ? 'bg-purple-600 text-white scale-110'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                    }`}>
                                    {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
                                </div>
                                {s < 4 && (
                                    <div className={`w-16 sm:w-24 h-1 mx-2 rounded transition-all duration-300 ${s < step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="text-center text-gray-600 dark:text-gray-400">
                        Step {step} of 4
                    </p>
                </div>

                {/* Step 1: College Name */}
                {step === 1 && (
                    <Card className="premium-card">
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                                <Building2 className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle className="text-2xl">College/Institution Name</CardTitle>
                            <CardDescription>
                                This will appear on all your timetables and PDF exports
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="collegeName">Institution Name</Label>
                                <Input
                                    id="collegeName"
                                    type="text"
                                    placeholder="e.g., ABC University, XYZ College"
                                    value={collegeName}
                                    onChange={(e) => setCollegeName(e.target.value)}
                                    className="h-12 text-lg"
                                    autoFocus
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: College Timings */}
                {step === 2 && (
                    <Card className="premium-card">
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle className="text-2xl">College Timings</CardTitle>
                            <CardDescription>
                                Set your college operating hours and default class duration
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startTime">College Starts At</Label>
                                    <Input
                                        id="startTime"
                                        type="time"
                                        value={collegeStartTime}
                                        onChange={(e) => setCollegeStartTime(e.target.value)}
                                        className="h-12"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endTime">College Ends At</Label>
                                    <Input
                                        id="endTime"
                                        type="time"
                                        value={collegeEndTime}
                                        onChange={(e) => setCollegeEndTime(e.target.value)}
                                        className="h-12"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="classDuration">Default Class Duration (minutes)</Label>
                                <Input
                                    id="classDuration"
                                    type="number"
                                    min={30}
                                    max={120}
                                    value={defaultClassDuration}
                                    onChange={(e) => setDefaultClassDuration(parseInt(e.target.value) || 55)}
                                    className="h-12"
                                />
                                <p className="text-sm text-gray-500">
                                    Each class slot will be {defaultClassDuration} minutes by default
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Breaks & Lunch */}
                {step === 3 && (
                    <Card className="premium-card">
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                                <UtensilsCrossed className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle className="text-2xl">Breaks & Lunch Time</CardTitle>
                            <CardDescription>
                                Set lunch time and any other breaks during the day
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Lunch Time */}
                            <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <UtensilsCrossed className="w-5 h-5 text-orange-600" />
                                    <Label className="font-semibold text-orange-700 dark:text-orange-400">Lunch Break</Label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="lunchStart" className="text-sm">Start</Label>
                                        <Input
                                            id="lunchStart"
                                            type="time"
                                            value={lunchStartTime}
                                            onChange={(e) => setLunchStartTime(e.target.value)}
                                            className="h-10"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="lunchEnd" className="text-sm">End</Label>
                                        <Input
                                            id="lunchEnd"
                                            type="time"
                                            value={lunchEndTime}
                                            onChange={(e) => setLunchEndTime(e.target.value)}
                                            className="h-10"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Other Breaks */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Coffee className="w-5 h-5 text-purple-600" />
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
                                                <Label className="text-sm">Break Name</Label>
                                                <Input
                                                    type="text"
                                                    placeholder="e.g., Tea Break"
                                                    value={brk.name}
                                                    onChange={(e) => updateBreak(index, 'name', e.target.value)}
                                                    className="h-10"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-sm">Start</Label>
                                                <Input
                                                    type="time"
                                                    value={brk.start_time}
                                                    onChange={(e) => updateBreak(index, 'start_time', e.target.value)}
                                                    className="h-10"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-sm">End</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="time"
                                                        value={brk.end_time}
                                                        onChange={(e) => updateBreak(index, 'end_time', e.target.value)}
                                                        className="h-10"
                                                    />
                                                    <Button
                                                        onClick={() => removeBreak(index)}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {breaks.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">
                                        No breaks added. Click "Add Break" if you have tea/coffee breaks.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 4: Working Days */}
                {step === 4 && (
                    <Card className="premium-card">
                        <CardHeader className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle className="text-2xl">Working Days</CardTitle>
                            <CardDescription>
                                Select which days your college operates
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {DAYS_OF_WEEK.map((day) => (
                                    <button
                                        key={day}
                                        onClick={() => toggleWorkingDay(day)}
                                        className={`p-4 rounded-xl border-2 font-medium transition-all duration-200 ${workingDays.includes(day)
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm text-gray-500 text-center">
                                Selected: {workingDays.length} days
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                    <Button
                        onClick={prevStep}
                        variant="outline"
                        disabled={step === 1}
                        className="px-6"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous
                    </Button>
                    <Button
                        onClick={nextStep}
                        disabled={loading}
                        className="btn-gradient px-8"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : step === 4 ? (
                            <>
                                Complete Setup
                                <CheckCircle2 className="w-4 h-4 ml-2" />
                            </>
                        ) : (
                            <>
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
