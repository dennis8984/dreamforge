import type {
  HealthStatus,
  WakeHookPayload,
  AgentHookPayload,
  ScreenshotOptions,
  ScreenshotResponse,
  BrowserInteraction,
  InteractionResponse,
} from '@/types/openclaw';

// Environment variables
const OPENCLAW_HOOKS_URL = process.env.OPENCLAW_HOOKS_URL || '';
const OPENCLAW_HOOKS_TOKEN = process.env.OPENCLAW_HOOKS_TOKEN || '';
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';
const BROWSERLESS_URL = process.env.BROWSERLESS_URL || 'https://chrome.browserless.io';
const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY || '';
const OPENCLAW_CONTROL_UI_URL = process.env.OPENCLAW_CONTROL_UI_URL || '';

/**
 * Check if OpenClaw environment is configured
 */
export function isOpenClawConfigured(): boolean {
  return !!(OPENCLAW_HOOKS_URL && OPENCLAW_HOOKS_TOKEN);
}

/**
 * Check if Browserless is configured
 */
export function isBrowserlessConfigured(): boolean {
  return !!(BROWSERLESS_API_KEY);
}

// ============================================================
// Browserless proxy: run fetch() inside a headless browser
// so the request originates from Browserless's IP, not ours.
// ============================================================

interface ProxiedFetchResult {
  ok: boolean;
  status: number;
  body: string;
  error?: string;
}

/**
 * Execute an HTTP request via Browserless function API.
 * The fetch happens inside a headless Chrome on Browserless's servers,
 * bypassing any IP blocks on our dev machine.
 */
async function fetchViaBrowserless(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<ProxiedFetchResult> {
  if (!BROWSERLESS_API_KEY) {
    return { ok: false, status: 0, body: '', error: 'BROWSERLESS_API_KEY not configured' };
  }

  const method = options.method || 'GET';
  const headersJson = JSON.stringify(options.headers || {});
  const bodyArg = options.body ? JSON.stringify(options.body) : 'undefined';

  // Extract origin from URL so we can navigate there first,
  // giving the browser a proper context for fetch requests.
  const origin = new URL(url).origin;

  const code = `
    export default async function({ page }) {
      // Navigate to the target origin first so fetch has a proper context
      // (about:blank blocks HTTP fetches due to mixed-content/CORS)
      try {
        await page.goto(${JSON.stringify(origin)}, { waitUntil: 'domcontentloaded', timeout: 15000 });
      } catch (e) {
        // Even if navigation fails (e.g. non-HTML response), the page
        // is now on the right origin for fetch to work
      }

      const result = await page.evaluate(async (fetchUrl, fetchMethod, fetchHeaders, fetchBody) => {
        try {
          const opts = {
            method: fetchMethod,
            headers: fetchHeaders,
          };
          if (fetchBody !== undefined) {
            opts.body = fetchBody;
          }
          const res = await fetch(fetchUrl, opts);
          const text = await res.text();
          return { ok: res.ok, status: res.status, body: text };
        } catch (e) {
          return { ok: false, status: 0, body: '', error: e.message };
        }
      }, ${JSON.stringify(url)}, ${JSON.stringify(method)}, ${headersJson}, ${bodyArg});
      return result;
    }
  `;

  try {
    const response = await fetch(`${BROWSERLESS_URL}/function?token=${BROWSERLESS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, context: {} }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, status: 0, body: '', error: `Browserless error ${response.status}: ${text}` };
    }

    const result = await response.json();
    return result as ProxiedFetchResult;
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: '',
      error: error instanceof Error ? error.message : 'Browserless proxy failed',
    };
  }
}

// ============================================================
// Health check
// ============================================================

export async function checkOpenClawHealth(): Promise<HealthStatus> {
  if (!OPENCLAW_HOOKS_URL) {
    return {
      online: false,
      lastChecked: new Date().toISOString(),
      hooksUrl: 'Not configured',
      error: 'OPENCLAW_HOOKS_URL not set',
    };
  }

  const start = Date.now();

  // Route through Browserless if available, otherwise try direct
  if (BROWSERLESS_API_KEY) {
    const result = await fetchViaBrowserless(OPENCLAW_HOOKS_URL, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${OPENCLAW_HOOKS_TOKEN}` },
    });

    const latency = Date.now() - start;

    if (result.error && !result.status) {
      return {
        online: false,
        latency,
        lastChecked: new Date().toISOString(),
        hooksUrl: OPENCLAW_HOOKS_URL,
        error: result.error,
      };
    }

    return {
      online: result.ok || result.status === 404 || result.status === 405,
      latency,
      lastChecked: new Date().toISOString(),
      hooksUrl: OPENCLAW_HOOKS_URL,
    };
  }

  // Fallback: direct fetch
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(OPENCLAW_HOOKS_URL, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'Authorization': `Bearer ${OPENCLAW_HOOKS_TOKEN}` },
    });
    clearTimeout(timeout);

    return {
      online: response.ok || response.status === 404 || response.status === 405,
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
      hooksUrl: OPENCLAW_HOOKS_URL,
    };
  } catch (error) {
    return {
      online: false,
      latency: Date.now() - start,
      lastChecked: new Date().toISOString(),
      hooksUrl: OPENCLAW_HOOKS_URL,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

// ============================================================
// Wake hook
// ============================================================

export async function sendWakeHook(payload?: WakeHookPayload): Promise<{ success: boolean; error?: string }> {
  if (!OPENCLAW_HOOKS_URL || !OPENCLAW_HOOKS_TOKEN) {
    return { success: false, error: 'OpenClaw hooks not configured' };
  }

  const url = `${OPENCLAW_HOOKS_URL}/hooks/wake`;
  const body = JSON.stringify(payload || { text: 'wake', mode: 'normal' });
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
  };

  // Route through Browserless if available
  if (BROWSERLESS_API_KEY) {
    const result = await fetchViaBrowserless(url, { method: 'POST', headers, body });
    if (result.ok) return { success: true };
    return { success: false, error: result.error || `HTTP ${result.status}: ${result.body}` };
  }

  // Fallback: direct fetch
  try {
    const response = await fetch(url, { method: 'POST', headers, body });
    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send wake hook',
    };
  }
}

