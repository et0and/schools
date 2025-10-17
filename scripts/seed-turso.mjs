import { createClient } from '@libsql/client'

const API_URL = 'https://catalogue.data.govt.nz/api/3/action/datastore_search'
const RESOURCE_ID = '4b292323-9fcc-41f8-814b-3c7b19cf14b3'

async function fetchFromExternalAPI(limit = 32000) {
  const url = `${API_URL}?resource_id=${RESOURCE_ID}&limit=${limit}`
  console.log(`📥 Fetching from: ${url}`)
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch schools data: ${response.status}`)
  }

  const data = await response.json()
  if (!data.success) {
    throw new Error('External API returned success: false')
  }

  return data.result.records
}

async function seedTursoDatabase() {
  try {
    const tursoUrl = process.env.TURSO_URL
    const tursoToken = process.env.TURSO_TOKEN

    if (!tursoUrl || !tursoToken) {
      throw new Error('TURSO_URL and TURSO_TOKEN environment variables are required')
    }

    console.log('📥 Fetching schools data from external API...')
    const schoolsData = await fetchFromExternalAPI()
    console.log(`✅ Fetched ${schoolsData.length} records`)

    console.log('🔗 Connecting to Turso database...')
    const client = createClient({ url: tursoUrl, authToken: tursoToken })

    console.log('🗑️  Clearing existing data...')
    await client.execute('DELETE FROM schools')
    console.log('✓ Cleared existing data')

    console.log('⚙️  Seeding database...')
    const columnNames = [
      '_id', 'School_Id', 'Org_Name', 'Telephone', 'Fax', 'Email', 'Contact1_Name', 'URL',
      'Add1_Line1', 'Add1_Suburb', 'Add1_City', 'Add2_Line1', 'Add2_Suburb', 'Add2_City',
      'Add2_Postal_Code', 'Urban_Rural_Indicator', 'Org_Type', 'Definition', 'Authority',
      'School_Donations', 'CoEd_Status', 'KMEPeakBody', 'Takiwā', 'Territorial_Authority',
      'Regional_Council', 'Local_Office_Name', 'Education_Region', 'General_Electorate',
      'Māori_Electorate', 'Statistical_Area_2_Code', 'Statistical_Area_2_Description', 'Ward',
      'Col_Id', 'Col_Name', 'Latitude', 'Longitude', 'Enrolment_Scheme', 'EQi_Index',
      'Roll_Date', 'Total', 'European', 'Māori', 'Pacific', 'Asian', 'MELAA', 'Other',
      'International', 'Isolation_Index', 'Language_of_Instruction', 'BoardingFacilities',
      'CohortEntry', 'Status', 'DateSchoolOpened'
    ]

    let inserted = 0
    const batchSize = 50

    for (let i = 0; i < schoolsData.length; i += batchSize) {
      const batch = schoolsData.slice(i, i + batchSize)

      const valueRows = batch.map(school => {
        const values = columnNames.map(col => {
          const value = (school as Record<string, unknown>)[col]
          if (value === null || value === undefined) {
            return 'NULL'
          }
          if (typeof value === 'number') {
            return String(value)
          }
          if (typeof value === 'string') {
            return `'${value.replace(/'/g, "''")}'`
          }
          return 'NULL'
        })
        return `(${values.join(',')})`
      }).join(',')

      const sqlQuery = `INSERT INTO schools (${columnNames.map(c => `"${c}"`).join(',')}) VALUES ${valueRows}`

      try {
        await client.execute(sqlQuery)
        inserted += batch.length
        if (inserted % 500 === 0 || inserted === schoolsData.length) {
          console.log(`  ✓ Inserted ${inserted}/${schoolsData.length}`)
        }
      } catch (error) {
        console.error(`Failed at record ${i + 1}:`, error)
        throw error
      }
    }

    console.log(`✅ Successfully seeded ${inserted} records to Turso`)
    process.exit(0)
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

seedTursoDatabase()
