import { test } from "node:test";
import assert from "node:assert/strict";
import { profileSchema } from "../lib/profile-validation";

const validForm = {
  name: "Ana Pérez",
  city: "León",
  age: "34",
  handicap: "",
  club_id: "",
  bio: "",
  availability: ["Sábado"],
  holes: "18",
  style: "social",
  hand: "derecha",
  years: "3",
  frequency: "Semanal",
  transport: "Indistinto",
  accepts_guests: false,
  beginner_friendly: true,
  formats: [],
  additional_clubs: [],
  gender: "",
  occupation: "",
  visibility: "members",
};

const handicap = (value: unknown) =>
  profileSchema.safeParse({ ...validForm, handicap: value });

test("el formulario base es válido", () => {
  assert.equal(profileSchema.safeParse(validForm).success, true);
});

test("handicap vacío se guarda como null, no como 0 (regresión)", () => {
  for (const empty of ["", "   ", null]) {
    const parsed = handicap(empty);
    assert.equal(parsed.success, true, `entrada ${JSON.stringify(empty)}`);
    assert.equal(parsed.data?.handicap, null);
  }
});

test("handicap 0 y valores del rango se conservan como número", () => {
  assert.equal(handicap("0").data?.handicap, 0);
  assert.equal(handicap(0).data?.handicap, 0);
  assert.equal(handicap("12.4").data?.handicap, 12.4);
  assert.equal(handicap("-10").data?.handicap, -10);
  assert.equal(handicap("54").data?.handicap, 54);
});

test("handicap fuera de rango o no numérico se rechaza", () => {
  for (const invalid of ["-10.1", "54.1", "abc", undefined]) {
    assert.equal(handicap(invalid).success, false, `entrada ${invalid}`);
  }
});
