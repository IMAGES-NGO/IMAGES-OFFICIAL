import type { Metadata } from "next";
import "./globals.css";
import Providers from "./components/Providers";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AutoLogout from "./components/auth/AutoLogout";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "IMAGES",
  description: "IMAGES - Exploring you in you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <Providers>
          <Toaster position="top-center" />
          <AutoLogout />
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
