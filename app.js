let currentProcess = "wareneingang";
let successTimeout = null;

const supplierTemplates = {
  "Regler Systems": {
    supplier: "Regler Systems",
    sheets: "1690",
    laenge: "1200",
    breite: "800",
    nettoGewicht: "450",
    bruttoGewicht: "480",
    palettenNummer: "1/1"
  },
  "Weig": {
    supplier: "Weig",
    sheets: "1420",
    laenge: "1350",
    breite: "900",
    nettoGewicht: "520",
    bruttoGewicht: "555",
    palettenNummer: "2/4"
  },
  "Tambrite": {
    supplier: "Tambrite",
    sheets: "1580",
    laenge: "980",
    breite: "720",
    nettoGewicht: "385",
    bruttoGewicht: "412",
    palettenNummer: "1/3"
  },
  "CrownBoard Craft": {
    supplier: "CrownBoard Craft",
    sheets: "1880",
    laenge: "1450",
    breite: "1000",
    nettoGewicht: "610",
    bruttoGewicht: "648",
    palettenNummer: "3/5"
  }
};

let booking = {
  documentBarcode: "",
  pidBarcode: "",
  incomingLocation: "",
  supplier: "",
  sheets: "",
  laenge: "",
  breite: "",
  nettoGewicht: "",
  bruttoGewicht: "",
  palettenNummer: "",
  supplierMatched: false
};

let transferBooking = {
  pidBarcode: "",
  currentLocation: "",
  newLocation: ""
};

const incomingFields = [
  "sheets",
  "laenge",
  "breite",
  "nettoGewicht",
  "bruttoGewicht",
  "palettenNummer"
];

const pendingEdits = {
  sheets: false,
  laenge: false,
  breite: false,
  nettoGewicht: false,
  bruttoGewicht: false,
  palettenNummer: false
};

const transferLocationTemplates = [
  "A-01-03",
  "B-02-01",
  "C-03-04",
  "D-01-02",
  "E-02-06",
  "F-04-01"
];

document.addEventListener("DOMContentLoaded", () => {
  updateConnectionStatus();
  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);

  const header = document.getElementById("appHeader");
  if (header) header.style.visibility = "hidden";

  resetIncomingForm();
  resetTransferForm();

  setTimeout(() => {
    if (header) header.style.visibility = "visible";
    showScreen("wareneingang");
    focusIncomingDoc();
  }, 5000);
});

function showScreen(screen) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  const target = document.getElementById("screen-" + screen);
  if (target) target.classList.add("active");
}

function toggleMenu() {
  const overlay = document.getElementById("menuOverlay");
  if (!overlay) return;
  overlay.classList.toggle("open");
}

function closeMenu() {
  const overlay = document.getElementById("menuOverlay");
  if (!overlay) return;
  overlay.classList.remove("open");
}

function switchProcess(process) {
  closeMenu();
  currentProcess = process;

  if (process === "wareneingang") {
    showScreen("wareneingang");
    focusIncomingDoc();
    return;
  }

  if (process === "umbuchung") {
    showScreen("umbuchung");
    focusTransferPid();
  }
}

function updateConnectionStatus() {
  const isOnline = navigator.onLine;

  const textIncoming = document.getElementById("connectionText");
  const dotIncoming = document.getElementById("connectionDot");
  const textTransfer = document.getElementById("connectionTextTransfer");
  const dotTransfer = document.getElementById("connectionDotTransfer");

  const label = isOnline ? "Verbunden" : "Nicht verbunden";

  [textIncoming, textTransfer].forEach((el) => {
    if (el) el.innerText = label;
  });

  [dotIncoming, dotTransfer].forEach((el) => {
    if (!el) return;
    el.classList.remove("online", "offline");
    el.classList.add(isOnline ? "online" : "offline");
  });
}

/* ---------- Helpers ---------- */

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function compactCode(value) {
  return normalizeCode(value).replace(/\s/g, "");
}

function setWarning(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("input-warning");
}

function clearWarning(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("input-warning");
}

function isValidPid(code) {
  return compactCode(code).startsWith("PID");
}

