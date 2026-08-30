export type EmailSendStatus =
  | "pending_approval"
  | "approved"
  | "sending"
  | "sent"
  | "failed"
  | "rejected";

export interface SendEmailOptions {
  sender: string;
  senderName?: string;
  recipient: string;
  subject: string;
  body: string;
  html?: string;
  previewUrl?: string;
  attachments?: { filename: string; path?: string; content?: Buffer; contentType?: string }[];
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId?: string;
  providerThreadId?: string;
  error?: string;
  timestamp?: string;
}

export interface EmailStatusResult {
  status: EmailSendStatus;
  providerMessageId?: string;
  sentAt?: string;
  error?: string;
}

export interface SendReplyOptions extends SendEmailOptions {
  inReplyToMessageId: string;
  references?: string[];
}

export interface EmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  validateRecipient(recipient: string): { valid: boolean; error?: string };
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
  sendReply(options: SendReplyOptions): Promise<SendEmailResult>;
}