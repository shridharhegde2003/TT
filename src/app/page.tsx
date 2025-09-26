import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            Time Table Generator
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Create professional academic timetables with ease. Configure settings, add subjects, and generate optimized schedules automatically.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl">⚙️ Settings</CardTitle>
              <CardDescription>
                Configure class timings, breaks, working days, and default headings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/settings">
                <Button className="w-full">Configure Settings</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl">📚 Subjects</CardTitle>
              <CardDescription>
                Add subjects, assign faculty, specify classrooms and weekly periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/input">
                <Button className="w-full">Add Subjects</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-2xl">📅 Preview</CardTitle>
              <CardDescription>
                View generated timetable and export as PDF, JPG, or PNG
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/preview">
                <Button className="w-full">View Timetable</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Features
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🎯 Smart Scheduling</h3>
                <p className="text-gray-600 dark:text-gray-300">Automatically generates clash-free timetables with even distribution</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📤 Export Options</h3>
                <p className="text-gray-600 dark:text-gray-300">Download your timetable as PDF, JPG, or PNG formats</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🌙 Dark Mode</h3>
                <p className="text-gray-600 dark:text-gray-300">Built-in dark and light theme support</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📱 Responsive</h3>
                <p className="text-gray-600 dark:text-gray-300">Works perfectly on desktop, tablet, and mobile devices</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
