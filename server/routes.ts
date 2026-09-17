import type { Express } from "express";
import type { Server } from "http";
import { handleContact } from "./contact";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/contact", handleContact);
  return httpServer;
}
