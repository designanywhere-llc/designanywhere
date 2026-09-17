import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";

export function Navbar() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Pricing", href: "/pricing" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-700 border-b border-slate-600 shadow-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo — mix-blend-mode: screen makes black areas transparent, matching bg-slate-700 */}
        <Link href="/" data-testid="link-logo">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <Logo height={42} />
            <span className="font-bold text-lg text-white">
              Design Anywhere
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-testid={`link-nav-${link.label.toLowerCase()}`}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                location === link.href
                  ? "text-white bg-slate-600"
                  : "text-slate-300 hover:text-white hover:bg-slate-600"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-600 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          data-testid="button-mobile-menu-toggle"
          aria-label="Toggle mobile menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-600 shadow-lg">
          <div className="px-6 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-testid={`link-mobile-nav-${link.label.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  location === link.href
                    ? "text-white bg-slate-600"
                    : "text-slate-300 hover:text-white hover:bg-slate-600"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
