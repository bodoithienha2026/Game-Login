import { checkInCharacter, todayKey } from "./firebase.js";

const $ = (sel) => document.querySelector(sel);

function show(el, yes) {
  el.classList.toggle("hidden", !yes);
}

function setBusy(el, busy, textBusy = "Đang xử lý...") {
  el.disabled = !!busy;
  if (!el.dataset._label) el.dataset._label = el.textContent;
  el.textContent = busy ? textBusy : el.dataset._label;
}

function toast(message) {
  const root = $("#toastRoot");
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  root.appendChild(node);

  const t = setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(6px)";
    node.style.transition = "200ms ease";
    setTimeout(() => node.remove(), 220);
  }, 2400);

  node.addEventListener("click", () => {
    clearTimeout(t);
    node.remove();
  });
}

function setInputError(inputEl, errEl, hasError) {
  show(errEl, hasError);
  inputEl.classList.toggle("ring-2", hasError);
  inputEl.classList.toggle("ring-red-400/60", hasError);
  inputEl.classList.toggle("border-red-400/40", hasError);
}

function titleByStatus(status) {
  if (status === "created") return "Tạo mới & điểm danh";
  if (status === "updated") return "Điểm danh thành công";
  if (status === "already") return "Đã điểm danh hôm nay";
  return "Kết quả";
}

function badgeByStatus(status) {
  if (status === "created") return "MỚI";
  if (status === "updated") return "OK";
  if (status === "already") return "ĐỦ";
  return "INFO";
}

function renderResult(res) {
  const resultCard = $("#resultCard");
  const resultTitle = $("#resultTitle");
  const resultMsg = $("#resultMsg");
  const resultBadge = $("#resultBadge");

  const statDays = $("#statDays");
  const statLast = $("#statLast");
  const statFb = $("#statFb");

  show(resultCard, true);

  resultTitle.textContent = titleByStatus(res.status);
  resultMsg.textContent = res.message;
  resultBadge.textContent = badgeByStatus(res.status);

  const r = res.record || {};
  statDays.textContent = String(r.daysCheckedIn ?? "-");
  statLast.textContent = String(r.lastCheckedInDate ?? "-");
  statFb.textContent = r.facebookName ? r.facebookName : "-";
}

function clean(s) {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}

function main() {
  const form = $("#checkinForm");
  const characterName = $("#characterName");
  const facebookName = $("#facebookName");
  const btn = $("#btnCheckIn");
  const nameError = $("#nameError");

  $("#todayLabel").textContent = todayKey();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const char = clean(characterName.value);
    const fb = clean(facebookName.value);

    const missing = !char;
    setInputError(characterName, nameError, missing);
    if (missing) {
      toast("Bạn chưa nhập tên nhân vật.");
      characterName.focus();
      return;
    }

    setBusy(btn, true, "Đang điểm danh...");
    setInputError(characterName, nameError, false);

    try {
      const res = await checkInCharacter(char, fb);
      renderResult(res);

      if (res.status === "already") toast("Hôm nay bạn đã điểm danh rồi.");
      else toast("Điểm danh thành công!");
    } catch (err) {
      console.error(err);
      toast(err?.message || "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setBusy(btn, false);
    }
  });
}

main();
