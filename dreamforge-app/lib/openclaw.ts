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

/**
 * Health check against the OpenClaw hooks URL
 */
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
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(OPENCLAW_HOOKS_URL, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
      },
    });
    clearTimeout(timeout);

    const latency = Date.now() - start;
    return {
      online: response.ok || response.status === 404 || response.status === 405,
      latency,
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

/**
 * Send a wake hook to OpenClaw
 */
export async function sendWakeHook(payload?: WakeHookPayload): Promise<{ success: boolean; error?: string }> {
  if (!OPENCLAW_HOOKS_URL || !OPENCLAW_HOOKS_TOKEN) {
    return { success: false, error: 'OpenClaw hooks not configured' };
  }

  try {
    const response = await fetch(`${OPENCLAW_HOOKS_URL}/hooks/wake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
      },
      body: JSON.stringify(payload || { text: 'wake', mode: 'normal' }),
    });

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

/**
 * Send a message via the agent hook
 */
export async function sendAgentMessage(payload: AgentHookPayload): Promise<{ success: boolean; status: number; error?: string }> {
  if (!OPENCLAW_HOOKS_URL || !OPENCLAW_HOOKS_TOKEN) {
    return { success: false, status: 0, error: 'OpenClaw hooks not configured' };
  }

  try {
    const response = await fetch(`${OPENCLAW_HOOKS_URL}/hooks/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

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

/**
 * Capture a screenshot of the Control UI via Browserless
 */
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

  const url = options?.url || OPENCLAW_CONTROL_UI_URL || `${OPENCLAW_HOOKS_URL}`;
  const viewport = options?.viewport || { width: 1280, height: 720 };

  try {
    const response = await fetch(`${BROWSERLESS_URL}/screenshot?token=${BROWSERLESS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        options: {
          type: 'png',
          fullPage: options?.fullPage || false,
        },
        viewport,
        gotoOptions: {
          waitUntil: 'networkidle2',
          timeout: 30000,
        },
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

    return {
      imageBase64,
      timestamp: new Date().toISOString(),
      viewport,
    };
  } catch (error) {
    return {
      imageBase64: '',
      timestamp: new Date().toISOString(),
      viewport,
      error: error instanceof Error ? error.message : 'Screenshot capture failed',
    };
  }
}

/**
 * Interact with the Control UI via Browserless function API
 */
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

  // Build Puppeteer code based on interaction type
  let puppeteerCode = '';
  switch (interaction.type) {
    case 'click':
      puppeteerCode = `
        module.exports = async ({ page }) => {
          await page.goto('${targetUrl}', { waitUntil: 'networkidle2', timeout: 30000 });
          await page.mouse.click(${interaction.x || 0}, ${interaction.y || 0});
          await page.waitForTimeout(1000);
          const screenshot = await page.screenshot({ type: 'png', encoding: 'base64' });
          return { screenshot };
        };
      `;
      break;
    case 'type':
      puppeteerCode = `
        module.exports = async ({ page }) => {
          await page.goto('${targetUrl}', { waitUntil: 'networkidle2', timeout: 30000 });
          ${interaction.selector ? `await page.click('${interaction.selector}');` : `await page.mouse.click(${interaction.x || 0}, ${interaction.y || 0});`}
          await page.keyboard.type('${(interaction.text || '').replace(/'/g, "\\'")}');
          await page.waitForTimeout(500);
          const screenshot = await page.screenshot({ type: 'png', encoding: 'base64' });
          return { screenshot };
        };
      `;
      break;
    case 'scroll':
      puppeteerCode = `
        module.exports = async ({ page }) => {
          await page.goto('${targetUrl}', { waitUntil: 'networkidle2', timeout: 30000 });
          await page.evaluate((scrollY) => window.scrollBy(0, scrollY), ${interaction.scrollY || 300});
          await page.waitForTimeout(500);
          const screenshot = await page.screenshot({ type: 'png', encoding: 'base64' });
          return { screenshot };
        };
      `;
      break;
    case 'navigate':
      puppeteerCode = `
        module.exports = async ({ page }) => {
          await page.goto('${interaction.url || targetUrl}', { waitUntil: 'networkidle2', timeout: 30000 });
          const screenshot = await page.screenshot({ type: 'png', encoding: 'base64' });
          return { screenshot };
        };
      `;
      break;
  }

  try {
    const response = await fetch(`${BROWSERLESS_URL}/function?token=${BROWSERLESS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: puppeteerCode,
        context: {},
      }),
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

/**
 * Get configuration status for display
 */
export function getConfigStatus() {
  return {
    hooksConfigured: isOpenClawConfigured(),
    browserlessConfigured: isBrowserlessConfigured(),
    hooksUrl: OPENCLAW_HOOKS_URL ? OPENCLAW_HOOKS_URL.replace(/\/+$/, '') : 'Not set',
    controlUiUrl: OPENCLAW_CONTROL_UI_URL || 'Not set',
    hasGatewayToken: !!OPENCLAW_GATEWAY_TOKEN,
  };
}
