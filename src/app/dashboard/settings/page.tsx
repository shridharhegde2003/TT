'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Save, Building, Clock, Calendar, Coffee, UtensilsCrossed } from 'lucide-react'

interface CollegeSettings {
    college_name: string
    college_start_time: string
    college_end_time: string
    default_class_duration: number
    lunch_start_time: string
    lunch_end_time: string
    break_duration: number
    working_days: string[]
}

const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function SettingsPage() {
    const [settings, setSettings] = useState<CollegeSettings>({
        college_name: '',
        college_start_time: '08:30',
        college_end_time: '17:00',
        default_class_duration: 55,
        lunch_start_time: '12:30',
        lunch_end_time: '13:30',
        break_duration: 15,
        working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    })
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

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
        loadSettings()
    }, [])

    const loadSettings = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data } = await supabase.from('college_settings').select('*').eq('user_id', user.id).single()
            if (data) {
                setSettings({
                    college_name: data.college_name || '',
                    college_start_time: data.college_start_time || '08:30',
                    college_end_time: data.college_end_time || '17:00',
                    default_class_duration: data.default_class_duration || 55,
                    lunch_start_time: data.lunch_start_time || '12:30',
                    lunch_end_time: data.lunch_end_time || '13:30',
                    break_duration: data.break_duration || 15,
                    working_days: data.working_days || allDays
                })
            }
        }
        setLoading(false)
    }

    const toggleDay = (day: string) => {
        if (settings.working_days.includes(day)) {
            setSettings({ ...settings, working_days: settings.working_days.filter(d => d !== day) })
        } else {
            setSettings({ ...settings, working_days: [...settings.working_days, day] })
        }
    }

    const handleSave = async () => {
        if (!settings.college_name.trim()) {
            toast({ title: 'Error', description: 'College name is required', variant: 'destructive' })
            return
        }

        setSaving(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const { error } = await supabase.from('college_settings').upsert({
                user_id: user.id,
                ...settings
            }, { onConflict: 'user_id' })

            if (error) {
                console.error('Save error:', error)
                toast({ title: 'Error', description: error.message, variant: 'destructive' })
            } else {
                toast({ title: 'Saved', description: 'Settings updated successfully' })
            }
        }
        setSaving(false)
    }

    // Calculate lunch duration
    const getLunchDuration = () => {
        const [startH, startM] = settings.lunch_start_time.split(':').map(Number)
        const [endH, endM] = settings.lunch_end_time.split(':').map(Number)
        return (endH * 60 + endM) - (startH * 60 + startM)
    }

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>Loading...</div>
    }

    return (
        <div style={{ maxWidth: '700px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                Settings
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '32px' }}>
                Configure your college settings and preferences
            </p>

            {/* College Info */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building size={20} />
                    College Information
                </h2>
                <div>
                    <label style={labelStyle}>College Name *</label>
                    <input
                        type="text"
                        value={settings.college_name}
                        onChange={(e) => setSettings({ ...settings, college_name: e.target.value })}
                        placeholder="Your College Name"
                        style={inputStyle}
                    />
                </div>
            </div>

            {/* Timings */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={20} />
                    College Timings
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div>
                        <label style={labelStyle}>Start Time</label>
                        <input
                            type="time"
                            value={settings.college_start_time}
                            onChange={(e) => setSettings({ ...settings, college_start_time: e.target.value })}
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>End Time</label>
                        <input
                            type="time"
                            value={settings.college_end_time}
                            onChange={(e) => setSettings({ ...settings, college_end_time: e.target.value })}
                            style={inputStyle}
                        />
                    </div>
                </div>
                <div>
                    <label style={labelStyle}>Class/Period Duration (minutes)</label>
                    <input
                        type="number"
                        value={settings.default_class_duration}
                        onChange={(e) => setSettings({ ...settings, default_class_duration: parseInt(e.target.value) || 55 })}
                        min="30"
                        max="120"
                        style={inputStyle}
                    />
                </div>
            </div>

            {/* Lunch Break */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UtensilsCrossed size={20} />
                    Lunch Break
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={labelStyle}>Lunch Start Time</label>
                        <input
                            type="time"
                            value={settings.lunch_start_time}
                            onChange={(e) => setSettings({ ...settings, lunch_start_time: e.target.value })}
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Lunch End Time</label>
                        <input
                            type="time"
                            value={settings.lunch_end_time}
                            onChange={(e) => setSettings({ ...settings, lunch_end_time: e.target.value })}
                            style={inputStyle}
                        />
                    </div>
                </div>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                    Lunch duration: {getLunchDuration()} minutes
                </p>
            </div>

            {/* Short Break */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Coffee size={20} />
                    Short Break (Tea/Coffee Break)
                </h2>
                <div>
                    <label style={labelStyle}>Break Duration (minutes)</label>
                    <input
                        type="number"
                        value={settings.break_duration}
                        onChange={(e) => setSettings({ ...settings, break_duration: parseInt(e.target.value) || 15 })}
                        min="5"
                        max="30"
                        style={inputStyle}
                    />
                    <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                        This is the duration for short breaks (not lunch). Default: 15 minutes.
                    </p>
                </div>
            </div>

            {/* Working Days */}
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={20} />
                    Working Days
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
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
                                borderColor: settings.working_days.includes(day) ? '#4f46e5' : '#e5e7eb',
                                borderRadius: '8px',
                                background: settings.working_days.includes(day) ? '#eef2ff' : 'white',
                                color: settings.working_days.includes(day) ? '#4f46e5' : '#374151',
                                cursor: 'pointer'
                            }}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={saving}
                style={{
                    width: '100%',
                    padding: '16px',
                    background: saving ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '16px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}
            >
                <Save size={20} />
                {saving ? 'Saving...' : 'Save Settings'}
            </button>
        </div>
    )
}
