import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const outputDir = join(process.cwd(), 'public');
const beaconPath = join(outputDir, 'sig.beacon.json');

mkdirSync(outputDir, { recursive: true });
writeFileSync(
  beaconPath,
  JSON.stringify(
    {
      ts: new Date().toISOString(),
      agent: 'Gateway-Gen-0',
    },
    null,
    2
  )
);

// eslint-disable-next-line no-console
console.log(`Wrote beacon to ${beaconPath}`);
