// Promotes an already-signed-up user to admin.
// Usage: npm run create-admin -- <email>
require('dotenv').config();
const { supabase } = require('../server/lib/supabase');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npm run create-admin -- <email>');
    process.exit(1);
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !profile) {
    console.error(`No profile found for ${email}. Make sure the user has signed up and logged in at least once.`);
    process.exit(1);
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', profile.id);

  if (updateError) {
    console.error('Failed to promote user:', updateError.message);
    process.exit(1);
  }

  console.log(`${email} is now an admin.`);
}

main();
