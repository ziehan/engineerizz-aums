import type { Metadata } from "next";
import { Noto_Sans_Malayalam } from "next/font/google";
import "./globals.css";

const notoSansMalayalam = Noto_Sans_Malayalam({
  subsets: ['malayalam'],
  weight: ['400', '500', '600', '700'], 
  variable: '--font-noto-malayalam',
});

export const metadata: Metadata = {
  title: "AUMS",
  description: "AUMS App",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased`}
    >
      <body className={`${notoSansMalayalam.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
