"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { TaskProvider } from "@/context/TaskContext";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <TaskProvider>
      <div className="min-h-screen ops-shell bg-white text-[#111] flex flex-col">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="lg:pl-60 flex flex-col flex-1 min-h-screen">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 px-6 lg:px-12 py-8 max-w-[1440px] w-full">
            {children}
          </main>
        </div>
      </div>
    </TaskProvider>
  );
};
