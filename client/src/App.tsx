import { Router, Switch, Route } from "wouter";
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

function App() {
  return (
    <Router base={routerBase}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
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
