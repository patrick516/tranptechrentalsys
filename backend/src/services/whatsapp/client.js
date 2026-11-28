// WhatsApp Business Cloud API client.
// Sends free-form text (allowed only inside a 24-hour customer service
// window) or an approved template (outside it), and reports delivery status.
//
// Nothing here runs until WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID
// are filled in .env with real values from Meta.
const config = require("../../config/whatsapp");
const logger = require("../../lib/logger");
const { metaTemplateName } = require("./templates");
const { buildWhatsAppLink } = require("./link");

const API_BASE = `https://graph.facebook.com/${config.apiVersion}`;

class WhatsAppNotConfiguredError extends Error {
  constructor() {
    super("WhatsApp Cloud API is not configured (missing access token or phone number id)");
    this.code = "WHATSAPP_NOT_CONFIGURED";
    this.status = 503;
  }
}

function assertConfigured() {
  if (!config.isConfigured()) throw new WhatsAppNotConfiguredError();
}

async function callGraph(path, payload) {
  assertConfigured();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = json?.error?.message || `WhatsApp API returned ${res.status}`;
    const err = new Error(detail);
    err.status = res.status;
    err.code = json?.error?.code || "WHATSAPP_API_ERROR";
    throw err;
  }
  return json;
}

// Free-form text. Only valid inside the 24-hour service window.
async function sendText(toPhone, body) {
  const json = await callGraph(`/${config.phoneNumberId}/messages`, {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "text",
    text: { preview_url: false, body },
  });
  return {
    providerMessageId: json?.messages?.[0]?.id || null,
    status: "SENT",
    channel: "WHATSAPP",
  };
}

// Pre-approved template with ordered variables. Use outside the window.
async function sendTemplate(toPhone, templateKey, vars = {}) {
  const name = metaTemplateName(templateKey);
  if (!name) {
    throw Object.assign(new Error(`No WhatsApp template for key ${templateKey}`), {
      status: 400,
      code: "WHATSAPP_TEMPLATE_UNKNOWN",
    });
  }
  const components = [
    {
      type: "body",
      parameters: buildParameters(templateKey, vars),
    },
  ];
  const json = await callGraph(`/${config.phoneNumberId}/messages`, {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "template",
    template: { name, language: { code: "en" }, components },
  });
  return {
    providerMessageId: json?.messages?.[0]?.id || null,
    status: "SENT",
    channel: "WHATSAPP",
  };
}

function buildParameters(templateKey, vars) {
  const { buildTemplateParams } = require("./templates");
  return (buildTemplateParams(templateKey, vars) || []).map((value) => ({
    type: "text",
    text: value,
  }));
}

// Sends the right thing for the key: template when known, text otherwise.
async function send({ toPhone, templateKey, vars, body }) {
  if (templateKey && metaTemplateName(templateKey)) {
    return sendTemplate(toPhone, templateKey, vars || {});
  }
  return sendText(toPhone, body || "");
}

// Falls back to a wa.me link when the API is not configured or refuses.
async function sendOrLink({ toPhone, templateKey, vars, body }) {
  try {
    return await send({ toPhone, templateKey, vars, body });
  } catch (err) {
    logger.warn("WhatsApp send failed, falling back to wa.me link", {
      code: err.code,
      message: err.message,
    });
    return {
      channel: "WHATSAPP",
      status: "LINK",
      waLink: buildWhatsAppLink(toPhone, body || ""),
      error: err.message,
    };
  }
}

// Delivery/read status and inbound replies, used by the webhook.
function parseStatusWebhook(body = {}) {
  const updates = [];
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const status of value.statuses || []) {
        updates.push({
          providerMessageId: status.id,
          status: (status.status || "").toUpperCase(),
          timestamp: status.timestamp ? Number(status.timestamp) : null,
          error: status.errors?.[0]?.title || "",
        });
      }
      for (const msg of value.messages || []) {
        updates.push({
          type: "INBOUND",
          providerMessageId: msg.id,
          from: msg.from,
          body:
            msg.text?.body ||
            msg.button?.text ||
            msg.interactive?.button_reply?.title ||
            "",
          timestamp: msg.timestamp ? Number(msg.timestamp) : null,
        });
      }
    }
  }
  return updates;
}

module.exports = {
  WhatsAppNotConfiguredError,
  isConfigured: config.isConfigured,
  isEnabled: config.isEnabled,
  send,
  sendText,
  sendTemplate,
  sendOrLink,
  parseStatusWebhook,
};
