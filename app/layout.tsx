import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { StickyNoteProvider } from "@/context/StickyNoteContext";
import { UndoProvider } from "@/context/UndoContext";
import { ElectronBackupProvider } from "@/components/ElectronBackupProvider";
import { BrowserAutoBackupProvider } from "@/components/BrowserAutoBackupProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "日历应用",
  description: "本周日历视图，可创建事件和设置提醒",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col antialiased`}>
        <ElectronBackupProvider>
          <BrowserAutoBackupProvider>
            <UndoProvider>
              <StickyNoteProvider>
                {children}
                <Toaster />
              </StickyNoteProvider>
            </UndoProvider>
          </BrowserAutoBackupProvider>
        </ElectronBackupProvider>
      </body>
    </html>
  );
}
