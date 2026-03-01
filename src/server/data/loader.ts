import faqsData from './faqs.json';
import catalogData from './catalog.json';
import scheduleData from './schedule.json';

// Data loaded at module initialization time — no per-request disk I/O
// If ES import of JSON fails due to Nitro/tsconfig configuration, use readFileSync fallback:
// import { readFileSync } from 'fs';
// import { join } from 'path';
// const faqsData = JSON.parse(readFileSync(join(process.cwd(), 'src/server/data/faqs.json'), 'utf-8'));
// const catalogData = JSON.parse(readFileSync(join(process.cwd(), 'src/server/data/catalog.json'), 'utf-8'));
// const scheduleData = JSON.parse(readFileSync(join(process.cwd(), 'src/server/data/schedule.json'), 'utf-8'));

export { faqsData, catalogData, scheduleData };
