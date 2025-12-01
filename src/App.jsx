import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const RESIDENTS = ['יצחק יוסף מלריך','אפרים דנקו','הלפרין זהבה גבריאל','רימון שרה שרי(רומן)','שולמית נחמוד','אייבי מוסקוביץ','קורדון מרי','אביי פקדו','יהושוע לפיד','טקלה יוורקה','רווית שושן','ישראל רוזנבוים','צח עשת','אהרון בוקובזה','שלום','ימית גולן','נועם עמרם','הפטקה אופיר','גליק אפרים','גרוס ליפא- אדיר','ילנה זרצקי','וישניאנסקי אנה','סרגיי מסיוטין','אולגה פבלוב','נטליה','אלמקאן- גטהון וצ\'וקולוק אבייה','ללא עברית','עומרי ג\'נבה','ליכטנשטיין יהודה אריה לייב','ריטה אובטרכט','יוסי אוחיון (שני)','יפית-בהטה אסממאו'];
const STORAGE_KEY = 'apartment_signatures_v2';

const App = () => {
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

  const handleDownloadCombinedPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const page = pdfDoc.addPage([595, 842]);
      const { height } = page.getSize();
      let y = height - 50;

      page.drawText('Building Report - 14-4 Rehov Hazav', { x: 50, y, size: 18, font, color: rgb(0, 0, 0) });
      y -= 40;
      page.drawText(`Date: ${new Date().toLocaleDateString('en-US')}`, { x: 50, y, size: 12, font });
      y -= 30;
      page.drawText('_________________________________________________________________________', { x: 50, y, size: 10, font });
      y -= 30;

      RESIDENTS.forEach((name, idx) => {
        if (y < 60) {
          pdfDoc.addPage([595, 842]);
          y = 792;
        }
        const status = signatures[idx] ? 'OK' : '--';
        page.drawText(`${idx + 1}. Resident ${status}`, { x: 50, y, size: 11, font });
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
      setStatusMessage('Download completed!');
    } catch (err) {
      console.error(err);
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Digital Signature System</h1>
      <h2>Building 14-4</h2>
      <p>Resident {currentResidentId + 1}: Rehov HaRav Uziel</p>
      <button onClick={() => setCurrentResidentId((currentResidentId + 1) % RESIDENTS.length)} style={{ padding: '10px 20px', fontSize: '16px', marginBottom: '20px' }}>Next</button>
      <p style={{ marginBottom: '20px', fontSize: '14px' }}>Signatures: {Object.keys(signatures).length} / {RESIDENTS.length}</p>
      <button onClick={handleDownloadCombinedPdf} disabled={isGeneratingPdf} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
        {isGeneratingPdf ? 'Preparing...' : 'Download PDF'}
      </button>
      {statusMessage && <div style={{ marginTop: '20px', color: statusMessage.includes('Error') ? 'red' : 'green', fontSize: '16px' }}>{statusMessage}</div>}
    </div>
  );
};

export default App;
