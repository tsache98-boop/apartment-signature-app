import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ====== קבועים ======

const RESIDENTS = [
  "יצחק יוסף מלריך",
  "אפרים דנקו",
  "הלפרין זהבה גבריאל",
  "רימון שרה שרי(רומן)",
  "שולמית נחמוד",
  "אייבי מוסקוביץ",
  "קורדון מרי",
  "אביי פקדו",
  "יהושוע לפיד",
  "טקלה יוורקה",
  "רווית שושן",
  "ישראל רוזנבוים",
  "צח עשת",
  "אהרון בוקובזה",
  "שלום",
  "ימית גולן",
  "נועם עמרם",
  "הפטקה אופיר",
  "גליק אפרים",
  "גרוס ליפא- אדיר",
  "ילנה זרצקי",
  "וישניאנסקי אנה",
  "סרגיי מסיוטין",
  "אולגה פבלוב",
  "נטליה",
  "אלמקאן- גטהון וצ'וקולוק אבייה",
  "ללא עברית",
  "עומרי ג'נבה",
  "ליכטנשטיין יהודה אריה לייב",
  "ריטה אובטרכט",
  "יוסי אוחיון (שני)",
  "יפית-בהטה אסממאו",
];

const STORAGE_KEY = "apartment_signatures_v2";
const FORM_PDF_PATH = `${import.meta.env.BASE_URL || "/"}form.pdf`; // שים את הקובץ בתיקיית public בשם הזה

// ====== עזר ======

function getTodayISO() {
  return new Date().toISOString();
}

function formatHebDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function loadSignaturesFromStorage() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSignaturesToStorage(data) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // מתעלמים משגיאה בלוקאל סטורג'
  }
}

async function dataUrlToUint8Array(dataUrl) {
  const res = await fetch(dataUrl);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

function createTrimmedCanvas(canvas) {
  const { width, height } = canvas;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  let top = null;
  let left = null;
  let right = null;
  let bottom = null;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] !== 0) {
        if (top === null) top = y;
        if (left === null || x < left) left = x;
        if (right === null || x > right) right = x;
        bottom = y;
      }
    }
  }

  if (top === null || left === null || right === null || bottom === null) {
    const emptyCanvas = document.createElement("canvas");
    emptyCanvas.width = width;
    emptyCanvas.height = height;
    return emptyCanvas;
  }

  const trimmed = document.createElement("canvas");
  const trimWidth = right - left + 1;
  const trimHeight = bottom - top + 1;
  trimmed.width = trimWidth;
  trimmed.height = trimHeight;
  const trimmedCtx = trimmed.getContext("2d");
  const trimmedData = ctx.getImageData(left, top, trimWidth, trimHeight);
  trimmedCtx.putImageData(trimmedData, 0, 0);
  return trimmed;
}

const SignaturePad = forwardRef(function SignaturePad(
  { penColor = "black", canvasProps = {} },
  ref
) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const setupContext = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = penColor;
  };

  useEffect(() => {
    setupContext();
  }, [penColor]);

  const getPointFromEvent = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const isTouch = event.touches && event.touches.length > 0;
    const clientX = isTouch ? event.touches[0].clientX : event.clientX;
    const clientY = isTouch ? event.touches[0].clientY : event.clientY;

    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    const point = getPointFromEvent(event);
    const canvas = canvasRef.current;
    if (!canvas || !point) return;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    drawing.current = true;
  };

  const draw = (event) => {
    if (!drawing.current) return;
    event.preventDefault();
    const point = getPointFromEvent(event);
    const canvas = canvasRef.current;
    if (!canvas || !point) return;
    const ctx = canvas.getContext("2d");
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (event) => {
    if (event) {
      event.preventDefault();
    }
    drawing.current = false;
  };

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    },
    isEmpty: () => !hasSignature,
    fromDataURL: (dataUrl) => {
      const canvas = canvasRef.current;
      if (!canvas || !dataUrl) return;
      const image = new Image();
      image.onload = () => {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        setHasSignature(true);
      };
      image.src = dataUrl;
    },
    getTrimmedCanvas: () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        const fallback = document.createElement("canvas");
        fallback.width = 1;
        fallback.height = 1;
        return fallback;
      }
      return createTrimmedCanvas(canvas);
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      onTouchCancel={stopDrawing}
      {...canvasProps}
    />
  );
});

