// SMS network helper delegating to Malawi prefix detector
const { detectNetwork } = require("../../utils/phone");

function resolveSmsNetwork(phoneE164, customPrefixes = null) {
  return detectNetwork(phoneE164, customPrefixes, null);
}

module.exports = { resolveSmsNetwork };
