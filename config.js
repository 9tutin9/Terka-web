// config.js — vyplňte a nahrajte na web
window.PAYCFG = {
  // === Platba (QR / SPD) ===
  IBAN: "CZ77 2010 0000 0027 0153 7846", // <-- Vložte svůj IBAN (může být s mezerami)
  CZ_ACCOUNT: "2701537846/2010", // <-- České číslo účtu pro transparentní účet
  RECIPIENT: "Pomůžu jak můžu, z.s.",
  BIC: "FIOBCZPP",                 // BIC/SWIFT kód pro Fio banku
  CURRENCY: "CZK",

  // === Admin kontakt ===
  ADMIN_EMAIL: "stevenuserusrex@gmail.com",

  // === EmailJS (volitelné) ===
  // 1) Na https://www.emailjs.com/ si založte účet
  // 2) Vytvořte Service -> SERVICE_ID
  // 3) Vytvořte šablony: customer_template, admin_template (nebo vlastní ID)
  // 4) Vyplňte PUBLIC KEY (dříve user ID)
  EMAILJS_PUBLIC_KEY: "72MwQ4Rrd3qT1kzT2",
  EMAILJS_SERVICE_ID: "service_1tb0v4g",
  EMAILJS_TEMPLATE_CUSTOMER: "template_8g3hjfu",
  EMAILJS_TEMPLATE_ADMIN: "template_b2i0ubi",

  // === Ukládání objednávek do Google Sheets (Apps Script WebApp) ===
  // Postup:
  //  - nasadit Apps Script jako Web App (Execute as: Me, Who has access: Anyone)
  //  - doplnit URL do SHEET_WEBHOOK
  //  - nastavit shodný tajný token v Apps Scriptu i zde
  SHEET_WEBHOOK: "https://script.google.com/macros/s/AKfycbz4m5gnaoh9sXSinblde7CzVwOjOPIDUHtfInA_YJaZwYSyG49_qHSNUnSNUSJ6j4d0ww/exec", // 
  SHEET_TOKEN:   "o.wI_ud8[QzL8z"  // dlouhý náhodný řetězec (stejný jako v Apps Scriptu)
};