import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getDatabase,
  ref,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHVFd3D8kkgQeYsPdn0egIbZyXi0iwna0",
  authDomain: "data-login-d4dda.firebaseapp.com",
  databaseURL: "https://data-login-d4dda-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "data-login-d4dda",
  storageBucket: "data-login-d4dda.firebasestorage.app",
  messagingSenderId: "357680638954",
  appId: "1:357680638954:web:d24ee9216b1e3529ab6093",
  measurementId: "G-V618T28E5N"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const ROOT = "game_checkins";
const TIMEZONE = "Asia/Bangkok";

function clean(s) {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}

function normalizeKey(name) {
  return clean(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function makeId(characterName) {
  const base = normalizeKey(characterName);

  // key không được có . # $ [ ] /
  let safe = base
    .replace(/[.#$[\]/]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");

  safe = encodeURIComponent(safe).replace(/%/g, "_");
  if (safe.length <= 160) return safe;
  return safe.slice(0, 160) + "_" + fnv1a32(safe);
}

export function todayKey() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // YYYY-MM-DD
}

export async function checkInCharacter(characterName, facebookName) {
  const character = clean(characterName);
  const fb = clean(facebookName);
  const id = makeId(character);
  const today = todayKey();

  const r = ref(db, `${ROOT}/${id}`);

  let status = "updated"; // created | updated | already

  const result = await runTransaction(
    r,
    (current) => {
      if (current == null) {
        status = "created";
        return {
          characterName: character,
          characterKey: normalizeKey(character),
          facebookName: fb || "",
          daysCheckedIn: 1,
          lastCheckedInDate: today,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
      }

      const last = String(current.lastCheckedInDate || "");
      if (last === today) {
        status = "already";
        return current;
      }

      status = "updated";
      const days = Number(current.daysCheckedIn || 0);

      const next = {
        ...current,
        daysCheckedIn: days +
