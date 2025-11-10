import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schemas
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

const validateName = (name: string): boolean => {
  return name.trim().length > 0 && name.length <= 255
}

const validatePassword = (password: string): boolean => {
  return password.length >= 8 && password.length <= 255
}

const sanitizeText = (text: string): string => {
  return text.trim().replace(/[\x00-\x1F\x7F]/g, '')
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
    // Get JWT from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

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

    // Verify user is authenticated and has proper role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if user has CEO or HR role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    
    const hasPermission = roles?.some(r => r.role === 'ceo' || r.role === 'hr')
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only CEO or HR can bulk import users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { users } = await req.json() as { users: UserImportRow[] }

    // Validate input array
    if (!Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Users must be a non-empty array' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (users.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Maximum 100 users per import' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Starting bulk import of ${users.length} users`)

    const results = {
      success: [] as string[],
      failed: [] as { email: string; error: string }[],
    }

    for (const user of users) {
      try {
        // Validate input fields
        if (!validateEmail(user.email)) {
          results.failed.push({ 
            email: user.email || 'invalid', 
            error: 'Invalid email format or too long (max 255 chars)' 
          })
          continue
        }

        if (!validateName(user.name)) {
          results.failed.push({ 
            email: user.email, 
            error: 'Invalid name (must be non-empty and max 255 chars)' 
          })
          continue
        }

        if (!validatePassword(user.password)) {
          results.failed.push({ 
            email: user.email, 
            error: 'Invalid password (must be 8-255 chars)' 
          })
          continue
        }

        const mappedRole = roleMapping[user.role]
        const mappedDepartment = departmentMapping[user.department]

        if (!mappedRole) {
          results.failed.push({ 
            email: user.email, 
            error: `Unknown role: ${user.role}` 
          })
          continue
        }
        if (!mappedDepartment) {
          results.failed.push({ 
            email: user.email, 
            error: `Unknown department: ${user.department}` 
          })
          continue
        }

        // Sanitize text inputs
        const sanitizedName = sanitizeText(user.name)
        const sanitizedEmail = sanitizeText(user.email)

        // Create user in auth with sanitized inputs
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: sanitizedEmail,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: sanitizedName,
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
