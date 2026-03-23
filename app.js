let booking = {
  supplier: "",
  documentBarcode: "",
  pidBarcode: "",
  zeitstempel: "",
  hoehe: "",
  laenge: "",
  breite: "",
  gewicht: ""
};

const supplierDemoData = {
  "Regler Systems": {
    hoehe: "1200",
    laenge: "800",
    breite: "600",
    gewicht: "450"
  },
  "Weig": {
    hoehe: "1350",
    laenge: "900",
    breite: "650",
    gewicht: "520"
  },
  "Tambrite": {
    hoehe: "980",
    laenge: "720",
    breite: "540",
    gewicht: "385"
  },
  "CrownBoard": {
    hoehe: "1450",
    laenge: "1000",
    breite: "700",
    gewicht: "610"
  }
};

const editableFields = ["hoehe", "laenge", "breite", "gewicht"];
const pendingEdits = {
  hoehe: false,
  laenge: false,
  breite: false,
  gewicht: false
};

let successTimeout = null;
let lastSelectedSupplier = "";

function showScreen(screen) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById("screen-" + screen).classList.add("active");
}

function goBackToStart() {
  resetBooking();
  booking.supplier = "";
  lastSelectedSupplier = "";
  showScreen("start");
}

function goBackToSupplier() {
  resetBooking();
  showScreen("supplier");
}

function selectSupplier(name) {
  booking.supplier = name;
  lastSelectedSupplier = name;

  showScreen("scan");
  resetWarnings();
  resetEditableState();
  clearAllFields();
  updateSupplierBadge();
  setStatus("Bitte Dokument scannen");
  focusDoc();
}

function updateSupplierBadge() {
  document.getElementById("supplierBadge").innerText = booking.supplier || "";
}

function focusDoc() {
  setTimeout(() => {
    document.getElementById("docBarcode").focus();
  }, 180);
}

function focusPid() {
  setTimeout(() => {
    document.getElementById("pidBarcode").focus();
  }, 180);
}

function handleDocumentScan(code) {
  code = code.trim();
  clearWarning("docBarcode");

  if (!code) {
    setWarning("docBarcode");
    setStatus("Bitte Dokument Barcode scannen.");
    focusDoc();
    return;
  }

  booking.documentBarcode = code;
  booking.zeitstempel = getCurrentTimestamp();

  const supplierValues = supplierDemoData[booking.supplier] || {
    hoehe: "1000",
    laenge: "700",
    breite: "500",
    gewicht: "400"
  };

  booking.hoehe = supplierValues.hoehe;
  booking.laenge = supplierValues.laenge;
  booking.breite = supplierValues.breite;
  booking.gewicht = supplierValues.gewicht;

  fillFields();
  resetEditableState();
  setStatus("Dokument erkannt. PID scannen.");
  focusPid();
}

function handlePidScan(code) {
  code = code.trim();
  clearWarning("pidBarcode");

  if (!code) {
    setWarning("pidBarcode");
    setStatus("Bitte PID scannen.");
    focusPid();
    return;
  }

  if (!isValidPid(code)) {
    setWarning("pidBarcode");
    setStatus("Kein gültiger PID Code.");
    focusPid();
    return;
  }

  booking.pidBarcode = code;
  setStatus("PID erfasst.");
}

function isValidPid(code) {
  return code.toUpperCase().startsWith("PID");
}

function fillFields() {
  document.getElementById("zeitstempel").value = booking.zeitstempel;
  document.getElementById("hoehe").value = booking.hoehe;
  document.getElementById("laenge").value = booking.laenge;
  document.getElementById("breite").value = booking.breite;
  document.getElementById("gewicht").value = booking.gewicht;

  editableFields.forEach((field) => {
    document.getElementById(field).setAttribute("readonly", true);
    clearWarning(field);
  });
}

function toggleEditAction(field) {
  if (!pendingEdits[field]) {
    enableEdit(field);
  } else {
    confirmEdit(field);
  }
}

function enableEdit(field) {
  const input = document.getElementById(field);
  const action = document.getElementById("action-" + field);

  input.removeAttribute("readonly");
  pendingEdits[field] = true;
  action.innerText = "✓";
  action.classList.add("action-confirm");
  clearWarning(field);
  input.focus();
}

