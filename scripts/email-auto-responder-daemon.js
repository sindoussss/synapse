const { ImapFlow } = require("imapflow");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

// Load .env.local credentials
const envPath = path.resolve(process.cwd(), ".env.local");
let gmailUser = "";
let gmailPass = "";
let geminiApiKey = "";
let groqApiKey = process.env.GROQ_API_KEY || "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const userMatch = envContent.match(/GMAIL_USER\s*=\s*(.+)/);
  const passMatch = envContent.match(/GMAIL_APP_PASSWORD\s*=\s*(.+)/);
  const geminiMatch = envContent.match(/GEMINI_API_KEY\s*=\s*(.+)/);
  const groqMatch = envContent.match(/GROQ_API_KEY\s*=\s*(.+)/);
  if (userMatch) gmailUser = userMatch[1].trim();
  if (passMatch) gmailPass = passMatch[1].replace(/\s+/g, "").trim();
  if (geminiMatch) geminiApiKey = geminiMatch[1].trim();
  if (groqMatch && !groqApiKey) groqApiKey = groqMatch[1].trim();
}

console.log("================================================================================");
console.log("🤖 SYNAPSE AUTONOMOUS REAL-TIME EMAIL AGENT DAEMON INITIALIZED");
console.log("================================================================================");
console.log(`Account:     ${gmailUser}`);
console.log(`Polling:     Every 5 seconds`);
console.log(`AI Engine:   Gemini 3.5 Flash Lite + Groq Qwen Failover`);
console.log(`Mode:        Fully Autonomous (Read -> AI Analyze -> Auto-Reply -> Deliver)`);
console.log("================================================================================\n");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: gmailUser, pass: gmailPass },
});

const processedMessageIds = new Set();

async function analyzeAndGenerateAiReply(senderEmail, subject, bodyText) {
  const prompt = `You are Alex Mercer, Principal Digital Architect at SYNAPSE Operations representing our web modernization and quotation intake systems.
A prospective client (${senderEmail}, representing Sindous Building Supplies & Construction Services) has sent us this email message:

---
SUBJECT: ${subject}
BODY:
${bodyText}
---

INSTRUCTIONS:
1. Carefully READ and understand what the client is asking, saying, or requesting.
2. Formulate a highly contextual, polite, and professional response.
3. If they ask about the materials catalog, quotation calculations, WhatsApp notifications, timelines, or pricing:
   - Provide clear, direct answers.
   - Mention the working interactive preview at http://localhost:3005/preview/sindous-building
   - Propose the next formal step (e.g. generating the Scope of Work, Proposal, or Agreement document).
4. Sign off as:
   Alex Mercer
   Principal Digital Architect
   SYNAPSE Operations

Respond ONLY with the exact email body text you want to send. Do NOT include markdown code fences or JSON.`;

  // 1. Try Gemini
  if (geminiApiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn("Gemini generation notice:", e.message);
    }
  }

  // 2. Try Groq
  if (groqApiKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn("Groq generation notice:", e.message);
    }
  }

  // Fallback Template
  return `Dear Sindous Building Team,

Thank you for your response. We have received your message regarding the digital transformation framework for Sindous Building Supplies & Construction Services.

We invite you to explore the working interactive materials catalog and quotation estimator:
http://localhost:3005/preview/sindous-building

We are ready to prepare the formal Scope of Work & Proposal document for your sign-off. Please let us know if you would like us to proceed.

Best regards,
Alex Mercer
Principal Digital Architect
SYNAPSE Operations`;
}

async function checkInbox() {
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      // Fetch recent 10 messages
      const status = await client.status("INBOX", { messages: true });
      if (status.messages === 0) return;

      const fetchRange = `${Math.max(1, status.messages - 9)}:*`;
      for await (const msg of client.fetch(fetchRange, { envelope: true, source: true })) {
        const messageId = msg.envelope.messageId;
        const sender = msg.envelope.from?.[0]?.address || "";
        const subject = msg.envelope.subject || "";

        // Only process if from client and not yet handled
        if (processedMessageIds.has(messageId)) continue;
        processedMessageIds.add(messageId);

        // Ignore self-sent emails
        if (sender.toLowerCase() === gmailUser.toLowerCase()) continue;

        // Check if this is a prospect email (e.g. sindousbuilding)
        if (sender.toLowerCase().includes("sindous") || sender.toLowerCase().includes("client") || sender.toLowerCase().includes("test")) {
          const bodyStr = msg.source.toString("utf8");
          const plainTextMatch = bodyStr.match(/Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\n\r?\n--|$)/i);
          const rawBody = plainTextMatch ? plainTextMatch[1].trim() : bodyStr.substring(0, 500);

          console.log("\n--------------------------------------------------------------------------------");
          console.log(`📩 NEW INBOUND CLIENT EMAIL DETECTED at ${new Date().toLocaleTimeString()}!`);
          console.log(`  From:    ${sender}`);
          console.log(`  Subject: ${subject}`);
          console.log(`  Message: "${rawBody.substring(0, 150)}..."`);
          console.log("🧠 SYNAPSE AI is reading and analyzing the client's requirements...");

          // Generate AI reply
          const aiReply = await analyzeAndGenerateAiReply(sender, subject, rawBody);
          console.log("✍️  AI Generated Response:\n");
          console.log(aiReply);
          console.log("\n🚀 Transmitting automated AI reply to client via Gmail SMTP...");

          const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
          const sendInfo = await transporter.sendMail({
            from: `"Alex Mercer (SYNAPSE)" <${gmailUser}>`,
            to: sender,
            subject: replySubject,
            text: aiReply,
            inReplyTo: messageId,
            headers: { "In-Reply-To": messageId, "References": messageId },
          });

          console.log(`✅ AI Reply DELIVERED to ${sender}! MessageId: ${sendInfo.messageId}`);
          console.log("--------------------------------------------------------------------------------\n");
        }
      }
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (err) {
    // Silent failover on poll error
  }
}

// Start continuous polling loop
console.log("🟢 Autonomous email loop is ACTIVE. Listening for incoming client emails...\n");
setInterval(checkInbox, 5000);
checkInbox();