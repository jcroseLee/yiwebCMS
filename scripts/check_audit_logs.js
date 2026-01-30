import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://d53bmv0g91htqli3vq50.baseapi.memfiredb.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImV4cCI6MzM0MzA0MzE5NiwiaWF0IjoxNzY2MjQzMTk2LCJpc3MiOiJzdXBhYmFzZSJ9.25xxX7J3vfKxNYjSe6gA2zx2XD8n0-vDwjqDeSS9Ejc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking cms_permissions for /audit-logs...');
  const { data, error } = await supabase
    .from('cms_permissions')
    .select('*')
    .eq('code', '/audit-logs');
    
  if (error) {
    console.error('Error fetching permissions:', error);
    return;
  }
  
  console.log('Permissions found:', data);
  
  if (data.length === 0) {
    console.log('Attempting to insert permission...');
    const { error: insertError } = await supabase
      .from('cms_permissions')
      .insert([{ code: '/audit-logs', name: 'Audit Logs' }]);
      
    if (insertError) {
      console.error('Error inserting permission:', insertError);
      console.log('Try manually inserting via SQL Editor if RLS blocks this.');
    } else {
      console.log('Permission inserted successfully.');
    }
  }
}

check();
