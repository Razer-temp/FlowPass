import { supabase } from './supabase';

const mockNames = ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Neha Gupta', 'Vikram Singh', 'Anjali Desai'];

export const seedSampleData = async (eventId: string, zones: any[]) => {
  if (!zones || zones.length === 0) {
    console.error("No zones available to assign passes");
    return;
  }

  try {
    const newPasses = [];
    const count = 100; // Seed 100 passes for demo
    
    for (let i = 0; i < count; i++) {
        // distribute passes randomly among zones
        const zone = zones[Math.floor(Math.random() * zones.length)];
        const isUsed = Math.random() > 0.4; // 60% chance to be already USED
        const name = mockNames[Math.floor(Math.random() * mockNames.length)];

        newPasses.push({
            event_id: eventId,
            zone_id: zone.id,
            attendee_name: `${name} ${i}`,
            seat_number: `AutoSeat-${i}`,
            status: isUsed ? 'USED' : 'ACTIVE'
        });
    }

    // Insert array of passes
    if (newPasses.length > 0) {
        await supabase.from('passes').insert(newPasses);
    }

    // Optional: Log action
    await supabase.from('activity_log').insert({
        event_id: eventId,
        action: `Dev: Seeded ${count} sample passes`,
        type: 'SYSTEM'
    });

    console.log(`Seeded ${count} passes successfully!`);
  } catch (error) {
    console.error("Failed to seed data:", error);
  }
};
