import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const RESIDENTS = ['יצחק יוסף מלריך', 'אפרים דנקו', 'הלפרין זהבה גבריאל', 'רימון שרה שרי', 'שולמית נחמוד', 'אייבי מוסקוביץ', 'קורדון מרי', 'אביי פקדו', 'יהושוע לפיד', 'טקלה יוורקה', 'רווית שושן', 'ישראל רוזנבוים', 'צח עשת', 'אהרון בוקובזה', 'שלום', 'ימית גולן', 'נועם עמרם', 'הפטקה אופיר', 'גליק אפרים', 'גרוס ליפא', 'ילנה זרצקי', 'וישניאנסקי אנה', 'סרגיי מסיוטין', 'אולגה פבלוב', 'נטליה', 'אלמקאן גטהון', 'ללא עברית', 'עומרי גנבה', 'ליכטנשטיין יהודה', 'ריטה אובטרכט', 'יוסי אוחיון', 'יפית בהטה אסממאו'];
const STORAGE_KEY = 'apartment_signatures_v2';
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

  const handleMouseDown = () => setIsDrawing(true);
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

  const handleSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasSignature = imageData.data.some((val, i) => i % 4 !== 3 && val !== 255);
    
    if (!hasSignature) {
      setStatusMessage('בעיה: לא חתמת');
      return;
    }
    if (!residentName.trim()) {
      setStatusMessage('בעיה: אנא הקלד את שמך');
      return;
    }
    
    const dataUrl = canvas.toDataURL('image/png');
    const updated = { ...signatures, [currentResidentId]: { signature: dataUrl, name: residentName } };
    setSignatures(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setStatusMessage('חתימה נשמרה בהצלחה!');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    setResidentName('');
    
    setTimeout(() => setStatusMessage(''), 2000);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
  };

  const handleNext = () => {
    setCurrentResidentId((currentResidentId + 1) % RESIDENTS.length);
    handleClear();
    setResidentName('');
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const response = await fetch(PDF_PATH);
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      let currentPageIndex = 0;
      let currentY = 750;
      
      for (let i = 0; i < RESIDENTS.length; i++) {
        if (currentPageIndex >= pages.length) break;
        const page = pages[currentPageIndex];
        const sigData = signatures[i];
        
        if (currentY < 100) {
          currentPageIndex++;
          currentY = 750;
          if (currentPageIndex >= pages.length) break;
        }
        
        page.drawText(`${i + 1}. ${RESIDENTS[i]}`, { x: 50, y: currentY, size: 12, font });
        
        if (sigData && sigData.signature) {
          try {
            const sig = sigData.signature.split(',')[1];
            const sigImage = await pdfDoc.embedPng(Buffer.from(sig, 'base64'));
            page.drawImage(sigImage, { x: 300, y: currentY - 30, width: 100, height: 40 });
          } catch (e) {
            console.error('Error embedding signature:', e);
          }
        }
        
        currentY -= 40;
      }
      
      const updatedPdfBytes = await pdfDoc.save();
      const blob = new Blob([updatedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signatures_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage('PDF הורד בהצלחה!');
    } catch (err) {
      console.error(err);
      setStatusMessage(`שגיאה: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', textAlign: 'right', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>מערכת חתימות דיגיטלית</h1>
      <h2>רחבת הרב עוזיאל 14-4</h2>
      <p>תושב {currentResidentId + 1}: {RESIDENTS[currentResidentId]}</p>
      <p style={{ marginBottom: '10px', fontSize: '14px' }}>חתימות: {Object.keys(signatures).length} / {RESIDENTS.length}</p>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ flex: 1, border: '1px solid #ccc', padding: '10px', backgroundColor: '#f9f9f9', maxHeight: '600px', overflowY: 'auto' }}>
          <h3>קובץ ה-PDF</h3>
          <iframe src={PDF_PATH} style={{ width: '100%', height: '500px', border: 'none' }} />
        </div>

        <div style={{ flex: 1 }}>
          <h3>חתימה</h3>
          <input
            type="text"
            value={residentName}
            onChange={(e) => setResidentName(e.target.value)}
            placeholder="הקלד את שמך המלא"
            style={{ width: '100%', padding: '8px', marginBottom: '10px', fontSize: '14px', boxSizing: 'border-box' }}
          />
          
          <canvas
            ref={canvasRef}
            width={300}
            height={150}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            style={{
              border: '2px solid #000',
              display: 'block',
              backgroundColor: '#fff',
              cursor: 'crosshair',
              marginBottom: '10px'
            }}
          />

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button onClick={handleSignature} style={{ flex: 1, padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>אישור חתימה</button>
            <button onClick={handleClear} style={{ flex: 1, padding: '10px', backgroundColor: '#FF9800', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>ניקוי</button>
            <button onClick={handleNext} style={{ flex: 1, padding: '10px', backgroundColor: '#2196F3', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>הבא</button>
          </div>

          {statusMessage && <p style={{ color: statusMessage.includes('בהצלחה') ? 'green' : 'red', fontSize: '14px' }}>{statusMessage}</p>}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: '#9C27B0', color: 'white', border: 'none', cursor: isGeneratingPdf ? 'not-allowed' : 'pointer', borderRadius: '4px', opacity: isGeneratingPdf ? 0.6 : 1 }}>
          {isGeneratingPdf ? 'מכין טופס...' : 'הורדת טופס'}
        </button>
      </div>
    </div>
  );
};

export default App;
