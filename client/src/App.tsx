import { useEffect } from "react";
import { Router, Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Contact from "@/pages/contact";
import Pricing from "@/pages/pricing";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { applyDocumentMeta, pageForPath } from "@/lib/seo";

/** Vite BASE_URL always has a trailing slash; wouter's base must not. */
const routerBase = import.meta.env.BASE_URL.replace(/\/$/, "");

function Routes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/contact" component={Contact} />
      <Route path="/pricing" component={Pricing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DocumentMeta() {
  const [location] = useLocation();
  useEffect(() => {
    applyDocumentMeta(pageForPath(location), import.meta.env.BASE_URL);
  }, [location]);
  return null;
}

function App({ ssrPath }: { ssrPath?: string } = {}) {
  return (
    <Router base={routerBase} ssrPath={ssrPath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <DocumentMeta />
          <Toaster />
          <Navbar />
          <Routes />
          <Footer />
        </TooltipProvider>
      </QueryClientProvider>
    </Router>
  );
}

export default App;
