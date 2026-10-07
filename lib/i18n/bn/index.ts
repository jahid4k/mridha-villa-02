import { common } from './common';
import { rent } from './rent';
import { utilities } from './utilities';
import { setup } from './setup';
import { money } from './money';
import { deed } from './deed';
import { errors } from './errors';

// English text -> everyday Bangla. One section per area of the app.
export const bn: Record<string, string> = {
  ...common,
  ...rent,
  ...utilities,
  ...setup,
  ...money,
  ...deed,
  ...errors,
};
