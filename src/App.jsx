import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import SignaturePad from 'signature_pad';

const RESIDENTS = ['יצחק יוסף מלריך','אפרים דנקו','הלפרין זהבה גבריאל','רימון שרה שרי(רומן)','שולמית נחמוד','אייבי מוסקוביץ','קורדון מרי','אביי פקדו','יהושוע לפיד','טקלה יוורקה','רווית שושן','ישראל רוזנבוים','צח עשת','אהרון בוקובזה','שלום','ימית גולן','נועם עמרם','הפטקה אופיר','גליק אפרים','גרוס ליפא- אדיר','ילנה זרצקי','וישניאנסקי אנה','סרגיי מסיוטין','אולגה פבלוב','נטליה','אלמקאן- גטהון וצ\'וקולוק אבייה','ללא עברית','עומרי ג\'נבה','ליכטנשטיין יהודה אריה לייב','ריטה אובטרכט','יוסי אוחיון (שני)','יפית-בהטה אסממאו'];
const STORAGE_KEY = 'apartment_signatures_v2';

const App = () => {
  const canvasRef = useRef(null);
  const [signatures, setSignatures] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [currentResidentId, setCurrentResidentId] = useState(0);
  const signaturePadRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = 200;
      signaturePadRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
      });
    }
  }, [currentResidentId]);

  const handleSignature = () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      setStatusMessage('בעיה: לא חתמת');
      return;
    }
    const dataUrl = signaturePadRef.current.toDataURL('image/png');
    const updated = { ...signatures, [currentResidentId]: dataUrl };
    setSignatures(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setStatusMessage('✓ חתימה נשמרה!');
    signaturePadRef.current.clear();
    setTimeout(() => setStatusMessage(''), 2000);
  };

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  const handleNext = () => {
    setCurrentResidentId((currentResidentId + 1) % RESIDENTS.length);
  };

  const handleDownloadCombinedPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      let page = pdfDoc.addPage([595, 842]);
      const { height } = page.getSize();
      let y = height - 50;

      page.drawText('רחבת הרב עוזיאל 14-4 - דוח חתימות תושבים', { x: 50, y, size: 18, font, color: rgb(0, 0, 0) });
      y -= 40;
      page.drawText(`תאריך: ${new Date().toLocaleDateString('he-IL')}`, { x: 50, y, size: 12, font });
      y -= 30;
      page.drawText('___________________________________________________________________________', { x: 50, y, size: 10, font });
      y -= 30;

      RESIDENTS.forEach((name, idx) => {
        if (y < 60) {
          page = pdfDoc.addPage([595, 842]);
          y = 792;
        }
        const status = signatures[idx] ? '✓' : '—';
        page.drawText(`${idx + 1}. ${name} ${status}`, { x: 50, y, size: 11, font });
        y -= 18;
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signatures_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage('✓ הקובץ הורד בהצלחה!');
    } catch (err) {
      console.error(err);
      setStatusMessage(`שגיאה: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  
    <div style={{ padding: '20px', fontFamily: 'Arial', textAlign: 'right', maxWidth: '800px', margin: '0 auto' }}>
      <h1>מערכת חתימות דיגיטלית</h1>
      <h2>רחבת הרב עוזיאל 14-4</h2>
      <p>תושב {currentResidentId + 1}: {RESIDENTS[currentResidentId]}</p>
      <p style={{ marginBottom: '10px', fontSize: '14px' }}>חתימות: {Object.keys(signatures).length} / {RESIDENTS.length}</p>

      <canvas
        ref={canvasRef}
        style={{
          border: '2px solid #000',
          display: 'block',
          width: '100%',
          maxWidth: '600px',
          margin: '20px auto',
          backgroundColor: '#fff',
          cursor: 'crosshair'
        }}
      />

      <div style={{ margin: '20px 0', textAlign: 'center' }}>
        <button
          onClick={handleSignature}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px',
            marginLeft: '10px'
          }}
        >
          ✓ אישור חתימה
        </button>
        <button
          onClick={handleClear}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px',
            marginLeft: '10px'
          }}
        >
          🔄 ניקוי
        </button>
        <button
          onClick={handleNext}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '4px',
            marginLeft: '10px'
          }}
        >
          ▶ הבא
        </button>
      </div>

      <div style={{ margin: '20px 0', textAlign: 'center' }}>
        <button
          onClick={handleDownloadCombinedPdf}
          disabled={isGeneratingPdf}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#9C27B0',
            color: 'white',
            border: 'none',
            cursor: isGeneratingPdf ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            opacity: isGeneratingPdf ? 0.6 : 1
          }}
        >
          {isGeneratingPdf ? '...מכין' : '📥 הורדת PDF'}
        </button>
      </div>

      {statusMessage && (
        <div style={{
          marginTop: '20px',
          color: statusMessage.includes('✓') ? 'green' : 'red',
          fontSize: '16px',
          textAlign: 'center'
        }}>
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default App;
