import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowRight, Wrench, Box, Settings, Layers, Database, Factory, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicUrl, serviceImageUrls } from "@/lib/publicUrl";

const CYCLE_MS = 3000;
const FADE_MS = 1000;

const services = [
  {
    id: "product-design",
    title: "Product Design",
    description: "Taking customer napkin sketches and descriptions to manufacturable products",
    images: serviceImageUrls("product-design"),
    icon: Box,
  },
  {
    id: "prototype-dfm",
    title: "Prototype & DFM",
    description: "3D printing, testing and refining, to improving prototypes with Design For Manufacturing",
    images: serviceImageUrls("prototype-dfm"),
    icon: Layers,
  },
  {
    id: "machine-tooling",
    title: "Machine & Tooling Design",
    description: "Custom machinery, tooling for existing machines, PLM Programming, assembly and quality/buy-off testing",
    images: serviceImageUrls("machine-tooling"),
    icon: Wrench,
  },
  {
    id: "cad-3d-modeling",
    title: "3D Modeling & CAD Services",
    description: "Using SolidWorks and GD&T, delivering parts, assemblies, and drawings",
    images: serviceImageUrls("cad-3d-modeling"),
    icon: Settings,
  },
  {
    id: "pdm-plm",
    title: "PDM/PLM Creation",
    description: "Building SolidWorks PDM Servers, Databases, Vaults and Workflows connected to your desired properties",
    images: serviceImageUrls("pdm-plm"),
    icon: Database,
  },
  {
    id: "manufacturing-consultation",
    title: "Manufacturing Solutions Consultation",
    description: "From resolving issues with machinery and manufacturing lines to packaging development",
    images: serviceImageUrls("manufacturing-consultation"),
    icon: Factory,
  },
];

