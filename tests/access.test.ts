import { test } from "node:test";
import assert from "node:assert/strict";
import { requiresAccount } from "../lib/access";
test("las rutas públicas permiten explorar sin una cuenta", () => {
  for (const page of ["inicio", "descubrir", "clubes", "privacidad"])
    assert.equal(requiresAccount(page), false);
});
test("datos y acciones personales requieren cuenta incluso si se accede por enlace directo", () => {
  for (const page of [
    "partidas",
    "comunidad",
    "mensajes",
    "perfil",
    "scores",
    "estadisticas",
    "hoy",
    "ajustes",
    "admin",
    "notificaciones",
    "desconocida",
  ])
    assert.equal(requiresAccount(page), true);
});
