import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { FontLoader } from "@/components/layout/FontLoader";

export const metadata: Metadata = {
  title: { default: "리드플로우", template: "%s · 리드플로우" },
  description: "DB 배정부터 미팅, 결과보고, 후속관리까지 한 화면에서 정리하는 컨설팅 운영 시스템",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14284b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <FontLoader />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
