/**
 * Offline/CI helper for next/font/google when fonts.gstatic.com is unreachable.
 * Usage: NEXT_FONT_GOOGLE_MOCKED_RESPONSES=<abs-path>/scripts/mock-google-fonts.cjs
 *
 * CSS URLs are keyed dynamically; font binaries become Buffer.from(url) in Next's loader.
 */
module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== "string" || prop === "__esModule") return undefined;
      return `
@font-face {
  font-family: 'MockedGoogleFont';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/mock/v1/mock.woff2) format('woff2');
}
`;
    },
    has() {
      return true;
    },
  },
);
