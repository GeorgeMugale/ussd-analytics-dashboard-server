import "reflect-metadata";
import { RequestHandler } from "express";

/**
 * Represents a single route definition for a controller method.
 */
export type Route = {
  method: string;
  path: string;
  methodName: string;
  middleware?: RequestHandler[];
};

export const ROUTE_METADATA_KEY = Symbol("routes");

/**
 * Method decorator factory to define HTTP route handlers.
 */
function route(method: string, path: string) {
  return function (
    target: any,
    methodName: string,
    descriptor: PropertyDescriptor = {}
  ) {
    if (!target) return;

    const controllerClass = target.constructor;

    let routes = Reflect.getMetadata(ROUTE_METADATA_KEY, controllerClass) ?? [];

    // Add the new route to THIS class's OWN array
    routes.push({
      method,
      path,
      methodName: methodName,
      middleware: [], // Initialize empty middleware array
    });

    Reflect.defineMetadata(ROUTE_METADATA_KEY, routes, controllerClass);
  };
}

export const GET = (path: string) => route("get", path);
export const POST = (path: string) => route("post", path);
export const DELETE = (path: string) => route("delete", path);
export const PATCH = (path: string) => route("patch", path);
export const PUT = (path: string) => route("put", path);
