import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: events, error: e1 } = await supabase.from('events').select('id').limit(1);
  if (e1) {
    console.error('Error fetching event:', e1);
    return;
  }
  const eventId = events[0]?.id;
  if (!eventId) {
    console.log('No events found');
    return;
  }
  
  console.log('Trying to update event...');
  const { error: e2 } = await supabase.from('events').update({ status: 'COMPLETE' }).eq('id', eventId);
  if (e2) console.error('E2:', e2);
  
  console.log('Trying to delete passes...');
  const { error: e3 } = await supabase.from('passes').delete().eq('event_id', eventId);
  if (e3) console.error('E3:', e3);
  
  console.log('Trying to insert activity log...');
  const { error: e4 } = await supabase.from('activity_log').insert({
    event_id: eventId, action: 'Test deletion.', type: 'SYSTEM'
  });
  if (e4) console.error('E4:', e4);
  
  console.log('Done.');
}

run();
