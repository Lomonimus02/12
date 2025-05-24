import { useState, ReactNode, useEffect } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Проверка ширины экрана для определения мобильного режима
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  return (
    <div className="w-full flex flex-col h-screen bg-gray-50 overflow-hidden">
      <Header toggleSidebar={toggleSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} />
        
        {/* Main Content */}
        <main 
          className={`relative isolate flex-1 p-4 transition-all duration-300 
            bg-slate-100 
            before:absolute before:inset-0 before:-z-10 before:content-[''] before:bg-[radial-gradient(ellipse_at_top_center,_var(--tw-gradient-stops))] before:from-sky-300/25 before:via-sky-200/10 before:to-slate-100/0
            after:absolute after:inset-0 after:-z-10 after:content-[''] after:bg-gradient-to-tl after:from-purple-200/20 after:via-transparent after:to-transparent
            ${!sidebarOpen ? 'md:w-full' : ''} 
            ${className || 'overflow-auto'}`} // className prop from page will be merged here
        >
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}
