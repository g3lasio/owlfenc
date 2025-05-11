import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  toggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export default function Header({
  toggleMobileMenu,
  isMobileMenuOpen,
}: HeaderProps) {
  const [location] = useLocation();
  
  const handleMenuToggle = () => {
    console.log("Menu toggle clicked, current state:", isMobileMenuOpen);
    toggleMobileMenu();
  };

  return (
    <header className="h-16 w-full flex items-center justify-between px-4 border-b border-border bg-card sticky top-0 z-50">
      <button
        className={`p-2 rounded-md hover:bg-accent/20 transition-all duration-300 z-[10000] relative overflow-hidden group md:hidden ${isMobileMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleMenuToggle();
        }}
        aria-label="Menu principal"
        aria-expanded={isMobileMenuOpen}
        type="button"
      >
        <i className="ri-menu-line text-xl relative z-10 transition-transform duration-300 group-hover:rotate-180"></i>
        <div className="absolute inset-0 bg-primary/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
      </button>

      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center">
        <Link href="/" className="cursor-pointer">
          <img
            src="https://i.postimg.cc/4yc9M62C/White-logo-no-background.png"
            alt="Owl Fence"
            className="h-14 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Espacio vacío en el lado derecho para mantener el logo centrado */}
      <div className="w-10"></div>
    </header>
  );
}