function detectSupplierByBarcode(rawCode) {
  const code = normalizeCode(rawCode);
  const compact = compactCode(rawCode);

  // Weig: Beispiel 1004301966 -> 10-stellig numerisch, startet mit 10
  if (/^10\d{8}$/.test(compact)) {
    return "Weig";
  }

  // Tambrite: Beispiel (00)3640687 1011295504 0
  if (code.includes("(00)") || compact.includes("3640687")) {
    return "Tambrite";
  }

  // CrownBoard Craft: Beispiel 91155012031811 -> 14-stellig numerisch, startet mit 91
  if (/^91\d{12}$/.test(compact)) {
    return "CrownBoard Craft";
  }

  // Regler Systems: Demo-Codes 123456789 bzw. 123
  if (/^123456789$/.test(compact) || /^123$/.test(compact)) {
    return "Regler Systems";
  }

  return null;
}

function getSupplierDataFromBarcode(barcode) {
  const supplier = detectSupplierByBarcode(barcode);
  if (!supplier) return null;
  return supplierTemplates[supplier] || null;
}

/* ---------- Wareneingang ---------- */

function focusIncomingDoc() {
  setTimeout(() => {
    const el = document.getElementById("docBarcode");
    if (el) el.focus();
  }, 180);
}

function focusIncomingPid() {
  setTimeout(() => {
    const el = document.getElementById("pidBarcode");
    if (el) el.focus();
  }, 180);
}

function setIncomingStatus(text) {
  const el = document.getElementById("statusIncoming");
  if (el) el.innerText = text;
}

function handleDocumentScan(code) {
  clearWarning("docBarcode");

  const normalized = compactCode(code);

  if (!normalized) {
    booking.supplierMatched = false;
    setWarning("docBarcode");
    setIncomingStatus("Bitte Dokument Barcode scannen.");
    focusIncomingDoc();
    return;
  }

  const supplierEntry = getSupplierDataFromBarcode(code);

  if (!supplierEntry) {
    booking.supplierMatched = false;
    booking.documentBarcode = normalized;
    booking.supplier = "";

    const supplierField = document.getElementById("supplierField");
    if (supplierField) supplierField.value = "";

    clearIncomingInfoFields();
    resetEditState();

    setWarning("docBarcode");
    setIncomingStatus("Kein Datensatz für diesen Barcode gefunden.");
    focusIncomingDoc();
    return;
  }

  booking.documentBarcode = normalized;
  booking.supplierMatched = true;
  booking.supplier = supplierEntry.supplier || "";
  booking.sheets = supplierEntry.sheets || "";
  booking.laenge = supplierEntry.laenge || "";
  booking.breite = supplierEntry.breite || "";
  booking.nettoGewicht = supplierEntry.nettoGewicht || "";
  booking.bruttoGewicht = supplierEntry.bruttoGewicht || "";
  booking.palettenNummer = supplierEntry.palettenNummer || "";

  fillIncomingFields();
  resetEditState();
  updateEditButtonsState();

  setIncomingStatus(`${booking.supplier} erkannt. PID und Stellplatz erfassen.`);
  focusIncomingPid();
}

function handlePidScan(code) {
  clearWarning("pidBarcode");

  const normalized = compactCode(code);

  if (!normalized) {
    setWarning("pidBarcode");
    setIncomingStatus("Bitte PID scannen.");
    focusIncomingPid();
    return;
  }

  if (!isValidPid(normalized)) {
    setWarning("pidBarcode");
    setIncomingStatus("Kein gültiger PID Code.");
    focusIncomingPid();
    return;
  }

  booking.pidBarcode = normalized;
  const pidField = document.getElementById("pidBarcode");
  if (pidField) pidField.value = normalized;

  setIncomingStatus("PID erfasst. Bitte Stellplatz scannen.");
  const locationField = document.getElementById("incomingLocation");
  if (locationField) locationField.focus();
}

function fillIncomingFields() {
  const supplierField = document.getElementById("supplierField");
  if (supplierField) supplierField.value = booking.supplier;

  incomingFields.forEach((field) => {
    const input = document.getElementById(field);
    if (!input) return;

    input.value = booking[field] || "";
    input.setAttribute("readonly", true);
    clearWarning(field);
  });
}

