import { runBatchPipeline } from './run-batch-pipeline';
import { REGION_CODES, RegionCode } from '../infra/tour-api/regions';

const arg = process.argv[2] as RegionCode | undefined;

if (!arg || !(arg in REGION_CODES)) {
  console.error(`Usage: batch:run <${Object.keys(REGION_CODES).join('|')}>`);
  process.exit(1);
}

runBatchPipeline(arg).catch((err) => {
  console.error(err);
  process.exit(1);
});
