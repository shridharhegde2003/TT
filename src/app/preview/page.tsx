'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { TimetableGenerator, type Subject, type Settings, type TimetableData } from '@/lib/timetable-generator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, RefreshCw, ArrowLeft } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export default function PreviewPage() {
  const [timetableData, setTimetableData] = useState<TimetableData | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadDataAndGenerate()
  }, [])

  const loadDataAndGenerate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Load subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)

      if (subjectsError) {
        console.error('Error loading subjects:', subjectsError)
        return
      }

      // Load settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (settingsError) {
        console.error('Error loading settings:', settingsError)
        return
      }

      setSubjects(subjectsData || [])
      setSettings(settingsData)

      if (subjectsData && subjectsData.length > 0 && settingsData) {
        generateTimetable(subjectsData, settingsData)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateTimetable = async (subjectsData: Subject[], settingsData: Settings) => {
    setGenerating(true)
    try {
      const generator = new TimetableGenerator(subjectsData, settingsData)
      const generatedData = generator.generate()
      setTimetableData(generatedData)

      // Save to database
      const { error } = await supabase
        .from('timetables')
        .insert([{
          user_id: (await supabase.auth.getUser()).data.user?.id,
          title: settingsData.default_heading,
          semester: subjectsData[0]?.semester || 'Sem I',
          timetable_data: TimetableGenerator.getTimetableAsObject(generatedData),
          settings_used: settingsData
        }])

      if (error) {
        console.error('Error saving timetable:', error)
      }
    } catch (error) {
      console.error('Error generating timetable:', error)
    } finally {
      setGenerating(false)
    }
  }

  const exportToPDF = async () => {
    if (!timetableData) return

    const element = document.getElementById('timetable-container')
    if (!element) return

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('l', 'mm', 'a4')

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      const imgWidth = canvas.width
      const imgHeight = canvas.height

      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 30

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)

      // Add title
      pdf.setFontSize(16)
      pdf.text(timetableData.settings.default_heading, pdfWidth / 2, 20, { align: 'center' })

      pdf.save(`${timetableData.settings.default_heading.replace(/\s+/g, '_')}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    }
  }

  const exportToImage = async (format: 'png' | 'jpg') => {
    if (!timetableData) return

    const element = document.getElementById('timetable-container')
    if (!element) return

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      })

      const link = document.createElement('a')
      link.download = `${timetableData.settings.default_heading.replace(/\s+/g, '_')}.${format}`
      link.href = canvas.toDataURL(`image/${format}`)
      link.click()
    } catch (error) {
      console.error(`Error generating ${format.toUpperCase()}:`, error)
      alert(`Error generating ${format.toUpperCase()}. Please try again.`)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading timetable data...</div>
      </div>
    )
  }

  if (!subjects.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Subjects Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to add subjects before generating a timetable.
          </p>
          <Button onClick={() => router.push('/input')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Add Subjects
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Timetable Preview</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Generated timetable for {settings?.default_heading}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => generateTimetable(subjects, settings!)}
              disabled={generating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Regenerating...' : 'Regenerate'}
            </Button>
            <Button onClick={() => router.push('/input')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Subjects
            </Button>
          </div>
        </div>
      </div>

      {timetableData && (
        <>
          {/* Export Buttons */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>
                Download your timetable in different formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button onClick={exportToPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as PDF
                </Button>
                <Button variant="outline" onClick={() => exportToImage('png')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as PNG
                </Button>
                <Button variant="outline" onClick={() => exportToImage('jpg')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as JPG
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Timetable Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl">
                {timetableData.settings.default_heading}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div id="timetable-container" className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-800 font-semibold">
                        Time / Day
                      </th>
                      {timetableData.days.map((day) => (
                        <th
                          key={day}
                          className="border border-gray-300 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-800 font-semibold min-w-[150px]"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timetableData.timeSlots.map((timeSlot, timeIndex) => (
                      <tr key={timeSlot}>
                        <td className="border border-gray-300 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-800 font-medium">
                          {timeSlot}
                        </td>
                        {timetableData.days.map((_, dayIndex) => {
                          const slot = timetableData.slots[dayIndex][timeIndex]
                          return (
                            <td
                              key={`${dayIndex}-${timeIndex}`}
                              className="border border-gray-300 dark:border-gray-600 p-3 min-h-[80px] align-top"
                            >
                              {slot.subject && (
                                <div
                                  className="p-2 rounded text-white text-sm font-medium"
                                  style={{ backgroundColor: slot.subject.color }}
                                >
                                  <div className="font-bold">{slot.subject.subject_name}</div>
                                  <div className="text-xs opacity-90">{slot.subject.subject_code}</div>
                                  <div className="text-xs opacity-90">{slot.subject.faculty_name}</div>
                                  <div className="text-xs opacity-90">{slot.subject.classroom}</div>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {timetableData.subjects.map((subject) => (
                  <div key={subject.id} className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span className="text-sm">{subject.subject_name} ({subject.subject_code})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
