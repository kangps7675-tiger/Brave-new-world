/** @type {import('postcss-load-config').Config} */
/**
 * ⚠️ Next.js는 커스텀 postcss.config가 있으면 **기본 설정을 대체**한다.
 * 즉 여기에 autoprefixer를 명시하지 않으면 프리픽스가 아예 붙지 않는다.
 * (Tailwind가 backdrop-filter 등 일부만 자체 출력해 지금까지 티가 안 났다.)
 * 대상 브라우저는 package.json의 `browserslist`가 정본이다.
 */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
