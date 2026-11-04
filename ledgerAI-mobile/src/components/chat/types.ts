export type MessageSender = 'user' | 'marty';

export type MessageStatus = 'sending' | 'sent' | 'error';

export interface ChatAction {
  label: string;
  action: 'navigate' | 'send';
  target: string;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: string; // ISO string
  status?: MessageStatus;
  actions?: ChatAction[];
}

export interface QuickPrompt {
  id: string;
  category: string;
  label: string;
  prompt: string;
  icon: string;
}

export interface ChatApiResponse {
  response: string;
  actions?: ChatAction[];
}