// ====== קומפוננטה ראשית ======

export default function App() {
  // מצב אפליקציה כללי
  const [residentId, setResidentId] = useState(null); // 1..32 או null אם מצב מנהל
  const [baseUrl, setBaseUrl] = useState("");
  const [signatures, setSignatures] = useState(() => loadSignaturesFromStorage());
  const [statusMessage, setStatusMessage] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // מצב תצוגה לדייר
  const sigPadRef = useRef(null);
  const [fullName, setFullName] = useState("");
  const [dateISO, setDateISO] = useState(getTodayISO());

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get("id");
      const parsedId = parseInt(idParam, 10);
      if (!isNaN(parsedId) && parsedId >= 1 && parsedId <= RESIDENTS.length) {
        setResidentId(parsedId);
      } else {
        setResidentId(null); // מצב מנהל
      }

      setBaseUrl(window.location.origin);
    }
  }, []);

  // כשמשתנה residentId / signatures – טוענים נתונים לדייר
  useEffect(() => {
    if (!residentId) return;

    const index = residentId - 1;
    const nameFromList = RESIDENTS[index] || "";
    setFullName(nameFromList);

    const stored = signatures[String(residentId)];
    if (stored) {
      setDateISO(stored.dateISO || getTodayISO());

      // טעינת חתימה קיימת אם יש
      if (stored.signatureDataUrl && sigPadRef.current) {
        try {
          sigPadRef.current.fromDataURL(stored.signatureDataUrl);
        } catch {
          // אם נכשל לא קריטי
        }
      } else if (sigPadRef.current) {
        sigPadRef.current.clear();
      }
    } else {
      setDateISO(getTodayISO());
      if (sigPadRef.current) {
        sigPadRef.current.clear();
      }
    }
  }, [residentId, signatures]);

  // שמירת חתימה של דייר
  const handleSaveResidentSignature = () => {
    if (!residentId) return;

    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      setStatusMessage("נא לצייר חתימה לפני שמירה.");
      return;
    }

    const trimmedCanvas = sigPadRef.current.getTrimmedCanvas();
    const signatureDataUrl = trimmedCanvas.toDataURL("image/png");

    const updated = {
      ...signatures,
      [String(residentId)]: {
        fullName: fullName || RESIDENTS[residentId - 1] || "",
        dateISO: dateISO || getTodayISO(),
        signatureDataUrl,
      },
    };

    setSignatures(updated);
    saveSignaturesToStorage(updated);
    setStatusMessage("החתימה נשמרה במערכת. תודה!");
  };

  // ניקוי חתימה לדייר
  const handleClearSignature = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
    }
  };

  // הורדת PDF מאוחד למנהל
  const handleDownloadCombinedPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setStatusMessage("יוצר מסמך מאוחד...");

      // 1. טוען את ה-PDF הבסיסי
      const formBytes = await fetch(FORM_PDF_PATH).then((res) =>
        res.arrayBuffer()
      );
      const pdfDoc = await PDFDocument.load(formBytes);

      // 2. מכין גופן
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // 3. אוסף כל הדיירים עם חתימה
      const signedEntries = Object.entries(signatures).filter(
        ([, v]) => v && v.signatureDataUrl
      );

      if (signedEntries.length === 0) {
        setStatusMessage("אין חתימות שמורות במערכת להוספה למסמך.");
        setIsGeneratingPdf(false);
        return;
      }

      // 4. מוסיף דפים עם סיכום חתימות
      let currentPage = pdfDoc.addPage();
      let { width, height } = currentPage.getSize();
      let y = height - 80;

      currentPage.drawText("סיכום חתימות דיירים", {
        x: 60,
        y,
        size: 16,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 40;

      for (let i = 0; i < signedEntries.length; i++) {
        const [idStr, data] = signedEntries[i];
        const idNum = parseInt(idStr, 10);
        const label = `מס' ${idNum} – ${data.fullName || ""}`;
        const dateStr = `תאריך חתימה: ${formatHebDate(data.dateISO)}`;

        if (y < 140) {
          currentPage = pdfDoc.addPage();
          const size = currentPage.getSize();
          width = size.width;
          height = size.height;
          y = height - 80;

          currentPage.drawText("המשך סיכום חתימות דיירים", {
            x: 60,
            y,
            size: 14,
            font,
            color: rgb(0, 0, 0),
          });
          y -= 30;
        }

        currentPage.drawText(label, {
          x: 60,
          y,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
        y -= 18;

        currentPage.drawText(dateStr, {
          x: 60,
          y,
          size: 10,
          font,
          color: rgb(0, 0, 0),
        });
        y -= 18;

        // החתימה עצמה
        if (data.signatureDataUrl) {
          const sigBytes = await dataUrlToUint8Array(data.signatureDataUrl);
          const sigImage = await pdfDoc.embedPng(sigBytes);
          const sigDims = sigImage.scale(1);
          const targetWidth = 160;
          const scale = targetWidth / sigDims.width;
          const drawWidth = sigDims.width * scale;
          const drawHeight = sigDims.height * scale;

          currentPage.drawImage(sigImage, {
            x: 60,
            y: y - drawHeight,
            width: drawWidth,
            height: drawHeight,
          });

          y -= drawHeight + 30;
        } else {
          y -= 30;
        }
      }

      // 5. שמירה והורדה
      const finalBytes = await pdfDoc.save();
      const blob = new Blob([finalBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "signed_building_form.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatusMessage("המסמך המאוחד נוצר והורד בהצלחה.");
    } catch (err) {
      console.error(err);
      setStatusMessage("אירעה שגיאה ביצירת המסמך המאוחד. בדוק את הקונסול.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // ====== UI ======

  const isManagerMode = residentId === null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex justify-center px-3 py-6">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        {/* כותרת */}
        <header className="bg-white rounded-2xl shadow-sm px-4 py-3 md:px-6 md:py-4 flex flex-col gap-1">
          <h1 className="text-xl md:text-2xl font-semibold text-slate-800">
            מערכת חתימות דיגיטלית – רחבת הרב עוזיאל 4–14
          </h1>
          <p className="text-sm text-slate-600">
            טופס קבוע + חתימות דיירים.{" "}
            {isManagerMode ? "מצב מנהל" : "מצב דייר – חתימה אישית על הטופס."}
          </p>
        </header>

        {/* אזור ראשי */}
        <main className="flex flex-col md:flex-row gap-6">
          {/* צד שמאל: PDF + חתימה/תצוגה */}
          <section className="flex-1 bg-white rounded-2xl shadow-sm p-4 md:p-5 flex flex-col gap-4">
            <h2 className="text-lg font-medium text-slate-800 mb-1">
              הצגת הטופס (PDF)
            </h2>
                      {/* הצגה מוטמעת של PDF */}
                      <div className="w-full rounded-xl overflow-hidden border-2 border-teal-400 shadow-md bg-gray-50 mb-3">
                                                                                                  <embed
            src="/form.pdf"
            type="application/pdf"
            className="w-full h-[350px] sm:h-[450px] md:h-[550px]"
          />
        </div>
            <p className="text-xs text-slate-500 mb-2">
              לצפייה מלאה במסמך לחץ על הקישור. החתימות יתווספו למסמך מאוחד
              שתוריד כמנהל.
            </p>
            <a
              href={FORM_PDF_PATH}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition"
            >
              פתיחת הטופס בחלון חדש
            </a>

            {!isManagerMode && (
              <div className="mt-4 border-t pt-4">
                <h3 className="text-md font-medium text-slate-800 mb-2">
                  פרטי דייר וחתימה
                </h3>

                <div className="space-y-3 text-right">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      שם מלא (לפי רשימת הדיירים)
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      readOnly
                      className="w-full rounded-xl border border-2 border-blue-500 bg-slate-50 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      תאריך חתימה (אוטומטי)
                    </label>
                    <input
                      type="text"
                      value={formatHebDate(dateISO)}
                      readOnly
                      className="w-full rounded-xl border border-2 border-blue-500 bg-slate-50 px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs text-slate-500 mb-2">
                      חתימה (מתאים לנייד – אפשר עם אצבע)
                    </label>
                    <div className="border border-2 border-blue-500 rounded-2xl bg-slate-50 p-2">
                      <SignaturePad
                        ref={sigPadRef}
                        penColor="black"
                        canvasProps={{
                          width: 350,
                          height: 120,
                          className:
                            "w-full h-44 md:h-48 rounded-2xl bg-white touch-none",
                        }}
                      />
                    </div>
                    <div className="flex gap-2 mt-2 justify-end">
                      <button
                        type="button"
                        onClick={handleClearSignature}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                      >
                        ניקוי חתימה
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveResidentSignature}
                        className="px-4 py-1.5 rounded-xl text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600"
                      >
                        שמירת חתימה
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* צד ימין: ניהול / סטטוס */}
          <section className="w-full md:w-80 bg-white rounded-2xl shadow-sm p-4 md:p-5 flex flex-col gap-4">
            {isManagerMode ? (
              <>
                <h2 className="text-lg font-medium text-slate-800">
                  לוח בקרה – מנהל
                </h2>
                <p className="text-xs text-slate-500">
                  כאן אתה רואה את מצב החתימות לכל 32 הדיירים, יוצר קישורים
                  אישיים ומוריד מסמך PDF מאוחד.
                </p>

                <div className="mt-1 text-sm">
                  חתמו:{" "}
                  {
                    Object.values(signatures).filter(
                      (v) => v && v.signatureDataUrl
                    ).length
                  }{" "}
                  / {RESIDENTS.length}
                </div>

                <div className="mt-3 border rounded-2xl  max-h-80 overflow-auto text-sm">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-2">#</th>
                        <th className="px-2 py-2">שם</th>
                        <th className="px-2 py-2">סטטוס</th>
                        <th className="px-2 py-2">קישור</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RESIDENTS.map((name, idx) => {
                        const id = idx + 1;
                        const hasSignature =
                          signatures[String(id)] &&
                          signatures[String(id)].signatureDataUrl;
                        const link = baseUrl
                          ? `${baseUrl}/?id=${id}`
                          : `?id=${id}`;
                        return (
                          <tr
                            key={id}
                            className="border-t border-slate-100 hover:bg-slate-50"
                          >
                            <td className="px-2 py-1">{id}</td>
                            <td className="px-2 py-1 truncate max-w-[120px]">
                              {name}
                            </td>
                            <td className="px-2 py-1 text-center">
                              {hasSignature ? "✅" : "—"}
                            </td>
                            <td className="px-2 py-1 text-center">
                              <button
                                type="button"
                                className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200"
                                onClick={() => {
                                  if (navigator.clipboard) {
                                    navigator.clipboard.writeText(link);
                                    setStatusMessage(
                                      `קישור לדייר ${id} הועתק ללוח.`
                                    );
                                  } else {
                                    setStatusMessage(
                                      `קישור לדייר ${id}: ${link}`
                                    );
                                  }
                                }}
                              >
                                העתק
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadCombinedPdf}
                  disabled={isGeneratingPdf}
                  className="mt-2 w-full px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
                >
                  {isGeneratingPdf
                    ? "מייצר PDF מאוחד..."
                    : "הורדת PDF מאוחד עם חתימות"}
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-medium text-slate-800">
                  מידע לדייר
                </h2>
                <p className="text-xs text-slate-500">
                  נכנסת לקישור אישי שנשלח אליך. אנא קרא את המסמך, ודא שהשם
                  והתאריך תקינים, וחתום במקום המיועד.
                </p>
                <div className="mt-2 text-sm">
                  מספר מזהה: <strong>{residentId}</strong>
                  <br />
                  שם לפי הרשימה:{" "}
                  <strong>{RESIDENTS[residentId - 1] || ""}</strong>
                </div>
              </>
            )}

            {statusMessage && (
              <div className="mt-3 text-xs text-slate-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                {statusMessage}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
