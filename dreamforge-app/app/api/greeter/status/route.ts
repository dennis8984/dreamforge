import { NextResponse } from 'next/server';
import { greeterHealth } from '@/lib/greeter-client';
import { GREETER_NAME, greeterIdleUrls, publicGreeterSpecials } from '@/lib/greeter';
import { greeterIsBusy } from '@/lib/greeter-sessions';
import { MOMENTS_COSTS } from '@/lib/moments-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  let online = false;
  let busy = false;
  try {
    online = await greeterHealth();
  } catch {
    online = false;
  }
  try {
    busy = await greeterIsBusy();
  } catch {
    busy = false;
  }

  return NextResponse.json({
    name: GREETER_NAME,
    online,
    busy,
    idleUrls: greeterIdleUrls(),
    costs: {
      minute: MOMENTS_COSTS.GREETER_MINUTE,
      special: MOMENTS_COSTS.GREETER_SPECIAL,
    },
    specials: publicGreeterSpecials(),
  });
}
