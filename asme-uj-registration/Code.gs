/*
 * ASME UJ registration endpoint for Google Apps Script.
 * Configure SPREADSHEET_ID and SHEET_NAME before deploying.
 *
 * Public endpoint note: anyone with the deployed URL may attempt to submit.
 * Keep the spreadsheet private. Honeypot, timing checks, nonce checks, and
 * server-side validation reduce simple abuse but do not provide full security
 * or reliable identity verification. Review submissions periodically.
 */
const SPREADSHEET_ID = "PASTE_YOUR_GOOGLE_SHEET_ID_HERE";
const SHEET_NAME = "Applications";
const HEADERS = [
  "Timestamp", "Full Name", "Email Address", "Phone Number", "University Major",
  "Team Preference", "Year of Study",
  "Volunteering Experience and Other Student Organizations", "Notes"
];
const ALLOWED_TEAMS = ["Social Media", "Event Team", "Not Sure"];
const ALLOWED_YEARS = ["1st", "2nd", "3rd", "4th", "5th", "Other"];

function doPost(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const nonce = String(params.nonce || "");
  let result;
  try {
    if (!nonce || nonce.length > 120) throw new Error("Invalid submission token.");
    if (String(params.website || "").trim()) throw new Error("Submission rejected.");
    const elapsed = Number(params.elapsedMs || 0);
    // Client timing is a basic deterrent, not a trusted security boundary.
    if (elapsed > 0 && elapsed < 2000) throw new Error("Please review the form and try again.");

    const data = {
      fullName: clean(params.fullName),
      email: clean(params.email),
      phone: clean(params.phone),
      major: clean(params.major),
      team: clean(params.team),
      year: clean(params.year),
      experience: clean(params.experience),
      notes: clean(params.notes)
    };
    if (!data.fullName || !data.email || !data.phone || !data.major || !data.team || !data.year || !data.experience) {
      throw new Error("Please complete all required fields.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error("Please enter a valid email address.");
    if (!/^[+()\d\s.-]{7,25}$/.test(data.phone) || (data.phone.match(/\d/g) || []).length < 7) {
      throw new Error("Please enter a valid phone number.");
    }
    if (ALLOWED_TEAMS.indexOf(data.team) === -1) throw new Error("Invalid team selection.");
    if (ALLOWED_YEARS.indexOf(data.year) === -1) throw new Error("Invalid year selection.");

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const props = PropertiesService.getScriptProperties();
      const key = "nonce_" + digest(nonce);
      if (props.getProperty(key)) throw new Error("This submission has already been received.");
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      let sheet = spreadsheet.getSheetByName(SHEET_NAME);
      if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
      if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
      else {
        const currentHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0];
        if (currentHeaders.join("\u001f") !== HEADERS.join("\u001f")) {
          throw new Error("The configured sheet has unexpected headers. Please check the worksheet.");
        }
      }
      const row = [
        new Date(), safeCell(data.fullName), safeCell(data.email), safeCell(data.phone),
        safeCell(data.major), data.team, data.year, safeCell(data.experience), safeCell(data.notes)
      ];
      sheet.appendRow(row);
      props.setProperty(key, String(Date.now()));
      pruneOldNonces(props);
      result = {type: "ASME_SUBMISSION_RESULT", status: "success", nonce: nonce};
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    // Do not log applicant data. Only a generic status is returned to the form.
    result = {type: "ASME_SUBMISSION_RESULT", status: "error", nonce: nonce,
      message: userSafeMessage(err)};
  }
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><head><meta charset="utf-8"></head><body><script>' +
    'window.parent.postMessage(' + JSON.stringify(result).replace(/</g, '\\u003c') + ', "*");' +
    '</script><p>Submission response received. You may return to the application form.</p></body></html>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doGet() {
  return HtmlService.createHtmlOutput("ASME UJ registration endpoint is active. Submit applications through the website form.");
}

function clean(value) {
  return String(value == null ? "" : value).replace(/\u0000/g, "").trim().slice(0, 10000);
}

// Prefix formula-like text so applicant input is stored as plain text in Sheets.
function safeCell(value) {
  const text = String(value == null ? "" : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function digest(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, "");
}

function pruneOldNonces(props) {
  // Script properties have quotas. Remove expired nonce keys during submissions.
  const all = props.getProperties();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  Object.keys(all).forEach(key => {
    if (key.indexOf("nonce_") === 0 && Number(all[key]) < cutoff) props.deleteProperty(key);
  });
}

function userSafeMessage(err) {
  const message = String(err && err.message || "");
  const known = [
    "Invalid submission token.", "Submission rejected.", "Please review the form and try again.",
    "Please complete all required fields.", "Please enter a valid email address.",
    "Please enter a valid phone number.", "Invalid team selection.", "Invalid year selection.",
    "This submission has already been received.",
    "The configured sheet has unexpected headers. Please check the worksheet."
  ];
  return known.indexOf(message) >= 0 ? message : "The application could not be saved. Please try again later.";
}
