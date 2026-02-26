// OpenClaw Bot Integration Types

// === Webhook API Types ===

export interface WakeHookPayload {
  text?: string;
  mode?: string;
}

export interface WakeHookResponse {
  success: boolean;
  message?: string;
}

export interface AgentHookPayload {
  message: string;
  agentId?: string;
  deliver?: boolean;
  channel?: string;
  to?: string;
  model?: string;
  timeoutSeconds?: number;
}

export interface AgentHookResponse {
  success: boolean;
  status: number;
  message?: string;
}

// === Health Check ===

export interface HealthStatus {
  online: boolean;
  latency?: number;
  lastChecked: string;
  hooksUrl: string;
  error?: string;
}

// === Chat Types ===

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  channel?: string;
  agentId?: string;
}

export interface ChatSendPayload {
  message: string;
  channel?: string;
  agentId?: string;
  model?: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  channel?: string;
}

// === Browserless / Control UI Types ===

export interface ScreenshotOptions {
  url: string;
  viewport?: {
    width: number;
    height: number;
  };
  fullPage?: boolean;
}

export interface ScreenshotResponse {
  imageBase64: string;
  timestamp: string;
  viewport: {
    width: number;
    height: number;
  };
}

export interface BrowserInteraction {
  type: 'click' | 'type' | 'scroll' | 'navigate';
  x?: number;
  y?: number;
  text?: string;
  url?: string;
  selector?: string;
  scrollY?: number;
}

export interface InteractionResponse {
  success: boolean;
  screenshotBase64?: string;
  error?: string;
  timestamp: string;
}

// === Channel Management ===

export interface ChannelInfo {
  id: string;
  name: string;
  type: 'telegram' | 'whatsapp' | 'discord' | 'web' | 'other';
  status: 'active' | 'inactive' | 'error';
  lastActivity?: string;
  messageCount?: number;
}

export interface ChannelOverview {
  channels: ChannelInfo[];
  totalMessages: number;
  activeChannels: number;
}

// === Configuration ===

export interface OpenClawConfig {
  hooksUrl: string;
  hooksToken: string;
  gatewayToken: string;
  browserlessUrl: string;
  browserlessApiKey: string;
  controlUiUrl: string;
}
