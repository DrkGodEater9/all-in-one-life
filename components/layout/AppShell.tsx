import * as React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-bg text-text">
      <Sidebar />
      <main className="min-h-screen min-h-[100dvh] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[240px]">
        <Header />
        <div className="mx-auto max-w-6xl overflow-x-clip px-4 py-6 md:px-8">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}

export default AppShell;
