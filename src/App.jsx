import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';

const RESIDENTS = ['יצחק יוסף מלריך','אפרים דנקו','הלפרין זהבה גבריאל','רימון שרה שרי','שולמית נחמוד','אייבי מוסקוביץ','קורדון מרי','אביי פקדו','יהושוע לפיד','טקלה יוורקה','רווית שושן','ישראל רוזנבוים','צח עשת','אהרון בוקובזה','שלום','ימית גולן','נועם עמרם','הפטקה אופיר','גליק אפרים','גרוס ליפא','ילנה זרצקי','וישניאנסקי אנה','סרגיי מסיוטין','אולגה פבלוב','נטליה','אלמקאן גטהון','ללא עברית','עומרי גנבה','ליכטנשטיין יהודה','ריטה אובטרכט','יוסי אוחיון','יפית בהטה אסממאו'];
const STORAGE_KEY = 'apartment_signatures_v4';
const PDF_PATH = '/form.pdf';

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
  const [residentName, setResidentName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [currentResidentId, setCurrentResidentId] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);

  // משטח חתימה עצמאי - כל דייר חותם בריק שלו
  const handleMouseDown = () => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.beginPath();
  };

  const handleMouseUp = () => setIsDrawing(false);

  const handleMouseMove = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleTouchStart = () => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
  };

  const handleTouchEnd = () => setIsDrawing(false);

  const handleTouchMove = (e) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  // שמירת החתימה וניקוי המשטח לדייר הבא
  const handleSignature = () => {
    if (!residentName.trim()) {
      setStatusMessage('בחר שם');
      return;
    }
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = canvas.toDataURL('image/png');

    const newSignatures = { ...signatures };
    newSignatures[currentResidentId] = {
      signature: imageData,
      name: residentName,
      timestamp: new Date().toISOString()
    };
    setSignatures(newSignatures);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSignatures));

    // ** ניקוי מיידי של משטח החתימה לדייר הבא **
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();

    setResidentName('');
    setStatusMessage(`✓ חתימה של ${residentName} נשמרה`);

    // עברור לדייר הבא
    if (currentResidentId < RESIDENTS.length - 1) {
      setCurrentResidentId(currentResidentId + 1);
    }
  };

  // ניקוי משטח חתימה ללא השפעה על משטחים אחרים
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    setStatusMessage('');
  };

  const handleNext = () => {
    if (currentResidentId < RESIDENTS.length - 1) {
      setCurrentResidentId(currentResidentId + 1);
      setResidentName('');
      handleClear();
    }
  };

  // יצירת PDF עם כל החתימות שנאספו
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setStatusMessage('טוען...');
      const response = await fetch(PDF_PATH);
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const page = pages[0];

      let signatureIndex = 0;
      for (const [residentId, signatureData] of Object.entries(signatures)) {
        const { signature, name } = signatureData;
        const signatureImage = await pdfDoc.embedPng(signature);
        const yPos = 750 - (signatureIndex * 25);
        
        page.drawImage(signatureImage, {
          x: 50,
          y: Math.max(yPos, 50),
          width: 80,
          height: 30
        });

        // הוספת שם הדייר ליד החתימה
        page.drawText(name, {
          x: 140,
          y: Math.max(yPos + 10, 60),
          size: 10,
          color: rgb(0, 0, 0)
        });

        signatureIndex++;
      }

      const pdfBytesOutput = await pdfDoc.save();
      const blob = new Blob([pdfBytesOutput], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'form_with_signatures.pdf';
      link.click();
      URL.revokeObjectURL(url);
      setStatusMessage('✓ הורדה בוצעה בהצלחה');
    } catch (error) {
      console.error('PDF generation error:', error);
      setStatusMessage('שגיאה בהורדה: ' + error.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
  }, []);

  return (
    <div style={{
      padding: '20px',
      direction: 'rtl',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1>מערכת חתימות דיגיטלית</h1>
      <h2>רחבת הרב עוזיאל 14-4</h2>
      <div style={{ marginBottom: '20px' }}>
        <span>תושב: </span>
        <span style={{ fontWeight: 'bold' }}>{currentResidentId + 1}: {RESIDENTS[currentResidentId] || ''}</span>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <span>חתימות: {Object.keys(signatures).length} / {RESIDENTS.length}</span>
      </div>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1, paddingRight: '20px' }}>
          <h3>קובץ ה-PDF</h3>
          <iframe
            src={PDF_PATH}
            style={{
              width: '100%',
              height: '600px',
              border: '1px solid #ccc'
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <h3>חתימה</h3>
          <input
            type="text"
            value={residentName}
            onChange={(e) => setResidentName(e.target.value)}
            placeholder="הקלד את שמך המלא"
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
          <canvas
            ref={canvasRef}
            width={300}
            height={150}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            style={{
              border: '2px solid #000',
              display: 'block',
              backgroundColor: '#fff',
              cursor: 'crosshair',
              marginBottom: '10px',
              touchAction: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button onClick={handleSignature} style={{ flex: 1, padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>אישור חתימה</button>
            <button onClick={handleClear} style={{ flex: 1, padding: '10px', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>ניקוי</button>
            <button onClick={handleNext} style={{ flex: 1, padding: '10px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>הבא</button>
          </div>
          {statusMessage && <p style={{ color: statusMessage.includes('שגיאה') ? 'red' : 'green', fontSize: '14px' }}>{statusMessage}</p>}
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          style={{
            padding: '12px 30px',
            fontSize: '16px',
            backgroundColor: isGeneratingPdf ? '#ccc' : '#9C27B0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isGeneratingPdf ? 'not-allowed' : 'pointer'
          }}
        >
          {isGeneratingPdf ? 'מעבד...' : 'הורדת טופס'}
        </button>
      </div>
    </div>
  );
};

export default App;