function updateEditButtonsState() {
  incomingFields.forEach((field) => {
    const input = document.getElementById(field);
    const action = document.getElementById("action-" + field);
    if (!input || !action) return;

    const hasValue = String(input.value || "").trim().length > 0;

    if (!hasValue && !pendingEdits[field]) {
      action.classList.add("field-action-disabled");
      action.disabled = true;
      input.setAttribute("readonly", true);
    } else if (!pendingEdits[field]) {
      action.classList.remove("field-action-disabled");
      action.disabled = false;
      input.setAttribute("readonly", true);
    }
  });
}

function toggleEditAction(field) {
  const input = document.getElementById(field);
  const action = document.getElementById("action-" + field);
  if (!input || !action) return;

  const hasValue = String(input.value || "").trim().length > 0;

  if (!hasValue && !pendingEdits[field]) {
    return;
  }

  if (!pendingEdits[field]) {
    enableEdit(field);
  } else {
    confirmEdit(field);
  }
}

function enableEdit(field) {
  const input = document.getElementById(field);
  const action = document.getElementById("action-" + field);
  if (!input || !action) return;

  const hasValue = String(input.value || "").trim().length > 0;
  if (!hasValue) return;

  input.removeAttribute("readonly");
  pendingEdits[field] = true;
  action.innerText = "✓";
  action.classList.add("action-confirm");
  action.classList.remove("field-action-disabled");
  action.disabled = false;
  clearWarning(field);
  input.focus();
}

function confirmEdit(field) {
  const input = document.getElementById(field);
  const action = document.getElementById("action-" + field);
  if (!input || !action) return;

  const value = input.value.trim();

  if (!value) {
    setWarning(field);
    setIncomingStatus("Bitte die geänderte Eingabe bestätigen.");
    input.focus();
    return;
  }

  booking[field] = value;
  input.value = value;
  input.setAttribute("readonly", true);
  pendingEdits[field] = false;
  action.innerText = "✎";
  action.classList.remove("action-confirm");
  clearWarning(field);
  setIncomingStatus("Änderung bestätigt.");
  updateEditButtonsState();
}

function validateIncomingRequiredFields() {
  let isValid = true;

  const docBarcode = compactCode(document.getElementById("docBarcode")?.value);
  const pidBarcode = compactCode(document.getElementById("pidBarcode")?.value);
  const incomingLocation = String(document.getElementById("incomingLocation")?.value || "").trim();
  const supplierValue = String(document.getElementById("supplierField")?.value || "").trim();

  clearWarning("docBarcode");
  clearWarning("pidBarcode");
  clearWarning("incomingLocation");
  incomingFields.forEach((field) => clearWarning(field));

  if (!booking.supplierMatched || !supplierValue) {
    setWarning("docBarcode");
    setIncomingStatus("Für diesen Barcode liegt kein gültiger Datensatz vor.");
    focusIncomingDoc();
    return false;
  }

  if (!docBarcode) {
    setWarning("docBarcode");
    isValid = false;
  }

  if (!pidBarcode) {
    setWarning("pidBarcode");
    isValid = false;
  } else if (!isValidPid(pidBarcode)) {
    setWarning("pidBarcode");
    setIncomingStatus("Kein gültiger PID Code.");
    focusIncomingPid();
    return false;
  }

  if (!incomingLocation) {
    setWarning("incomingLocation");
    isValid = false;
  }

  for (const field of incomingFields) {
    const value = String(document.getElementById(field)?.value || "").trim();
    if (!value) {
      setWarning(field);
      isValid = false;
    }
  }

  if (!isValid) {
    if (!docBarcode) {
      setIncomingStatus("Bitte zuerst den Dokument Barcode scannen.");
      focusIncomingDoc();
    } else if (!pidBarcode) {
      setIncomingStatus("Bitte den PID Code scannen.");
      focusIncomingPid();
    } else if (!incomingLocation) {
      setIncomingStatus("Bitte den Stellplatz scannen.");
      document.getElementById("incomingLocation")?.focus();
    } else {
      setIncomingStatus("Bitte alle Produktinformationen vollständig befüllen.");
    }
  }

  return isValid;
}

