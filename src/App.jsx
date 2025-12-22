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
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPage, setCurrentPage] = useState('admin'); // 'admin', 'resident', 'success'
  const [currentResidentId, setCurrentResidentId] = useState(null);
  
  // Parse URL to get resident ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id !== null) {
      setCurrentResidentId(parseInt(id));
      setCurrentPage('resident');
    }
  }, []);
  
  // Canvas handlers
  const handleMouseDown = () => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const ctx = canvasRef.current.getContext('2d');
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
  
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    setStatusMessage('');
  };
  
  const handleSignature = () => {
    if (!canvasRef.current || currentResidentId === null) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = canvas.toDataURL('image/png');
    
    const newSignatures = { ...signatures };
    newSignatures[currentResidentId] = {
      signature: imageData,
      name: RESIDENTS[currentResidentId],
      timestamp: new Date().toISOString()
    };
    
    setSignatures(newSignatures);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSignatures));
    
    setStatusMessage(`✓ חתימה של ${RESIDENTS[currentResidentId]} נשמרה`);
    setCurrentPage('success');
  };
  
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setStatusMessage('טוען...');
      const response = await fetch(PDF_PATH);
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      
      let signatureIndex = 0;
      for (const [residentId, signatureData] of Object.entries(signatures)) {
        const { signature, name } = signatureData;
        const signatureImage = await pdfDoc.embedPng(signature);
        
        const rowNumber = signatureIndex + 1;
        let pageNum = 0;
        let rowInPage = rowNumber;
        if (rowNumber > 13) {
          pageNum = 1;
          rowInPage = rowNumber - 13;
        }
        
        const yPos = 195 + (rowInPage - 1) * 26;
        const targetPage = pages[pageNum];
        
        targetPage.drawImage(signatureImage, {
          x: 100,
          y: yPos,
          width: 35,
          height: 22
        });
        
        targetPage.drawText(name, {
          x: 850,
          y: yPos + 5,
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
  
  // Admin Page - Show links to all residents
  if (currentPage === 'admin') {
    return (
      <div style={{ padding: '20px', direction: 'rtl', fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <h1>דף מנהל - חתימות דיירים</h1>
        <p>מספר חתימות: {Object.keys(signatures).length} / {RESIDENTS.length}</p>
        <div style={{ marginBottom: '20px' }}>
          <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' }}>
            {isGeneratingPdf ? 'מעבד...' : 'הורדת טופס חתום'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
          {RESIDENTS.map((resident, index) => {
            const isSigned = signatures[index];
            return (
              <div key={index} style={{ padding: '15px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'right' }}>
                <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>{index + 1}. {resident}</p>
                <a href={`?id=${index}`} style={{ display: 'inline-block', padding: '8px 16px', backgroundColor: isSigned ? '#4CAF50' : '#2196F3', color: 'white', textDecoration: 'none', borderRadius: '4px', fontSize: '14px' }}>
                  {isSigned ? '✓ חתום' : 'לחתום'}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Resident Page - Signature form
  if (currentPage === 'resident' && currentResidentId !== null) {
    return (
      <div style={{ padding: '20px', direction: 'rtl', fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <h1>חתימה דיגיטלית</h1>
        <h2>{RESIDENTS[currentResidentId]}</h2>
        <div style={{ maxWidth: '500px', margin: '0 auto', backgroundColor: '#fff', padding: '20px', borderRadius: '8px' }}>
          <p>אנא חתום בשדה למטה</p>
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
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
              touchAction: 'none',
              width: '100%'
            }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleSignature} style={{ flex: 1, padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              אישור חתימה
            </button>
            <button onClick={handleClear} style={{ flex: 1, padding: '10px', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              ניקוי
            </button>
          </div>
          {statusMessage && <p style={{ color: 'green', marginTop: '10px', textAlign: 'center' }}>{statusMessage}</p>}
        </div>
      </div>
    );
  }
  
  // Success Page
  if (currentPage === 'success') {
    return (
      <div style={{ padding: '20px', direction: 'rtl', fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh', textAlign: 'center' }}>
        <h1>✓ תודה על החתימה!</h1>
        <p style={{ fontSize: '18px', marginBottom: '20px' }}>החתימה שלך נשמרה בהצלחה</p>
        <a href="/" style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: '#2196F3', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          חזור לדף הבית
        </a>
      </div>
    );
  }
  
  return null;
};

export default App;import React, { useState, useRef, useEffect } from 'react';
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
   const [isAdmin, setIsAdmin] = useState(false);
   const [adminPassword, setAdminPassword] = useState('');
  

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
   const handleAdminLogin = () => {
       if (adminPassword === 'admin123') {
             setIsAdmin(true);
           } else {
             alert('סיסמה שגויה');
           }
      };
  
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
// Calculate table positioning (rows 1-13 on page 3, rows 14-20 on page 4, rightmost column)
const rowNumber = signatureIndex + 1;
let pageNum = 0;
let rowInPage = rowNumber;
if (rowNumber > 13) {
  pageNum = 1;
  rowInPage = rowNumber - 13;
}
const xPos = 970; // Right column of signature table
const yPos = 195 + (rowInPage - 1) * 26; // Table row height ~26px
const targetPage = pages[pageNum];        
targetPage.drawImage(signatureImage, {
          x: 100,
          y: yPos,
          width: 35,
          height: 22
        });
        // הוספת שם הדייר ליד החתימה
         targetPage.drawText(name, {
              x: 850,
              y: yPos + 5,
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
        {isAdmin ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                          <h1>שלום מנהל</h1>
                          <p>מספר: {Object.keys(signatures).length} / {RESIDENTS.length}</p>
                          <button onClick={handleDownloadPdf} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>הורדת טופס</button>
                          <button onClick={() => setIsAdmin(false)} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px' }}>שטור</button>
                        </div>
              ) : (
          <div style={{ padding: '20px', textAlign: 'center', maxWidth: '300px', margin: '50px auto' }}>
                    <h1>דף מנהל</h1>
                    <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="הכנס מנהל" style={{ width: '100%', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} />
                    <button onClick={handleAdminLogin} style={{ width: '100%', padding: '10px', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}>הכנס</button>
                  </div>
          <div style={{ padding: '20px', direction: 'rtl', fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
          {/* Insert the entire regular signature form here */}
        </div>
      )}

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
