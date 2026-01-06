import "reflect-metadata";
import express, { RequestHandler } from "express";
import analyticsController, {
  AnalyticsController,
} from "../controllers/analyticsController.js";
import { Route, ROUTE_METADATA_KEY } from "../utils/decorators.js";
/**
 * DEMONSTRATION: Dynamic Route Registration with Decorators
 *
 * This file showcases an alternative to manual Express route registration
 * by using TypeScript decorators to define routes declaratively on controllers.
 *
 * Key Components:
 * 1. Route decorators (@Get, @Post, etc.) on controller methods
 * 2. Reflect metadata to store/retrieve route definitions
 * 3. Automatic route discovery and registration
 * 4. Built-in async error handling via wrapAsync()
 *
 * Note: This is a demo implementation. In production, consider using
 * established frameworks like NestJS, Routing-Controllers, or similar.
 */

const analyticsRoutes = express.Router();

/**
 * Wraps an async route handler to properly catch and forward errors to Express error middleware
 * @param fn - The async route handler to wrap
 * @returns A wrapped handler that catches Promise rejections
 */
function wrapAsync(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    // Ensure any rejected promise is caught and passed to Express error handling
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Processes a single route definition and registers it with the router
 * @param route - The route metadata from decorators
 * @param routeMap - Map to accumulate routes for potential deduplication
 * @param controllerInstance - The controller instance containing the handler method
 * @param basePath - Base path prefix for all routes in this controller
 */
function handleRoute(
  route: Route,
  routeMap: Map<string, RequestHandler[]>,
  controllerInstance: AnalyticsController & { [key: string]: Function },
  basePath: string
): void {
  // Wrap the controller method to handle async errors properly
  const handler = wrapAsync(
    controllerInstance[route.methodName].bind(controllerInstance)
  );

  // Combine route-specific middleware with the main handler
  const allHandlers = [...(route.middleware || []), handler];

  // Construct the full path by combining basePath and route path
  let fullPath = `${basePath}${route.path}`;

  // Clean up path formatting issues
  // Remove double slashes that may occur when basePath ends with / and route.path starts with /
  if (fullPath.includes("//")) {
    fullPath = fullPath.replace(/\/\//g, "/");
  }

  // Remove trailing slash unless it's the root path
  if (fullPath.length > 1 && fullPath.endsWith("/")) {
    fullPath = fullPath.slice(0, -1);
  }

  // Create a unique key for this route (method + path) for deduplication
  const method = route.method.toLowerCase();
  const routeKey = `${method}#${fullPath}`;

  // Initialize array for this route if it doesn't exist
  if (!routeMap.has(routeKey)) {
    routeMap.set(routeKey, []);
  }

  // Add handlers to the route map (useful if multiple decorators define the same route)
  routeMap.get(routeKey)!.push(...allHandlers);
}

try {
  // Map to store routes by their unique key (method#path)
  // This allows for handling potential duplicate route definitions
  const routeMap = new Map<string, RequestHandler[]>();

  // Get controller metadata defined by decorators
  const routes: Route[] =
    Reflect.getMetadata(ROUTE_METADATA_KEY, AnalyticsController) || [];

  // Process each route defined by decorators on the controller
  for (const route of routes) {
    handleRoute(route, routeMap, analyticsController as any, "");
  }

  // register routes with the Express router
  for (const [routeKey, handlers] of routeMap.entries()) {
    const [method, path] = routeKey.split("#");

    // Type-safe method assignment to router
    const routerMethod = method as keyof typeof analyticsRoutes;
    if (typeof analyticsRoutes[routerMethod] === "function") {
      (analyticsRoutes[routerMethod] as Function)(path, ...handlers);
   
    } else {
      console.error(`❌ Invalid HTTP method: ${method} for path: ${path}`);
    }
  }
} catch (err) {
  console.error(`❌ Failed to load analytics controller routes`, err);
  // Consider throwing or handling this error appropriately based on your application needs
  throw err; //fail fast
}

export default analyticsRoutes;