function validatePendingEdits() {
  let hasPendingEdit = false;
  let firstPendingField = null;

  incomingFields.forEach((field) => {
    clearWarning(field);

    if (pendingEdits[field]) {
      hasPendingEdit = true;
      setWarning(field);

      if (!firstPendingField) {
        firstPendingField = field;
      }
    }
  });

  if (hasPendingEdit && firstPendingField) {
    setIncomingStatus("Bitte offene Änderungen mit dem Haken bestätigen.");
    document.getElementById(firstPendingField)?.focus();
  }

  return !hasPendingEdit;
}

function bookIncoming() {
  if (!validateIncomingRequiredFields()) return;
  if (!validatePendingEdits()) return;

  booking.documentBarcode = compactCode(document.getElementById("docBarcode")?.value);
  booking.pidBarcode = compactCode(document.getElementById("pidBarcode")?.value);
  booking.incomingLocation = String(document.getElementById("incomingLocation")?.value || "").trim();
  booking.supplier = document.getElementById("supplierField")?.value.trim() || "";
  booking.sheets = document.getElementById("sheets")?.value.trim() || "";
  booking.laenge = document.getElementById("laenge")?.value.trim() || "";
  booking.breite = document.getElementById("breite")?.value.trim() || "";
  booking.nettoGewicht = document.getElementById("nettoGewicht")?.value.trim() || "";
  booking.bruttoGewicht = document.getElementById("bruttoGewicht")?.value.trim() || "";
  booking.palettenNummer = document.getElementById("palettenNummer")?.value.trim() || "";

  console.log("DEMO WARENEINGANG", booking);
  showSuccessScreen("Buchung erfolgreich");
}

function resetIncomingField(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.value = "";
  clearWarning(id);

  if (id === "docBarcode") {
    booking.documentBarcode = "";
    booking.supplier = "";
    booking.supplierMatched = false;

    const supplierField = document.getElementById("supplierField");
    if (supplierField) supplierField.value = "";

    clearIncomingInfoFields();
    resetEditState();
    setIncomingStatus("Bitte Dokument scannen");
  }

  if (id === "pidBarcode") {
    booking.pidBarcode = "";
    setIncomingStatus("Bitte PID scannen");
  }

  if (id === "incomingLocation") {
    booking.incomingLocation = "";
    setIncomingStatus("Bitte Stellplatz scannen");
  }

  el.focus();
}

function resetIncomingForm() {
  booking = {
    documentBarcode: "",
    pidBarcode: "",
    incomingLocation: "",
    supplier: "",
    sheets: "",
    laenge: "",
    breite: "",
    nettoGewicht: "",
    bruttoGewicht: "",
    palettenNummer: "",
    supplierMatched: false
  };

  const docBarcode = document.getElementById("docBarcode");
  const pidBarcode = document.getElementById("pidBarcode");
  const incomingLocation = document.getElementById("incomingLocation");
  const supplierField = document.getElementById("supplierField");

  if (docBarcode) docBarcode.value = "";
  if (pidBarcode) pidBarcode.value = "";
  if (incomingLocation) incomingLocation.value = "";
  if (supplierField) supplierField.value = "";

  clearIncomingInfoFields();
  resetEditState();
  resetIncomingWarnings();
  setIncomingStatus("Bitte Dokument scannen");
  focusIncomingDoc();
}

function clearIncomingInfoFields() {
  incomingFields.forEach((field) => {
    const input = document.getElementById(field);
    if (!input) return;
    input.value = "";
    input.setAttribute("readonly", true);
    clearWarning(field);
  });

  updateEditButtonsState();
}

function resetEditState() {
  incomingFields.forEach((field) => {
    const input = document.getElementById(field);
    const action = document.getElementById("action-" + field);
    if (!input || !action) return;

    input.setAttribute("readonly", true);
    pendingEdits[field] = false;
    action.innerText = "✎";
    action.classList.remove("action-confirm");
    clearWarning(field);
  });

  updateEditButtonsState();
}

function resetIncomingWarnings() {
  clearWarning("docBarcode");
  clearWarning("pidBarcode");
  clearWarning("incomingLocation");
  incomingFields.forEach((field) => clearWarning(field));
}

/* ---------- Umbuchung ---------- */

function focusTransferPid() {
  setTimeout(() => {
    const el = document.getElementById("transferPidBarcode");
    if (el) el.focus();
  }, 180);
}

function setTransferStatus(text) {
  const el = document.getElementById("statusTransfer");
  if (el) el.innerText = text;
}

