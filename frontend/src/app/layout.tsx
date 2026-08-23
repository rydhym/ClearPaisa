'use intelligence'; // Standard Next.js client component flag or we can handle it directly.
// Let's write it as a client-side wrapper since it evaluates route pathnames and auth stores
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { initialize, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initialize();
    setMounted(true);
  }, [initialize]);

  // Auth Protection redirect rules
  useEffect(() => {
    if (mounted) {
      const isAuthPage = pathname === "/login" || pathname === "/register";
      if (!isAuthenticated && !isAuthPage) {
        router.push("/login");
      } else if (isAuthenticated && isAuthPage) {
        router.push("/");
      }
    }
  }, [mounted, isAuthenticated, pathname, router]);

  if (!mounted) {
    return (
      <html lang="en">
        <body className="bg-[#f5f5f7] min-h-screen flex items-center justify-center">
          <div className="text-apple-gray-300 animate-pulse text-lg font-medium">ClearPaisa is loading...</div>
        </body>
      </html>
    );
  }

  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <html lang="en">
      <body className="bg-[#f5f5f7] min-h-screen text-[#1d1d1f]">
        {isAuthPage ? (
          <main className="min-h-screen flex items-center justify-center p-4">
            {children}
          </main>
        ) : (
          <div className="flex min-h-screen">
            {/* Sidebar Left Column */}
            <Sidebar />

            {/* Content Right Column */}
            <div className="flex-1 flex flex-col min-w-0">
              <Navbar />
              <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl w-full mx-auto">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
