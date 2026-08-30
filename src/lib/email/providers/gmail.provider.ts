import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { EmailProvider, SendEmailOptions, SendEmailResult } from "../types";

export interface InboundEmailMessage {
  providerMessageId: string;
  providerThreadId?: string;
  inReplyTo?: string;
  references: string[];
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  hasAttachments: boolean;
  receivedAt: string;
}

export class GmailEmailProvider implements EmailProvider {
  readonly name = "Gmail";

  private getAuth(): { user?: string; pass?: string } {
    const rawPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD || "";
    return {
      user: process.env.GMAIL_USER?.trim(),
      pass: rawPass.replace(/\s+/g, "").trim(),
    };
  }

  isConfigured(): boolean {
    const auth = this.getAuth();
    return !!(auth.user && auth.pass && auth.user.includes("@") && auth.pass.length >= 8);
  }

  validateRecipient(recipient: string): { valid: boolean; error?: string } {
    if (!recipient || typeof recipient !== "string" || !recipient.trim()) {
      return { valid: false, error: "Verified recipient email required." };
    }

    const email = recipient.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: "Recipient email format is invalid." };
    }

    return { valid: true };
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    const recipientValidation = this.validateRecipient(options.recipient);
    if (!recipientValidation.valid) {
      return {
        success: false,
        error: recipientValidation.error || "Invalid recipient address.",
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        error:
          "GMAIL_USER and GMAIL_APP_PASSWORD credentials are not configured in .env.local. Please provide your Gmail credentials to dispatch live outbound emails.",
      };
    }

    const auth = this.getAuth();

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: auth.user,
          pass: auth.pass,
        },
      });

      const formattedFrom = options.senderName
        ? `"${options.senderName}" <${auth.user}>`
        : auth.user;

      const info = await transporter.sendMail({
        from: formattedFrom,
        to: options.recipient,
        subject: options.subject,
        text: options.body,
        html: options.html || options.body.replace(/\n/g, "<br/>"),
        attachments: options.attachments,
      });

      return {
        success: true,
        providerMessageId: info.messageId,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error("[GmailEmailProvider.sendEmail] Error:", err);
      return {
        success: false,
        error: err.message || "Failed to send email through Gmail provider.",
      };
    }
  }

  async sendReply(options: {
    sender: string;
    senderName?: string;
    recipient: string;
    subject: string;
    body: string;
    html?: string;
    inReplyToMessageId: string;
    references?: string[];
    attachments?: { filename: string; path?: string; content?: Buffer; contentType?: string }[];
  }): Promise<SendEmailResult> {
    const recipientValidation = this.validateRecipient(options.recipient);
    if (!recipientValidation.valid) {
      return {
        success: false,
        error: recipientValidation.error || "Invalid recipient address.",
      };
    }

    if (!this.isConfigured()) {
      return {
        success: false,
        error: "Gmail credentials not configured in .env.local.",
      };
    }

    const auth = this.getAuth();

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: auth.user,
          pass: auth.pass,
        },
      });

      const formattedFrom = options.senderName
        ? `"${options.senderName}" <${auth.user}>`
        : auth.user;

      const refs = options.references && options.references.length > 0
        ? options.references.join(" ")
        : options.inReplyToMessageId;

      const info = await transporter.sendMail({
        from: formattedFrom,
        to: options.recipient,
        subject: options.subject,
        text: options.body,
        html: options.html || options.body.replace(/\n/g, "<br/>"),
        inReplyTo: options.inReplyToMessageId,
        references: refs,
        attachments: options.attachments,
        headers: {
          "In-Reply-To": options.inReplyToMessageId,
          "References": refs,
        },
      });

      return {
        success: true,
        providerMessageId: info.messageId,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error("[GmailEmailProvider.sendReply] Error:", err);
      return {
        success: false,
        error: err.message || "Failed to dispatch reply through Gmail provider.",
      };
    }
  }

  async fetchRecentInboundMessages(maxCount: number = 30): Promise<InboundEmailMessage[]> {
    if (!this.isConfigured()) {
      throw new Error("Gmail credentials not configured in .env.local.");
    }

    const auth = this.getAuth();
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: {
        user: auth.user!,
        pass: auth.pass!,
      },
      logger: false,
    });

    const messages: InboundEmailMessage[] = [];

    try {
      await client.connect();
      const lock = await client.getMailboxLock("INBOX");

      try {
        const mailboxStatus = await client.status("INBOX", { messages: true });
        const total = mailboxStatus.messages || 0;
        if (total === 0) return [];

        const seqStart = Math.max(1, total - maxCount + 1);
        const sequence = `${seqStart}:${total}`;

        for await (const msg of client.fetch(sequence, { source: true, envelope: true, internalDate: true })) {
          try {
            if (!msg.source) continue;
            const parsed = await simpleParser(msg.source);

            const senderEmail = parsed.from?.value?.[0]?.address || msg.envelope?.from?.[0]?.address || "";
            const senderName = parsed.from?.value?.[0]?.name || msg.envelope?.from?.[0]?.name || senderEmail;
            const recipientEmail = parsed.to
              ? Array.isArray(parsed.to)
                ? parsed.to[0]?.value?.[0]?.address || ""
                : parsed.to.value?.[0]?.address || ""
              : auth.user!;

            const messageId = parsed.messageId || msg.envelope?.messageId || `<${msg.uid}@gmail.com>`;
            const inReplyTo = parsed.inReplyTo || undefined;
            const refs: string[] = Array.isArray(parsed.references)
              ? parsed.references
              : parsed.references
              ? [parsed.references]
              : [];

            const bodyText = parsed.text || "";
            const bodyHtml = parsed.html || undefined;
            const hasAttachments = parsed.attachments && parsed.attachments.length > 0;
            const receivedAt = new Date(parsed.date || msg.internalDate || Date.now()).toISOString();

            messages.push({
              providerMessageId: messageId,
              inReplyTo,
              references: refs,
              senderEmail,
              senderName,
              recipientEmail,
              subject: parsed.subject || "(No Subject)",
              bodyText: bodyText.trim(),
              bodyHtml,
              hasAttachments: !!hasAttachments,
              receivedAt,
            });
          } catch (parseErr) {
            console.warn("[GmailEmailProvider.fetch] Failed to parse message:", parseErr);
          }
        }
      } finally {
        lock.release();
      }

      await client.logout();
    } catch (err: any) {
      console.error("[GmailEmailProvider.fetchRecentInboundMessages] IMAP Error:", err);
      try {
        await client.logout();
      } catch {}
      throw new Error(`Gmail IMAP sync failed: ${err.message}`);
    }

    return messages.reverse();
  }
}

export const gmailEmailProvider = new GmailEmailProvider();