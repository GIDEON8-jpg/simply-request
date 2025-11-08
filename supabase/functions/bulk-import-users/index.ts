import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserImportRow {
  name: string
  email: string
  password: string
  role: string
  department: string
}

const roleMapping: Record<string, string> = {
  'Preparer': 'preparer',
  'Registrar': 'admin',
  'CEO': 'ceo',
  'HOD': 'hod',
  'Accountant': 'accountant',
  'Finance Manager': 'finance_manager',
  'Technical Director (TD)': 'technical_director',
  'Human Resources Manager': 'hr',
}

const departmentMapping: Record<string, string> = {
  'Technical': 'Technical',
  'Registry': 'Registry',
  'Public Relations': 'Marketing and PR',
  'Administration': 'CEO',
  'Finance': 'Finance',
  'Education': 'Education',
  'IT': 'IT',
  'Human Resources': 'HR',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { users } = await req.json() as { users: UserImportRow[] }

    console.log(`Starting bulk import of ${users.length} users`)

    const results = {
      success: [] as string[],
      failed: [] as { email: string; error: string }[],
    }

    for (const user of users) {
      try {
        const mappedRole = roleMapping[user.role]
        const mappedDepartment = departmentMapping[user.department]

        if (!mappedRole) {
          throw new Error(`Unknown role: ${user.role}`)
        }
        if (!mappedDepartment) {
          throw new Error(`Unknown department: ${user.department}`)
        }

        // Create user in auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.name,
            department: mappedDepartment,
            role: mappedRole,
          }
        })

        if (authError) {
          console.error(`Failed to create auth user for ${user.email}:`, authError)
          results.failed.push({ email: user.email, error: authError.message })
          continue
        }

        console.log(`Successfully created user: ${user.email} (${mappedRole}, ${mappedDepartment})`)
        results.success.push(user.email)

      } catch (error: any) {
        console.error(`Error processing user ${user.email}:`, error)
        results.failed.push({ 
          email: user.email, 
          error: error.message || 'Unknown error' 
        })
      }
    }

    console.log(`Import complete. Success: ${results.success.length}, Failed: ${results.failed.length}`)

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('Bulk import error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