function getLocationFromPid(pid) {
  const sum = [...pid].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = sum % transferLocationTemplates.length;
  return transferLocationTemplates[index];
}

function handleTransferPidScan(code) {
  const normalized = compactCode(code);
  clearWarning("transferPidBarcode");

  if (!normalized) {
    setWarning("transferPidBarcode");
    setTransferStatus("Bitte PID scannen.");
    focusTransferPid();
    return;
  }

  if (!isValidPid(normalized)) {
    setWarning("transferPidBarcode");
    setTransferStatus("Kein gültiger PID Code.");
    focusTransferPid();
    return;
  }

  transferBooking.pidBarcode = normalized;
  transferBooking.currentLocation = getLocationFromPid(normalized);

  const pidField = document.getElementById("transferPidBarcode");
  const currentLocation = document.getElementById("currentLocation");

  if (pidField) pidField.value = normalized;
  if (currentLocation) currentLocation.value = transferBooking.currentLocation;

  setTransferStatus("PID erkannt. Neuen Stellplatz erfassen.");
  document.getElementById("newLocation")?.focus();
}

function validateTransferFields() {
  const pid = compactCode(document.getElementById("transferPidBarcode")?.value);
  const newLocation = String(document.getElementById("newLocation")?.value || "").trim();

  clearWarning("transferPidBarcode");
  clearWarning("newLocation");

  if (!pid) {
    setWarning("transferPidBarcode");
    setTransferStatus("Bitte PID scannen.");
    focusTransferPid();
    return false;
  }

  if (!isValidPid(pid)) {
    setWarning("transferPidBarcode");
    setTransferStatus("Kein gültiger PID Code.");
    focusTransferPid();
    return false;
  }

  if (!newLocation) {
    setWarning("newLocation");
    setTransferStatus("Bitte neuen Stellplatz erfassen.");
    document.getElementById("newLocation")?.focus();
    return false;
  }

  return true;
}

function bookTransfer() {
  if (!validateTransferFields()) return;

  transferBooking.pidBarcode = compactCode(document.getElementById("transferPidBarcode")?.value);
  transferBooking.currentLocation = document.getElementById("currentLocation")?.value.trim() || "";
  transferBooking.newLocation = document.getElementById("newLocation")?.value.trim() || "";

  console.log("DEMO UMBUCHUNG", transferBooking);
  showSuccessScreen("Umbuchung erfolgreich");
}

function resetTransferField(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.value = "";
  clearWarning(id);

  if (id === "transferPidBarcode") {
    transferBooking.pidBarcode = "";
    transferBooking.currentLocation = "";
    const currentLocation = document.getElementById("currentLocation");
    if (currentLocation) currentLocation.value = "";
    setTransferStatus("Bitte PID scannen");
  }

  if (id === "newLocation") {
    transferBooking.newLocation = "";
    setTransferStatus("Bitte neuen Stellplatz erfassen.");
  }

  el.focus();
}

function resetTransferForm() {
  transferBooking = {
    pidBarcode: "",
    currentLocation: "",
    newLocation: ""
  };

  const transferPid = document.getElementById("transferPidBarcode");
  const currentLocation = document.getElementById("currentLocation");
  const newLocation = document.getElementById("newLocation");

  if (transferPid) transferPid.value = "";
  if (currentLocation) currentLocation.value = "";
  if (newLocation) newLocation.value = "";

  clearWarning("transferPidBarcode");
  clearWarning("newLocation");
  setTransferStatus("Bitte PID scannen");
}

/* ---------- Global ---------- */

function showSuccessScreen(text) {
  const el = document.getElementById("successText");
  if (el) el.innerText = text;

  showScreen("success");

  if (successTimeout) {
    clearTimeout(successTimeout);
  }

  successTimeout = setTimeout(() => {
    closeSuccessScreen();
  }, 5000);
}

function closeSuccessScreen() {
  if (successTimeout) {
    clearTimeout(successTimeout);
    successTimeout = null;
  }

  if (currentProcess === "wareneingang") {
    showScreen("wareneingang");
    resetIncomingForm();
    return;
  }

  if (currentProcess === "umbuchung") {
    showScreen("umbuchung");
    resetTransferForm();
  }
}