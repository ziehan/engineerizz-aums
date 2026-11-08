const net = require("node:net");

const PRIVATE_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "instance-data.ec2.internal",
]);

/**
 * Checks whether an IPv4 address belongs to a private, loopback, or link-local range.
 *
 * @param {string} address - IPv4 address string.
 * @returns {boolean} True if address is in a private network range.
 */
function isPrivateIpv4(address) {
  const octets = address.split(".").map(Number);
  const [first, second] = octets;
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first === 127 ||
    (first === 169 && second === 254) ||
    first === 0 ||
    (first === 100 && second >= 64 && second <= 127)
  );
}

/**
 * Checks whether an IP address (IPv4 or IPv6) is private or internal.
 *
 * @param {string} address - IP address string.
 * @returns {boolean} True if IP address is internal.
 */
function isPrivateIp(address) {
  if (net.isIPv4(address)) return isPrivateIpv4(address);
  if (!net.isIPv6(address)) return false;
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

/**
 * Validates external HTTP(S) image URLs against SSRF, internal hostnames, and private IPs.
 *
 * @param {string} value - Image URL candidate.
 * @returns {string} Sanitized URL string.
 * @throws {TypeError} If value is empty or not HTTP(S).
 * @throws {Error} If URL resolves to internal or private targets.
 */
function assertSafeExternalUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Image URL must be a non-empty string");
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError("Image URL is invalid");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new TypeError("Image URL must use HTTP or HTTPS");
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    PRIVATE_HOSTNAMES.has(hostname) ||
    hostname === "169.254.169.254" ||
    isPrivateIp(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Image URL points to a private or internal host");
  }

  return parsed.toString();
}

module.exports = { assertSafeExternalUrl, isPrivateIp };
