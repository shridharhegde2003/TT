'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Save } from 'lucide-react'

interface ClassTiming {
  start: string
  end: string
}

interface Break {
  name: string
  start: string
  end: string
}

interface Settings {
  id: string
  class_timings: ClassTiming[]
  breaks: Break[]
  working_days: string[]
  default_heading: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error)
        return
      }

      if (data) {
        setSettings(data)
      } else {
        // Create default settings
        const defaultSettings = {
          user_id: user.id,
          class_timings: [
            { start: '08:55', end: '09:50' },
            { start: '09:50', end: '10:45' },
            { start: '11:00', end: '11:55' },
            { start: '11:55', end: '12:50' },
            { start: '14:00', end: '14:55' },
            { start: '14:55', end: '15:50' },
            { start: '16:00', end: '16:55' }
          ],
          breaks: [
            { name: 'Coffee Break', start: '10:45', end: '11:00' },
            { name: 'Lunch Break', start: '12:50', end: '14:00' }
          ],
          working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          default_heading: 'MCA SEM-III TIME TABLE 2025 (SECTION B)'
        }

        const { data: newSettings, error: insertError } = await supabase
          .from('settings')
          .insert([defaultSettings])
          .select()
          .single()

        if (insertError) {
          console.error('Error creating settings:', insertError)
        } else {
          setSettings(newSettings)
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          class_timings: settings.class_timings,
          breaks: settings.breaks,
          working_days: settings.working_days,
          default_heading: settings.default_heading
        })
        .eq('id', settings.id)

      if (error) {
        console.error('Error updating settings:', error)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSaving(false)
    }
  }

  const addClassTiming = () => {
    if (!settings) return
    setSettings({
      ...settings,
      class_timings: [...settings.class_timings, { start: '09:00', end: '10:00' }]
    })
  }

  const removeClassTiming = (index: number) => {
    if (!settings) return
    setSettings({
      ...settings,
      class_timings: settings.class_timings.filter((_, i) => i !== index)
    })
  }

  const updateClassTiming = (index: number, field: 'start' | 'end', value: string) => {
    if (!settings) return
    const updated = [...settings.class_timings]
    updated[index][field] = value
    setSettings({ ...settings, class_timings: updated })
  }

  const addBreak = () => {
    if (!settings) return
    setSettings({
      ...settings,
      breaks: [...settings.breaks, { name: 'Break', start: '12:00', end: '13:00' }]
    })
  }

  const removeBreak = (index: number) => {
    if (!settings) return
    setSettings({
      ...settings,
      breaks: settings.breaks.filter((_, i) => i !== index)
    })
  }

  const updateBreak = (index: number, field: 'name' | 'start' | 'end', value: string) => {
    if (!settings) return
    const updated = [...settings.breaks]
    updated[index][field] = value
    setSettings({ ...settings, breaks: updated })
  }

  const toggleWorkingDay = (day: string) => {
    if (!settings) return
    const updated = settings.working_days.includes(day)
      ? settings.working_days.filter(d => d !== day)
      : [...settings.working_days, day]
    setSettings({ ...settings, working_days: updated })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading settings...</div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Failed to load settings</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your timetable settings including class timings, breaks, and working days.
        </p>
      </div>

      <div className="space-y-8">
        {/* Default Heading */}
        <Card>
          <CardHeader>
            <CardTitle>Default Heading</CardTitle>
            <CardDescription>
              Set the default heading that will appear on your timetables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="heading">Timetable Heading</Label>
              <Input
                id="heading"
                value={settings.default_heading}
                onChange={(e) => setSettings({ ...settings, default_heading: e.target.value })}
                placeholder="e.g., MCA SEM-III TIME TABLE 2025 (SECTION B)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Class Timings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Class Timings</CardTitle>
                <CardDescription>
                  Configure the time slots for each class period
                </CardDescription>
              </div>
              <Button onClick={addClassTiming} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Period
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settings.class_timings.map((timing, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label>Period {index + 1}</Label>
                    <div className="flex space-x-2 mt-1">
                      <Input
                        type="time"
                        value={timing.start}
                        onChange={(e) => updateClassTiming(index, 'start', e.target.value)}
                      />
                      <Input
                        type="time"
                        value={timing.end}
                        onChange={(e) => updateClassTiming(index, 'end', e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeClassTiming(index)}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Breaks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Breaks</CardTitle>
                <CardDescription>
                  Configure break periods between classes
                </CardDescription>
              </div>
              <Button onClick={addBreak} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Break
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settings.breaks.map((breakItem, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label>Break {index + 1}</Label>
                    <div className="flex space-x-2 mt-1">
                      <Input
                        value={breakItem.name}
                        onChange={(e) => updateBreak(index, 'name', e.target.value)}
                        placeholder="Break name"
                      />
                      <Input
                        type="time"
                        value={breakItem.start}
                        onChange={(e) => updateBreak(index, 'start', e.target.value)}
                      />
                      <Input
                        type="time"
                        value={breakItem.end}
                        onChange={(e) => updateBreak(index, 'end', e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeBreak(index)}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Working Days */}
        <Card>
          <CardHeader>
            <CardTitle>Working Days</CardTitle>
            <CardDescription>
              Select which days of the week are working days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={day}
                    checked={settings.working_days.includes(day)}
                    onChange={() => toggleWorkingDay(day)}
                    className="rounded"
                  />
                  <Label htmlFor={day}>{day}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={updateSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  )
}