function CyclingServiceCard({ service }: { service: typeof services[0] }) {
  const images = service.images;
  const n = images.length;

  // Two-layer crossfade: "front" is always what the user sees, "back" is hidden
  // and preloaded with the upcoming image. We only ever swap visibility — we never
  // change the src of the currently-visible layer, which eliminates the flash.
  const [frontSrc, setFrontSrc] = useState(images[0]);
  const [backSrc, setBackSrc] = useState(images[1 % n]);
  const [frontOnTop, setFrontOnTop] = useState(true);
  const [hovered, setHovered] = useState(false);

  // All mutable cycling state lives in refs so setTimeout callbacks never go stale
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredRef = useRef(false);
  const frontOnTopRef = useRef(true);
  const nextIdxRef = useRef(2 % n);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const cancel = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // step() is called CYCLE_MS-FADE_MS after the previous swap completes.
  // It swaps layer visibility (starting the CSS cross-fade), then — after the
  // fade — loads the next image into the newly-hidden layer and schedules itself.
  const step = useRef<() => void>(() => {});
  step.current = () => {
    if (!hoveredRef.current) return;
    const imgs = imagesRef.current;

    // Swap which layer is on top — CSS transition handles the actual cross-fade
    const newFrontOnTop = !frontOnTopRef.current;
    frontOnTopRef.current = newFrontOnTop;
    setFrontOnTop(newFrontOnTop);

    // After the cross-fade completes, update the now-hidden layer with the next
    // image so it's preloaded for the upcoming transition. Changing src on a
    // fully-transparent layer causes no visible flash.
    timerRef.current = setTimeout(() => {
      if (!hoveredRef.current) return;
      const ni = nextIdxRef.current;
      nextIdxRef.current = (ni + 1) % imgs.length;

      if (frontOnTopRef.current) {
        // front is visible → update back (hidden)
        setBackSrc(imgs[ni]);
      } else {
        // back is visible → update front (hidden)
        setFrontSrc(imgs[ni]);
      }

      // Schedule the next cross-fade
      timerRef.current = setTimeout(() => step.current(), CYCLE_MS - FADE_MS);
    }, FADE_MS + 100); // +100ms buffer ensures the CSS transition is done
  };

  useEffect(() => {
    hoveredRef.current = hovered;
    if (!hovered) {
      cancel();
      // Reset all state so the card starts from the beginning next hover
      frontOnTopRef.current = true;
      nextIdxRef.current = 2 % imagesRef.current.length;
      setFrontSrc(imagesRef.current[0]);
      setBackSrc(imagesRef.current[1 % imagesRef.current.length]);
      setFrontOnTop(true);
      return;
    }
    // Start the first swap after the user has seen the first image for CYCLE_MS
    timerRef.current = setTimeout(() => step.current(), CYCLE_MS);
    return cancel;
  }, [hovered]);

  // Cleanup on unmount
  useEffect(() => cancel, []);

  const Icon = service.icon;
  const TRANSITION = `opacity ${FADE_MS}ms ease-in-out`;

  return (
    <div
      data-testid={`card-service-${service.id}`}
      className="group rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm hover-elevate transition-all duration-300"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative h-52 overflow-hidden">
        {/* Back layer — hidden, preloaded with the upcoming image */}
        <img
          src={backSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: frontOnTop ? 0 : 1, transition: TRANSITION, zIndex: 1 }}
        />
        {/* Front layer — the currently visible image */}
        <img
          src={frontSrc}
          alt={service.title}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: frontOnTop ? 1 : 0, transition: TRANSITION, zIndex: 2 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" style={{ zIndex: 3 }} />
        <div className="absolute bottom-3 left-4" style={{ zIndex: 4 }}>
          <div className="bg-blue-600/90 backdrop-blur-sm p-2 rounded-lg">
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
          {service.title}
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed">
          {service.description}
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url('${publicUrl("images/hero-engineering.jpg")}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/65 to-slate-900/80" />

        {/* Content — pt-20 keeps the badge clear of the fixed 64px header */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto pt-20">
          <div className="inline-block mb-6">
            <span className="text-sm font-semibold tracking-[0.25em] uppercase text-blue-300 bg-blue-900/40 px-4 py-2 rounded-full border border-blue-400/30">
              Remote Engineering Excellence
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            About{" "}
            <span className="text-blue-400">Design Anywhere</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-200 mb-10 max-w-2xl mx-auto leading-relaxed">
            Design Anywhere is a premier remote engineering team, offering cutting-edge solutions in mechanical design. We bring expert-level CAD, prototyping, and manufacturing knowledge directly to your project — wherever you are.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-8"
                data-testid="button-hero-get-in-touch"
              >
                Get in Touch
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <a href="#services">
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 text-white bg-white/10 backdrop-blur-sm px-8"
                data-testid="button-hero-our-services"
              >
                Our Services
                <ChevronDown className="ml-2 w-5 h-5" />
              </Button>
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/60" />
        </div>
      </section>

      {/* Services Section — dark background so "Our Services" reads in white */}
      <section id="services" className="py-24 bg-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold tracking-[0.2em] uppercase text-blue-400 mb-3 block">
              What We Do
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Our Services
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-lg">
              End-to-end mechanical engineering solutions from concept to manufacturing-ready designs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <CyclingServiceCard key={service.id} service={service} />
            ))}
          </div>

          <div className="text-center mt-14">
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-500 text-white border-0 px-10"
                data-testid="button-services-get-in-touch"
              >
                Get in Touch
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-sm font-semibold tracking-[0.2em] uppercase text-blue-600 mb-3 block">
                Why Design Anywhere
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Engineering Expertise,<br /> Wherever You Are
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-8">
                Our remote team delivers the same precision and quality you'd expect from an on-site engineering department — with the flexibility and efficiency of a modern distributed workflow.
              </p>
              <div className="space-y-5">
                {[
                  { title: "Globally Accessible", description: "Work with world-class engineers regardless of your location" },
                  { title: "SolidWorks Certified", description: "Professional CAD tools and GD&T expertise for every project" },
                  { title: "Full-Cycle Support", description: "From initial concept through manufacturing-ready deliverables" },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 items-start">
                    <div className="mt-1 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{item.title}</p>
                      <p className="text-slate-500 text-sm">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {[
                { value: "Budget", label: "Friendly Pricing" },
                { value: "15+", label: "Years of Experience" },
                { value: "Pro", label: "Service Quality" },
                { value: "6", label: "Core Service Areas" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm text-center"
                >
                  <p className="text-4xl font-bold text-blue-600 mb-1">{stat.value}</p>
                  <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-20 bg-slate-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
            Ready to Bring Your Design to Life?
          </h2>
          <p className="text-slate-600 text-lg mb-8 max-w-xl mx-auto">
            Reach out today and let's discuss how Design Anywhere can support your next engineering project.
          </p>
          <Link href="/contact">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-10"
              data-testid="button-final-cta-get-in-touch"
            >
              Get in Touch
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
