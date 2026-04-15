export interface ZoneSchedule {
  id: string;
  name: string;
  exitTime: string;
  status: 'ACTIVE' | 'WAIT';
  gates: string[];
  estimatedPeople: number;
}

export function calculateDynamicGaps(
  totalCrowd: number,
  numZones: number,
  zoneGateMap: Record<string, string[]>
): Record<string, number> {
  const peoplePerZone = Math.floor(totalCrowd / numZones);
  const gaps: Record<string, number> = {};

  Object.keys(zoneGateMap).forEach(zone => {
    const numGates = zoneGateMap[zone].length || 1; // avoid div by 0
    // 500 people per minute per gate
    const exitRatePerMin = numGates * 500;
    const gap = Math.ceil(peoplePerZone / exitRatePerMin);
    gaps[zone] = Math.max(8, Math.min(gap, 20)); // floor 8 mins, ceiling 20 mins
  });

  return gaps;
}

export function generateSchedule(
  startTimeStr: string,
  dateStr: string,
  totalCrowd: number,
  numZones: number,
  zoneGateMap: Record<string, string[]>
): ZoneSchedule[] {
  const zones = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, numZones);
  const peoplePerZone = Math.floor(totalCrowd / numZones);
  const gaps = calculateDynamicGaps(totalCrowd, numZones, zoneGateMap);

  // Parse start time
  let currentTime = new Date();
  if (dateStr && startTimeStr) {
    currentTime = new Date(`${dateStr}T${startTimeStr}:00`);
  }

  const schedule: ZoneSchedule[] = [];

  zones.forEach((zone, index) => {
    schedule.push({
      id: zone,
      name: `Zone ${zone}`,
      exitTime: currentTime.toISOString(),
      status: 'WAIT',
      gates: zoneGateMap[zone] || [],
      estimatedPeople: peoplePerZone
    });

    // Add gap for NEXT zone
    currentTime = new Date(currentTime.getTime() + (gaps[zone] || 12) * 60000);
  });

  return schedule;
}

export function calculateGateLoads(
  totalCrowd: number,
  numZones: number,
  gates: string[],
  zoneGateMap: Record<string, string[]>
): Record<string, number> {
  const peoplePerZone = Math.floor(totalCrowd / numZones);
  const loads: Record<string, number> = {};
  
  gates.forEach(g => loads[g] = 0);

  Object.values(zoneGateMap).forEach(assignedGates => {
    assignedGates.forEach(gate => {
      if (loads[gate] !== undefined) {
        loads[gate] += peoplePerZone;
      }
    });
  });

  return loads;
}

export function assignZoneFromSeat(seatInput: string, eventZones: any[]) {
  if (!seatInput || eventZones.length === 0) return null;
  const input = seatInput.toLowerCase().trim();

  // Basic keyword matching
  if (input.includes('stand a') || input.includes('block a')) return eventZones[0];
  if (input.includes('stand b') || input.includes('block b')) return eventZones[1] || eventZones[0];
  if (input.includes('stand c') || input.includes('block c')) return eventZones[2] || eventZones[0];
  if (input.includes('vip') || input.includes('press')) return eventZones.find(z => z.name.toLowerCase().includes('vip')) || eventZones[0];
  if (input.includes('upper') || input.includes('tier')) return eventZones.find(z => z.name.toLowerCase().includes('upper')) || eventZones[0];

  // If input is long enough but no specific keyword matched, fallback to least populated zone
  if (input.length >= 3) {
    return eventZones.reduce((prev, curr) => (prev.estimated_people < curr.estimated_people ? prev : curr), eventZones[0]);
  }

  return null;
}
