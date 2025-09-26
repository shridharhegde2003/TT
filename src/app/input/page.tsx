'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Play } from 'lucide-react'

interface Subject {
  id?: string
  subject_name: string
  subject_code: string
  faculty_name: string
  classroom: string
  periods_per_week: number
  semester: string
  color: string
}

const semesterOptions = [
  'Sem I', 'Sem II', 'Sem III', 'Sem IV', 'Sem V', 'Sem VI', 'Sem VII', 'Sem VIII'
]

const colorOptions = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
]

export default function InputPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching subjects:', error)
        return
      }

      setSubjects(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const addSubject = () => {
    const newSubject: Subject = {
      subject_name: '',
      subject_code: '',
      faculty_name: '',
      classroom: '',
      periods_per_week: 1,
      semester: 'Sem I',
      color: colorOptions[Math.floor(Math.random() * colorOptions.length)]
    }
    setSubjects([...subjects, newSubject])
  }

  const removeSubject = async (index: number) => {
    const subject = subjects[index]
    if (subject.id) {
      // Delete from database
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subject.id)

      if (error) {
        console.error('Error deleting subject:', error)
        return
      }
    }

    // Remove from local state
    setSubjects(subjects.filter((_, i) => i !== index))
  }

  const updateSubject = (index: number, field: keyof Subject, value: any) => {
    const updated = [...subjects]
    updated[index][field] = value
    setSubjects(updated)
  }

  const saveSubject = async (index: number) => {
    const subject = subjects[index]
    if (!subject.subject_name || !subject.faculty_name || !subject.classroom) {
      alert('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const subjectData = {
        ...subject,
        user_id: user.id
      }

      if (subject.id) {
        // Update existing subject
        const { error } = await supabase
          .from('subjects')
          .update(subjectData)
          .eq('id', subject.id)

        if (error) {
          console.error('Error updating subject:', error)
          alert('Error updating subject')
        }
      } else {
        // Create new subject
        const { error } = await supabase
          .from('subjects')
          .insert([subjectData])

        if (error) {
          console.error('Error creating subject:', error)
          alert('Error creating subject')
        } else {
          // Refresh subjects to get the ID
          await fetchSubjects()
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  const generateTimetable = () => {
    if (subjects.length === 0) {
      alert('Please add at least one subject before generating the timetable')
      return
    }

    router.push('/preview')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading subjects...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Add Subjects</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Add subjects with faculty assignments, classrooms, and weekly period requirements.
        </p>
      </div>

      <div className="space-y-6">
        {/* Add Subject Button */}
        <div className="flex justify-between items-center">
          <div></div>
          <Button onClick={addSubject}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        </div>

        {/* Subjects List */}
        <div className="space-y-6">
          {subjects.map((subject, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Subject {index + 1}
                    {subject.subject_name && ` - ${subject.subject_name}`}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => saveSubject(index)}
                      disabled={saving}
                      size="sm"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeSubject(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`subject_name_${index}`}>Subject Name *</Label>
                    <Input
                      id={`subject_name_${index}`}
                      value={subject.subject_name}
                      onChange={(e) => updateSubject(index, 'subject_name', e.target.value)}
                      placeholder="e.g., Data Structures"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`subject_code_${index}`}>Subject Code</Label>
                    <Input
                      id={`subject_code_${index}`}
                      value={subject.subject_code}
                      onChange={(e) => updateSubject(index, 'subject_code', e.target.value)}
                      placeholder="e.g., CS301"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`faculty_name_${index}`}>Faculty Name *</Label>
                    <Input
                      id={`faculty_name_${index}`}
                      value={subject.faculty_name}
                      onChange={(e) => updateSubject(index, 'faculty_name', e.target.value)}
                      placeholder="e.g., Dr. Smith"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`classroom_${index}`}>Classroom/Lab *</Label>
                    <Input
                      id={`classroom_${index}`}
                      value={subject.classroom}
                      onChange={(e) => updateSubject(index, 'classroom', e.target.value)}
                      placeholder="e.g., Room 101, Lab A"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`periods_per_week_${index}`}>Periods per Week</Label>
                    <Input
                      id={`periods_per_week_${index}`}
                      type="number"
                      min="1"
                      max="20"
                      value={subject.periods_per_week}
                      onChange={(e) => updateSubject(index, 'periods_per_week', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`semester_${index}`}>Semester</Label>
                    <Select
                      value={subject.semester}
                      onValueChange={(value) => updateSubject(index, 'semester', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {semesterOptions.map((sem) => (
                          <SelectItem key={sem} value={sem}>
                            {sem}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex space-x-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full border-2 ${
                            subject.color === color ? 'border-gray-900 dark:border-gray-100' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateSubject(index, 'color', color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {subjects.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No subjects added yet. Click "Add Subject" to get started.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Generate Timetable Button */}
        {subjects.length > 0 && (
          <div className="flex justify-center">
            <Button onClick={generateTimetable} size="lg" className="px-8">
              <Play className="h-5 w-5 mr-2" />
              Generate Timetable
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