function confirmEdit(field) {
  const input = document.getElementById(field);
  const action = document.getElementById("action-" + field);
  const value = input.value.trim();

  if (!value) {
    setWarning(field);
    setStatus("Bitte die geänderte Eingabe bestätigen.");
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
  setStatus("Änderung bestätigt.");
}

function resetField(id) {
  const el = document.getElementById(id);
  el.value = "";
  clearWarning(id);

  if (id === "docBarcode") {
    booking.documentBarcode = "";
    booking.zeitstempel = "";
    document.getElementById("zeitstempel").value = "";
    clearDimensionFields();
    resetEditableState();
    setStatus("Bitte Dokument scannen");
  }

  if (id === "pidBarcode") {
    booking.pidBarcode = "";
    setStatus("Bitte PID scannen");
  }

  el.focus();
}

function setStatus(text) {
  document.getElementById("status").innerText = text;
}

function setWarning(id) {
  document.getElementById(id).classList.add("input-warning");
}

function clearWarning(id) {
  document.getElementById(id).classList.remove("input-warning");
}

function resetWarnings() {
  clearWarning("docBarcode");
  clearWarning("pidBarcode");
  editableFields.forEach((field) => clearWarning(field));
}

function validateRequiredFields() {
  let isValid = true;

  const docBarcode = document.getElementById("docBarcode").value.trim();
  const pidBarcode = document.getElementById("pidBarcode").value.trim();

  clearWarning("docBarcode");
  clearWarning("pidBarcode");

  if (!docBarcode) {
    setWarning("docBarcode");
    isValid = false;
  }

  if (!pidBarcode) {
    setWarning("pidBarcode");
    isValid = false;
  } else if (!isValidPid(pidBarcode)) {
    setWarning("pidBarcode");
    setStatus("Kein gültiger PID Code.");
    focusPid();
    return false;
  }

  if (!isValid) {
    if (!docBarcode) {
      setStatus("Bitte zuerst den Dokument Barcode scannen.");
      focusDoc();
    } else {
      setStatus("Bitte den PID Code scannen.");
      focusPid();
    }
  }

  return isValid;
}

function validatePendingEdits() {
  let hasPendingEdit = false;
  let firstPendingField = null;

  editableFields.forEach((field) => {
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
    setStatus("Bitte offene Änderungen mit dem Haken bestätigen.");
    document.getElementById(firstPendingField).focus();
  }

  return !hasPendingEdit;
}

function book() {
  if (!validateRequiredFields()) {
    return;
  }

  if (!validatePendingEdits()) {
    return;
  }

  booking.documentBarcode = document.getElementById("docBarcode").value.trim();
  booking.pidBarcode = document.getElementById("pidBarcode").value.trim();
  booking.zeitstempel = document.getElementById("zeitstempel").value.trim();
  booking.hoehe = document.getElementById("hoehe").value.trim();
  booking.laenge = document.getElementById("laenge").value.trim();
  booking.breite = document.getElementById("breite").value.trim();
  booking.gewicht = document.getElementById("gewicht").value.trim();

  console.log("DEMO BUCHUNG", booking);
  showSuccessScreen();
}

function showSuccessScreen() {
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

  if (lastSelectedSupplier) {
    booking.supplier = lastSelectedSupplier;
    showScreen("scan");
    resetBooking();
    booking.supplier = lastSelectedSupplier;
    updateSupplierBadge();
    setStatus("Bitte Dokument scannen");
    focusDoc();
  } else {
    showScreen("supplier");
  }
}

function resetEditableState() {
  editableFields.forEach((field) => {
    const input = document.getElementById(field);
    const action = document.getElementById("action-" + field);

    input.setAttribute("readonly", true);
    pendingEdits[field] = false;
    action.innerText = "✎";
    action.classList.remove("action-confirm");
    clearWarning(field);
  });
}

function clearDimensionFields() {
  editableFields.forEach((field) => {
    document.getElementById(field).value = "";
    booking[field] = "";
    clearWarning(field);
  });
}

function clearAllFields() {
  document.getElementById("docBarcode").value = "";
  document.getElementById("pidBarcode").value = "";
  document.getElementById("zeitstempel").value = "";
  clearDimensionFields();
}

function resetBooking() {
  booking.documentBarcode = "";
  booking.pidBarcode = "";
  booking.zeitstempel = "";
  booking.hoehe = "";
  booking.laenge = "";
  booking.breite = "";
  booking.gewicht = "";

  document.getElementById("docBarcode").value = "";
  document.getElementById("pidBarcode").value = "";
  document.getElementById("zeitstempel").value = "";

  clearWarning("docBarcode");
  clearWarning("pidBarcode");

  clearDimensionFields();
  resetEditableState();
}

function getCurrentTimestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}