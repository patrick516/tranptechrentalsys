// WhatsApp template helpers.
// Maps internal template keys to Meta-approved template names and their
// ordered variable lists, and renders the free-text fallback used for
// wa.me links and the message history row.
const {
  TEMPLATES,
  resolveTemplateKey,
} = require("./templateCatalog");

function isConfiguredTemplate(key) {
  return Boolean(resolveTemplateKey(key));
}

// Renders the plain-text version of a template.
function renderWhatsAppTemplate(templateKey, vars = {}) {
  const resolved = resolveTemplateKey(templateKey);
  if (resolved) {
    return TEMPLATES[resolved].fallback(vars);
  }
  return String(vars.body || "");
}

// Ordered variable values for a Meta template call ({{1}}, {{2}} …).
function buildTemplateParams(templateKey, vars = {}) {
  const resolved = resolveTemplateKey(templateKey);
  if (!resolved) return null;
  return TEMPLATES[resolved].vars.map((name) => String(vars[name] ?? ""));
}

// The Meta template name, or null when the key has no WhatsApp equivalent.
function metaTemplateName(templateKey) {
  const resolved = resolveTemplateKey(templateKey);
  return resolved ? TEMPLATES[resolved].name : null;
}

module.exports = {
  TEMPLATES,
  isConfiguredTemplate,
  renderWhatsAppTemplate,
  buildTemplateParams,
  metaTemplateName,
};
