// Run with Node after installing dependencies; no network or account data used.
import { readFileSync, writeFileSync } from "node:fs";
import { createElement as el } from "react";
import { ImageResponse } from "next/og.js";

const flag = `data:image/svg+xml;base64,${readFileSync(new URL("../app/icon.svg", import.meta.url)).toString("base64")}`;
const response = new ImageResponse(
  el("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      width: "100%",
      height: "100%",
      padding: "52px 64px",
      background: "#fffbf2",
      color: "#183c30",
      borderTop: "14px solid #183c30",
    },
    children: [
      el("div", {
        key: "brand",
        style: { display: "flex", gap: 18, alignItems: "center" },
        children: [
          el("img", { key: "flag", src: flag, width: 68, height: 68 }),
          el("span", {
            key: "name",
            style: { fontSize: 54, fontWeight: 700, letterSpacing: -2 },
            children: "fairway.",
          }),
        ],
      }),
      el("div", {
        key: "copy",
        style: { display: "flex", flexDirection: "column", gap: 20 },
        children: [
          el("div", {
            key: "title",
            style: {
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -3,
              maxWidth: 980,
            },
            children: "Golfistas y partidas de golf en León.",
          }),
          el("div", {
            key: "description",
            style: { fontSize: 28 },
            children: "Encuentra con quién jugar y organiza tu próxima ronda.",
          }),
        ],
      }),
      el("div", {
        key: "location",
        style: { display: "flex", alignItems: "center", gap: 16, fontSize: 23 },
        children: [
          el("span", {
            key: "line",
            style: { width: 50, height: 3, background: "#a17c42" },
          }),
          el("span", {
            key: "text",
            children: "León, Guanajuato y alrededores",
          }),
        ],
      }),
    ],
  }),
  { width: 1200, height: 630 },
);
writeFileSync(
  new URL("../public/images/fairway-social.png", import.meta.url),
  Buffer.from(await response.arrayBuffer()),
);
console.log("Generated public/images/fairway-social.png (1200×630).");
