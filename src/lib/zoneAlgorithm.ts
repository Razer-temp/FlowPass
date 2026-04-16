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

/**
 * Smart Algorithm for Seat-to-Zone Assignment
 * Uses Regex for extraction, Fuzzy matching for typos, and Load Balancing for congestion.
 */
export function assignZoneFromSeat(seatInput: string, eventZones: any[]) {
  if (!seatInput || !eventZones || eventZones.length === 0) return null;
  
  const input = seatInput.toLowerCase().trim();
  
  // 1. Entity Extraction with Regex
  const regexPatterns = [
    { regex: /\b(?:stand|st|std|stnd)(?:-)?\s*([a-z0-9]+)\b/i, label: 'Stand' },
    { regex: /\b(?:block|blk|b)(?:-)?\s*([a-z0-9]+)\b/i, label: 'Block' },
    { regex: /\b(?:section|sec|s)(?:-)?\s*([a-z0-9]+)\b/i, label: 'Section' },
    { regex: /\b(?:vip|press|box|exclusive)\b/i, label: 'VIP' },
  ];

  let matchedIdentifier: string | null = null;
  let label = '';

  for (const p of regexPatterns) {
    const match = input.match(p.regex);
    if (match) {
      label = p.label;
      if (p.label === 'VIP') {
        const zone = eventZones.find(z => z.name.toLowerCase().includes('vip')) || eventZones[0];
        return { zone, reason: `Matched VIP area` };
      } else if (match[1]) {
        matchedIdentifier = match[1].toUpperCase();
      }
      break;
    }
  }

  // 2. Direct Mapping Logic
  if (matchedIdentifier) {
    // Try alphabetical index (A=0, B=1, etc.)
    const alphaIndex = matchedIdentifier.charCodeAt(0) - 65; 
    if (!isNaN(alphaIndex) && alphaIndex >= 0 && alphaIndex < eventZones.length) {
      return { zone: eventZones[alphaIndex], reason: `Mapped to ${label} ${matchedIdentifier}` };
    }
    // Try numerical index (1=0, 2=1, etc.)
    const numIndex = parseInt(matchedIdentifier) - 1;
    if (!isNaN(numIndex) && numIndex >= 0 && numIndex < eventZones.length) {
      return { zone: eventZones[numIndex], reason: `Mapped to ${label} ${matchedIdentifier}` };
    }
  }

  // 3. Fuzzy Keyword Matching
  const keywords = ['stand', 'block', 'vip', 'press', 'upper', 'lower'];
  const words = input.split(/[\s-]+/); // Split by space or dash
  for (const word of words) {
    if (word.length < 3) continue;
    for (const kw of keywords) {
      if (getSimiliarity(word, kw) > 0.7) { // Lowered threshold slightly
        const zone = eventZones.find(z => z.name.toLowerCase().includes(kw));
        if (zone) return { zone, reason: `Detected "${kw}" (fuzzy match)` };
      }
    }
  }

  // 4. Fallback: Weighted Load Balancing
  if (input.length >= 2) {
    // Filter out VIP zones for general load balancing unless no other zones exist
    const generalZones = eventZones.filter(z => !z.name.toLowerCase().includes('vip'));
    const sourceZones = generalZones.length > 0 ? generalZones : eventZones;
    
    const zone = sourceZones.reduce((prev, curr) => 
      (prev.estimated_people < curr.estimated_people ? prev : curr), 
      sourceZones[0]
    );
    return { zone, reason: 'Optimized for crowd flow' };
  }

  return null;
}

/**
 * Helper: Minimal string similarity
 */
function getSimiliarity(s1: string, s2: string): number {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  return (longerLength - editDistance(longer, shorter)) / longerLength;
}

function editDistance(s1: string, s2: string): number {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

