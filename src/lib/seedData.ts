/**
 * FlowPass — Sample Data Seeder
 *
 * Development-only utility that seeds the database with mock attendee
 * passes for testing the organizer dashboard and gate staff views.
 * Only accessible when the app is running in development mode.
 */

import { supabase } from './supabase';
import type { FlowZone } from '../types';

/** Sample Indian names used when generating mock passes */
const MOCK_NAMES = [
  'Rahul Sharma', 'Priya Patel', 'Amit Kumar',
  'Neha Gupta', 'Vikram Singh', 'Anjali Desai',
];

/** Number of mock passes to generate per seed operation */
const SEED_COUNT = 100;

/**
 * Creates sample pass records in Supabase for development testing.
 *
 * @param eventId - The event to seed passes for
 * @param zones - Available zones to distribute passes across
 */
export const seedSampleData = async (eventId: string, zones: FlowZone[]): Promise<void> => {
  if (!zones || zones.length === 0) {
    console.error('[Seed] No zones available to assign passes');
    return;
  }

  try {
    const newPasses = [];
    
    for (let i = 0; i < SEED_COUNT; i++) {
      // Distribute passes randomly among zones
      const zone = zones[Math.floor(Math.random() * zones.length)];
      const isUsed = Math.random() > 0.4; // 60% chance to be already USED
      const name = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];

      newPasses.push({
        event_id: eventId,
        zone_id: zone.id,
        attendee_name: `${name} ${i}`,
        seat_number: `AutoSeat-${i}`,
        status: isUsed ? 'USED' : 'ACTIVE',
      });
    }

    if (newPasses.length > 0) {
      await supabase.from('passes').insert(newPasses);
    }

    await supabase.from('activity_log').insert({
      event_id: eventId,
      action: `Dev: Seeded ${SEED_COUNT} sample passes`,
      type: 'SYSTEM',
    });

    console.log(`[Seed] Seeded ${SEED_COUNT} passes successfully!`);
  } catch (error) {
    console.error('[Seed] Failed to seed data:', error);
  }
};
