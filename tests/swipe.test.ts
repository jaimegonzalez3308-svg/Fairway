import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { swipeChoice } from "../lib/swipe";
import { SwipeDeck } from "../components/swipe-deck";
import { demoProfiles } from "../lib/demo";

test("un arrastre horizontal suficiente decide en la dirección correcta", () => {
  assert.equal(swipeChoice(130, 15, 440, 600), "like");
  assert.equal(swipeChoice(-130, 15, 440, 600), "pass");
  assert.equal(swipeChoice(80, 0, 280, 600), "like");
});
test("un arrastre corto deliberado funciona en móvil y escritorio sin sacar la tarjeta", () => {
  for (const direction of [-1, 1]) {
    const choice = direction > 0 ? "like" : "pass";
    assert.equal(swipeChoice(direction * 48, 8, 280, 600), choice);
    assert.equal(swipeChoice(direction * 60, 10, 360, 600), choice);
    assert.equal(swipeChoice(direction * 72, 12, 600, 600), choice);
    assert.equal(swipeChoice(direction * 40, 2, 360, 600), null);
  }
});
test("taps, arrastres cortos y desplazamiento vertical no envían decisiones", () => {
  assert.equal(swipeChoice(0, 0, 440, 20), null);
  assert.equal(swipeChoice(30, 2, 440, 600), null);
  assert.equal(swipeChoice(140, 220, 440, 600), null);
  assert.equal(swipeChoice(120, 120, 440, 400), null);
  assert.equal(swipeChoice(100, 0, 0, 600), null);
  assert.equal(swipeChoice(Number.NaN, 0, 440, 600), null);
});
test("un flick breve exige distancia mínima y velocidad, además de intención horizontal", () => {
  assert.equal(swipeChoice(65, 3, 440, 75), "like");
  assert.equal(swipeChoice(-65, 3, 440, 75), "pass");
  assert.equal(swipeChoice(35, 0, 440, 20), null);
  assert.equal(swipeChoice(65, 3, 440, 400), null);
  assert.equal(swipeChoice(65, 100, 440, 50), null);
  assert.equal(swipeChoice(40, 3, 440, 70), "like");
  assert.equal(swipeChoice(-40, 3, 440, 70), "pass");
  assert.equal(swipeChoice(40, 3, 440, 200), null);
  assert.equal(swipeChoice(35, 2, 440, 20), null);
});
test("solo la primera tarjeta expone acciones; la siguiente es una vista decorativa", () => {
  let rendered = 0;
  const html = renderToStaticMarkup(
    createElement(SwipeDeck, {
      profiles: demoProfiles.slice(0, 3),
      async onDecide() {
        throw new Error("No guardar durante el render");
      },
      renderCard(profile, actions) {
        rendered++;
        return createElement(
          "article",
          null,
          profile.name,
          createElement("button", { onClick: actions.onLike }, "Dar like"),
          createElement("button", { onClick: actions.onPass }, "Pasar"),
        );
      },
      empty: createElement("p", null, "Sin perfiles"),
    }),
  );
  assert.equal(rendered, 1);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /aria-describedby="[^"]+"/);
  assert.match(html, /swipe-under-card" aria-hidden="true"/);
  assert.equal([...html.matchAll(/<button/g)].length, 2);
  assert.match(html, /3 por descubrir/);
  assert.doesNotMatch(html, /Sin perfiles/);
});
test("el final del mazo ofrece la acción vacía sin tarjetas ni controles de decisión", () => {
  const html = renderToStaticMarkup(
    createElement(SwipeDeck, {
      profiles: [],
      async onDecide() {
        return true;
      },
      renderCard() {
        throw new Error("No hay perfil");
      },
      empty: createElement("button", null, "Ver todas las ciudades"),
    }),
  );
  assert.match(html, /Ver todas las ciudades/);
  assert.doesNotMatch(html, /class="swipe-card/);
});
