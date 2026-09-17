import { Link } from "wouter";
import { Mail } from "lucide-react";
import { SiX, SiLinkedin } from "react-icons/si";
import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <Link href="/" data-testid="link-footer-logo">
              <div className="flex items-center gap-2.5 mb-4 cursor-pointer w-fit">
                <Logo height={42} />
                <span className="font-bold text-white text-lg">Design Anywhere</span>
              </div>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              A premier remote engineering team offering cutting-edge solutions in mechanical design.
            </p>

            {/* Contact & Social */}
            <a
              href="mailto:engineering@designanywhere.org"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors mb-4"
              data-testid="link-footer-email"
            >
              <Mail className="w-4 h-4 flex-shrink-0" />
              engineering@designanywhere.org
            </a>

            <div className="flex items-center gap-3 mt-1">
              <a
                href="https://x.com/designanywhere"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Design Anywhere on X"
                className="text-slate-500 hover:text-white transition-colors"
                data-testid="link-footer-x"
              >
                <SiX className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/designanywhere"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Design Anywhere on LinkedIn"
                className="text-slate-500 hover:text-white transition-colors"
                data-testid="link-footer-linkedin"
              >
                <SiLinkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                  data-testid="link-footer-home"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                  data-testid="link-footer-pricing"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                  data-testid="link-footer-contact"
                >
                  Contact
                </Link>
              </li>
              <li>
                <a href="#services" className="text-slate-400 hover:text-white text-sm transition-colors">
                  Services
                </a>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-white mb-4">Services</h3>
            <ul className="space-y-2">
              {[
                "Product Design",
                "Prototype & DFM",
                "Machine & Tooling Design",
                "3D Modeling & CAD Services",
                "PDM/PLM Creation",
                "Manufacturing Consultation",
              ].map((service) => (
                <li key={service}>
                  <span className="text-slate-400 text-sm">{service}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-700 mt-10 pt-6 flex flex-wrap gap-4 items-center justify-between">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Design Anywhere LLC. All rights reserved.
          </p>
          <p className="text-slate-600 text-xs">
            designanywhere.org
          </p>
        </div>
      </div>
    </footer>
  );
}
