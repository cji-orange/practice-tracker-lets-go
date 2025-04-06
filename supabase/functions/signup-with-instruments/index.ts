import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Signup function starting...');

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate input
    const { firstName, lastName, email, password, selectedInstruments } = await req.json();

    if (!firstName || !lastName || !email || !password || !Array.isArray(selectedInstruments) || selectedInstruments.length === 0) {
        console.error("Invalid input received:", { firstName, lastName, email, password, selectedInstruments });
        return new Response(JSON.stringify({ error: 'Missing required fields or invalid instrument list.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
     // Basic password length check (mirror client-side)
     if (password.length < 6) {
       return new Response(JSON.stringify({ error: 'Password must be at least 6 characters long.' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 400,
       });
     }

    console.log(`Processing signup for: ${email} with instruments:`, selectedInstruments);

    // 2. Initialize Supabase Admin Client (uses environment variables)
    // Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in function environment
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Sign up the user
    console.log("Attempting user signup...");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Set based on your project settings (true requires email verification)
        user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (authError) {
        console.error("Supabase auth error:", authError);
        // Provide more specific feedback for common errors like duplicates
        if (authError.message.includes('duplicate key value') || authError.message.includes('already exists')) {
             return new Response(JSON.stringify({ error: 'An account with this email already exists.' }), {
                 headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                 status: 409, // Conflict
             });
        }
        throw authError; // Throw other auth errors
    }

    if (!authData || !authData.user) {
        throw new Error('User created but no user data returned from admin API.');
    }

    const userId = authData.user.id;
    console.log(`User created successfully: ${userId}`);

    // Note: The handle_new_user trigger should automatically populate the public.Users table.

    // 4. Fetch Instrument IDs (using Admin client - bypasses RLS)
    console.log("Fetching instrument IDs...");
    const { data: instrumentResult, error: instrumentError } = await supabaseAdmin
        .from('Instruments')
        .select('id, name')
        .in('name', selectedInstruments);

    if (instrumentError) {
        console.error("Error fetching instruments:", instrumentError);
        // Note: If this fails, the user is created but instruments won't be linked.
        // Consider cleanup or alternative error handling.
        throw new Error(`Failed to fetch instrument IDs: ${instrumentError.message}`);
    }

    if (!instrumentResult || instrumentResult.length !== selectedInstruments.length) {
        console.error('Mismatch fetching instruments', { selected: selectedInstruments, fetched: instrumentResult });
        throw new Error('Could not find all selected instruments in the database. Was it seeded correctly?');
    }

    const instrumentIdMap = instrumentResult.reduce((map, inst) => {
        map[inst.name] = inst.id;
        return map;
    }, {});
    console.log("Instrument IDs fetched.");

    // 5. Link instruments to user (using Admin client - bypasses RLS)
    const userInstrumentLinks = selectedInstruments.map(name => ({
        userId: userId,
        instrumentId: instrumentIdMap[name]
    }));

    console.log("Linking instruments to user...");
    const { error: userInstError } = await supabaseAdmin
        .from('UserInstruments')
        .insert(userInstrumentLinks);

    if (userInstError) {
        console.error("Error linking instruments:", userInstError);
        // Note: User is created, but linking failed. Consider cleanup or error handling.
        throw new Error(`Failed to link instruments to user: ${userInstError.message}`);
    }

    console.log("Instruments linked successfully.");

    // 6. Return success
    return new Response(JSON.stringify({ success: true, userId: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in signup function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 