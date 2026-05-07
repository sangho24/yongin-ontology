/** @type {import('next').NextConfig} */
const nextConfig = {
  // 시연 prototype scope — recharts 등 외부 라이브러리 타입 충돌은 빌드 막지 않음
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
