'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Calendar, ArrowRight, ArrowLeft, Check, Building, Clock } from 'lucide-react'

export default function OnboardingPage() {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [collegeName, setCollegeName] = useState('')
    const [startTime, setStartTime] = useState('08:30')
    const [endTime, setEndTime] = useState('17:00')
    const [classDuration, setClassDuration] = useState('55')
    const [lunchStart, setLunchStart] = useState('12:30')
    const [lunchEnd, setLunchEnd] = useState('13:30')
    const [workingDays, setWorkingDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])

    const router = useRouter()
    const supabase = createClient()
    const { toast } = useToast()

    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/auth')
            }
        }
        checkAuth()
    }, [])

    const toggleDay = (day: string) => {
        if (workingDays.includes(day)) {
            setWorkingDays(workingDays.filter(d => d !== day))
        } else {
            setWorkingDays([...workingDays, day])
        }
    }

    const handleComplete = async () => {
        if (!collegeName.trim()) {
            toast({ title: 'Error', description: 'Please enter college name', variant: 'destructive' })
            return
        }

        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            // Save college settings
            const { error: settingsError } = await supabase.from('college_settings').upsert({
                user_id: user.id,
                college_name: collegeName,
                college_start_time: startTime,
                college_end_time: endTime,
                default_class_duration: parseInt(classDuration),
                lunch_start_time: lunchStart,
                lunch_end_time: lunchEnd,
                working_days: workingDays
            }, { onConflict: 'user_id' })

            if (settingsError) {
                console.error('Settings error:', settingsError)
                toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
                setLoading(false)
                return
            }

            // Mark user as onboarded
            await supabase.from('user_profiles').update({ is_onboarded: true }).eq('user_id', user.id)

            toast({ title: 'Setup Complete!', description: 'Your college has been configured' })
            router.push('/dashboard')
        }
        setLoading(false)
    }

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        fontSize: '16px',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        outline: 'none',
        boxSizing: 'border-box' as const,
        backgroundColor: 'white'
    }

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600' as const,
        color: '#374151',
        fontSize: '14px'
    }

    const buttonPrimary = {
        padding: '14px 28px',
        fontSize: '16px',
        fontWeight: '600' as const,
        color: 'white',
        background: '#4f46e5',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'inline-flex' as const,
        alignItems: 'center' as const,
        gap: '8px'
    }

    const buttonSecondary = {
        padding: '14px 28px',
        fontSize: '16px',
        fontWeight: '500' as const,
        color: '#4b5563',
        background: '#f3f4f6',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'inline-flex' as const,
        alignItems: 'center' as const,
        gap: '8px'
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f9fafb',
            padding: '40px 20px'
        }}>
            <div style={{
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        background: '#4f46e5',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px'
                    }}>
                        <Calendar size={32} color="white" />
                    </div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                        Welcome to TimeTable Pro
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '16px' }}>
                        Let's set up your college in just a few steps
                    </p>
                </div>

                {/* Progress */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '40px' }}>
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            style={{
                                width: '80px',
                                height: '4px',
                                borderRadius: '2px',
                                background: s <= step ? '#4f46e5' : '#e5e7eb'
                            }}
                        />
                    ))}
                </div>

                {/* Card */}
                <div style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '32px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
                }}>
                    {/* Step 1: College Name */}
                    {step === 1 && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Building size={24} />
                                Step 1: College Information
                            </h2>
                            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                                Enter your college or institution name
                            </p>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={labelStyle}>College Name *</label>
                                <input
                                    type="text"
                                    value={collegeName}
                                    onChange={(e) => setCollegeName(e.target.value)}
                                    placeholder="e.g., ABC Engineering College"
                                    style={inputStyle}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => collegeName.trim() ? setStep(2) : toast({ title: 'Required', description: 'Enter college name', variant: 'destructive' })}
                                    style={buttonPrimary}
                                >
                                    Next
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Timings */}
                    {step === 2 && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={24} />
                                Step 2: College Timings
                            </h2>
                            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                                Configure your college hours and class duration
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Start Time</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>End Time</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={labelStyle}>Class Duration (minutes)</label>
                                <input
                                    type="number"
                                    value={classDuration}
                                    onChange={(e) => setClassDuration(e.target.value)}
                                    min="30"
                                    max="120"
                                    style={inputStyle}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                <div>
                                    <label style={labelStyle}>Lunch Start</label>
                                    <input
                                        type="time"
                                        value={lunchStart}
                                        onChange={(e) => setLunchStart(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Lunch End</label>
                                    <input
                                        type="time"
                                        value={lunchEnd}
                                        onChange={(e) => setLunchEnd(e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button onClick={() => setStep(1)} style={buttonSecondary}>
                                    <ArrowLeft size={18} />
                                    Back
                                </button>
                                <button onClick={() => setStep(3)} style={buttonPrimary}>
                                    Next
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Working Days */}
                    {step === 3 && (
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={24} />
                                Step 3: Working Days
                            </h2>
                            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                                Select the days your college operates
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
                                {allDays.map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(day)}
                                        style={{
                                            padding: '12px',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            border: '2px solid',
                                            borderColor: workingDays.includes(day) ? '#4f46e5' : '#e5e7eb',
                                            borderRadius: '8px',
                                            background: workingDays.includes(day) ? '#eef2ff' : 'white',
                                            color: workingDays.includes(day) ? '#4f46e5' : '#374151',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button onClick={() => setStep(2)} style={buttonSecondary}>
                                    <ArrowLeft size={18} />
                                    Back
                                </button>
                                <button
                                    onClick={handleComplete}
                                    disabled={loading}
                                    style={{
                                        ...buttonPrimary,
                                        background: loading ? '#9ca3af' : '#10b981',
                                        cursor: loading ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {loading ? 'Saving...' : 'Complete Setup'}
                                    <Check size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary */}
                {step > 1 && collegeName && (
                    <div style={{
                        marginTop: '24px',
                        padding: '16px',
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb'
                    }}>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>College</p>
                        <p style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>{collegeName}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
