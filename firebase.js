import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore, doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* Dán cấu hình của bạn vào đây */
const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_AUTH_DOMAIN",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_STORAGE_BUCKET",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTION = "game_checkins";
const TIMEZONE = "Asia/Bangkok";

function cleanName(name) {
  return String(name ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeKey(name) {
  // gom về cùng một dạng để tránh khác nhau do hoa/thường/dấu cách/dấu tiếng Việt
  return cleanName(name)
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

function makeDocId(characterName) {
  const key = normalizeKey(characterName);
  let safe = encodeURIComponent(key).replace(/%/g, "_");
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
  const character = cleanName(characterName);
  const fb = cleanName(facebookName);
  const id = makeDocId(character);
  const ref = doc(db, COLLECTION, id);
  const today = todayKey();

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists()) {
      const newData = {
        characterName: character,
        characterKey: normalizeKey(character),
        facebookName: fb || "",
        daysCheckedIn: 1,
        lastCheckedInDate: today,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      tx.set(ref, newData);

      return {
        status: "created",
        message: "Điểm danh lần đầu thành công!",
        record: {
          characterName: character,
          facebookName: newData.facebookName,
          daysCheckedIn: 1,
          lastCheckedInDate: today,
        },
      };
    }

    const data = snap.data() || {};
    const last = String(data.lastCheckedInDate || "");
    const currentDays = Number(data.daysCheckedIn || 0);

    if (last === today) {
      return {
        status: "already",
        message: "Hôm nay đã điểm danh rồi.",
        record: {
          characterName: data.characterName || character,
          facebookName: data.facebookName || "",
          daysCheckedIn: currentDays,
          lastCheckedInDate: last || today,
        },
      };
    }

    const nextDays = currentDays + 1;
    const updates = {
      daysCheckedIn: nextDays,
      lastCheckedInDate: today,
      updatedAt: serverTimestamp(),
    };

    if (fb && fb !== String(data.facebookName || "")) {
      updates.facebookName = fb;
    }

    tx.update(ref, updates);

    return {
      status: "updated",
      message: "Điểm danh thành công! Đã cộng thêm 1 ngày.",
      record: {
        characterName: data.characterName || character,
        facebookName: updates.facebookName ?? (data.facebookName || ""),
        daysCheckedIn: nextDays,
        lastCheckedInDate: today,
      },
    };
  });
}
