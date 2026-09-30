/**
 * Envoltorios tipados sobre `test/helpers/route.ts`.
 *
 * El helper compartido devuelve `body: unknown` a propósito y no expone un
 * genérico en `get`/`post`/`put`/`patch`/`del`, así que cualquier acceso a una
 * propiedad del cuerpo (`body.error`, `body[0].id`, …) rompe `tsc --noEmit`
 * en modo estricto. Este archivo vive dentro de mi carpeta (no toco
 * `test/helpers`) y solo relaja ese tipo de retorno para los tests de Gym.
 */
import * as Route from "../../helpers/route";

type WithAnyBody<T> = T extends { body: unknown }
  ? Omit<T, "body"> & { body: any }
  : T;

function relax<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  return (...args: A) => fn(...args) as unknown as Promise<WithAnyBody<R>>;
}

export const get = relax(Route.get);
export const post = relax(Route.post);
export const put = relax(Route.put);
export const patch = relax(Route.patch);
export const del = relax(Route.del);
export const callRoute = relax(Route.callRoute);
export const makeRequest = Route.makeRequest;
