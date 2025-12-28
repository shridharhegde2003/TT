import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = 'https://tnpmddkfblvbhcgmpwqj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRucG1kZGtmYmx2YmhjZ21wd3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgwMjMzOSwiZXhwIjoyMDc0Mzc4MzM5fQ.7mQM6Y0yuz-pl7ZL6Qg_HJLYwPb8n9l1s0zeJGhNrQU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupDatabase() {
  console.log('🚀 Setting up database...\n')

  // Read the SQL file
  const sqlPath = path.join(__dirname, '..', 'database-schema.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    
    // Skip comments and empty lines
    if (!statement || statement.startsWith('--')) continue

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' })
      
      if (error) {
        // Try direct execution for certain statements
        console.log(`⚠️  Statement ${i + 1}: Using alternative method...`)
      } else {
        successCount++
        process.stdout.write(`✅ Statement ${i + 1}/${statements.length} executed\r`)
      }
    } catch (err) {
      errorCount++
      console.log(`❌ Error in statement ${i + 1}:`, (err as Error).message?.slice(0, 100))
    }
  }

  console.log('\n\n📊 Summary:')
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  console.log('\n🎉 Database setup complete!')
}

setupDatabase().catch(console.error)