// ============================================================
// Agent message
// ============================================================

export async function sendAgentMessage(payload: AgentHookPayload): Promise<{ success: boolean; status: number; error?: string }> {
  if (!OPENCLAW_HOOKS_URL || !OPENCLAW_HOOKS_TOKEN) {
    return { success: false, status: 0, error: 'OpenClaw hooks not configured' };
  }

  const url = `${OPENCLAW_HOOKS_URL}/hooks/agent`;
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
  };

  // Route through Browserless if available
  if (BROWSERLESS_API_KEY) {
    const result = await fetchViaBrowserless(url, { method: 'POST', headers, body });
    const status = result.status || 0;
    if (status === 200 || status === 202) {
      return { success: true, status };
    }
    return { success: false, status, error: result.error || `HTTP ${status}: ${result.body}` };
  }

  // Fallback: direct fetch
  try {
    const response = await fetch(url, { method: 'POST', headers, body });
    const status = response.status;
    if (status === 202 || status === 200) {
      return { success: true, status };
    }
    const text = await response.text();
    return { success: false, status, error: `HTTP ${status}: ${text}` };
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Failed to send agent message',
    };
  }
}

// ============================================================
// Browserless screenshot
// ============================================================

export async function captureControlUIScreenshot(
  options?: Partial<ScreenshotOptions>
): Promise<ScreenshotResponse & { error?: string }> {
  if (!BROWSERLESS_API_KEY) {
    return {
      imageBase64: '',
      timestamp: new Date().toISOString(),
      viewport: { width: 1280, height: 720 },
      error: 'BROWSERLESS_API_KEY not configured',
    };
  }

  const url = options?.url || OPENCLAW_CONTROL_UI_URL || OPENCLAW_HOOKS_URL;
  const viewport = options?.viewport || { width: 1280, height: 720 };

  try {
    const response = await fetch(`${BROWSERLESS_URL}/screenshot?token=${BROWSERLESS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        options: { type: 'png', fullPage: options?.fullPage || false },
        viewport,
        gotoOptions: { waitUntil: 'networkidle2', timeout: 30000 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        imageBase64: '',
        timestamp: new Date().toISOString(),
        viewport,
        error: `Browserless error: ${response.status} - ${text}`,
      };
    }

    const buffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(buffer).toString('base64');

    return { imageBase64, timestamp: new Date().toISOString(), viewport };
  } catch (error) {
    return {
      imageBase64: '',
      timestamp: new Date().toISOString(),
      viewport,
      error: error instanceof Error ? error.message : 'Screenshot capture failed',
    };
  }
}

// ============================================================
// Browserless interactions (click/type/scroll/navigate)
// ============================================================

export async function interactWithControlUI(
  interaction: BrowserInteraction
): Promise<InteractionResponse> {
  if (!BROWSERLESS_API_KEY) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: 'BROWSERLESS_API_KEY not configured',
    };
  }

  const targetUrl = OPENCLAW_CONTROL_UI_URL || OPENCLAW_HOOKS_URL;

  let puppeteerCode = '';
  switch (interaction.type) {
    case 'click':
      puppeteerCode = `
        export default async function({ page }) {
          await page.goto('${targetUrl}', { waitUntil: 'networkidle2', timeout: 30000 });
          await page.mouse.click(${interaction.x || 0}, ${interaction.y || 0});
          await page.waitForTimeout(1000);
          const screenshot = await page.screenshot({ type: 'png', encoding: 'base64' });
          return { screenshot };
        }
      `;
      break;
    case 'type':
      puppeteerCode = `
        export default async function({ page }) {
          await page.goto('${targetUrl}', { waitUntil: 'networkidle2', timeout: 30000 });
          ${interaction.selector ? `await page.click('${interaction.selector}');` : `await page.mouse.click(${interaction.x || 0}, ${interaction.y || 0});`}
          await page.keyboard.type('${(interaction.text || '').replace(/'/g, "\\'")}');
          await page.waitForTimeout(500);
          const screenshot = await page.screenshot({ type: 'png', encoding: 'base64' });
          return { screenshot };
        }
      `;
      break;
    case 'scroll':
      puppeteerCode = `
        export default async function({ page }) {
          await page.goto('${targetUrl}', { waitUntil: 'networkidle2', timeout: 30000 });
          await page.evaluate((scrollY) => window.scrollBy(0, scrollY), ${interaction.scrollY || 300});
          await page.waitForTimeout(500);
          const screenshot = await page.screenshot({ type: 'png', encoding: 'base64' });
          return { screenshot };
        }
      `;
      break;
    case 'navigate':
      puppeteerCode = `
        export default async function({ page }) {
          await page.goto('${interaction.url || targetUrl}', { waitUntil: 'networkidle2', timeout: 30000 });
          const screenshot = await page.screenshot({ type: 'png', encoding: 'base64' });
          return { screenshot };
        }
      `;
      break;
  }

  try {
    const response = await fetch(`${BROWSERLESS_URL}/function?token=${BROWSERLESS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: puppeteerCode, context: {} }),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: `Browserless function error: ${response.status} - ${text}`,
      };
    }

    const result = await response.json();
    return {
      success: true,
      screenshotBase64: result.screenshot || '',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Interaction failed',
    };
  }
}

// ============================================================
// Config status
// ============================================================

export function getConfigStatus() {
  return {
    hooksConfigured: isOpenClawConfigured(),
    browserlessConfigured: isBrowserlessConfigured(),
    hooksUrl: OPENCLAW_HOOKS_URL ? OPENCLAW_HOOKS_URL.replace(/\/+$/, '') : 'Not set',
    controlUiUrl: OPENCLAW_CONTROL_UI_URL || 'Not set',
    hasGatewayToken: !!OPENCLAW_GATEWAY_TOKEN,
  };
}
