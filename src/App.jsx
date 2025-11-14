362
  import React, { useState, useRef, useEffect } from 'react';
import { FileText, Users, Download, CheckCircle, Clock, X, Upload, Eye, Copy, Link, Bell, Lock } from 'lucide-react';
import { PDFDocument, rgb } from 'pdf-lib';

const ApartmentSignatureApp = () => {
  const [view, setView] = useState('login'); // login, admin, sign
  const [isAdmin, setIsAdmin] = useState(false);
  const [signatures, setSignatures] = useState([]);
  const [currentApartment, setCurrentApartment] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedAptForLink, setSelectedAptForLink] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // Login
  const [adminPassword, setAdminPassword] = useState('');
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Canvas
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  
  // File
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadData();
    checkAdminStatus();
    const params = new URLSearchParams(window.location.search);
    const aptParam = params.get('apt');
    if (aptParam) {
      const aptId = parseInt(aptParam);
      if (aptId >= 1 && aptId <= 32) {
        setCurrentApartment(aptId);
        setView('sign');
      }
    }
  }, []);

  const checkAdminStatus = () => {
    const savedAdmin = sessionStorage.getItem('isAdmin');
    if (savedAdmin === 'true') {
      setIsAdmin(true);
      setView('admin');
    }
  };

  const loadData = async () => {
    try {
      const sigs = [];
      // Get all keys from localStorage that start with 'apartment:'
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('apartment:')) {
          try {
            const result = localStorage.getItem(key);
            if (result) {
              sigs.push(JSON.parse(result));
            }
          } catch (e) {}
        }
      }
            setSignatures(sigs);

    } catch (error) {}

    try {
      const result = localStorage.getItem('uploaded-pdf');
      if (result) {
        setPdfData(result);
      }
    } catch (error) {}

    try {
      const result = localStorage.getItem('notifications');
      if (result) {
        setNotifications(JSON.parse(result));
      }
    } catch (error) {}
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'admin123') {
      setIsAdmin(true);
      setView('admin');
      sessionStorage.setItem('isAdmin', 'true');
      alert('✅ התחברת כמנהל');
    } else {
      alert('❌ סיסמה שגויה');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setView('login');
    sessionStorage.removeItem('isAdmin');
  };

  const processFile = async (file) => {
    console.log('Processing file:', file.name, file.type, file.size);

    if (file.type !== 'application/pdf') {
      alert('❌ רק קבצי PDF מותרים');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('❌ הקובץ גדול מדי. מקסימום 5MB');
      return;
    }

    const reader = new FileReader();
    
    reader.onloadstart = () => {
      console.log('מתחיל לקרוא קובץ...');
    };

    reader.onload = async (e) => {
      console.log('הקובץ נקרא בהצלחה');
      try {
        const base64Data = e.target.result;
        console.log('שומר ל-storage...');
        localStorage.setItem('uploaded-pdf', base64Data);
        setPdfData(base64Data);
        console.log('PDF נשמר!');
        alert('✅ הקובץ הועלה בהצלחה!\n\nכעת כל מי שיפתח לינק לחתימה יראה את המסמך.');
      } catch (error) {
        console.error('שגיאה בשמירה:', error);
        alert('❌ שגיאה בשמירת הקובץ: ' + error.message);
      }
    };

    reader.onerror = (error) => {
      console.error('שגיאה בקריאת הקובץ:', error);
      alert('❌ שגיאה בקריאת הקובץ');
    };

    console.log('מתחיל לקרוא כ-base64...');
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target?.files?.[0];
    if (file) {
      processFile(file);
      e.target.value = '';
    }
  };

  // Canvas functions
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches?.[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const pos = getMousePos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const doDraw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getMousePos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const endDraw = (e) => {
    if (isDrawing) e.preventDefault();
    setIsDrawing(false);
  };

  const clearSig = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSig = async () => {
    if (!fullName.trim()) {
      alert('❌ הזן שם מלא');
      return;
    }
    if (!date) {
      alert('❌ בחר תאריך');
      return;
    }
    if (!hasSignature) {
      alert('❌ חתום בתיבה');
      return;
    }

    try {
      const sigData = {
        apartmentId: currentApartment,
        fullName: fullName.trim(),
        date,
        email: email.trim(),
        phone: phone.trim(),
        signature: canvasRef.current.toDataURL(),
        timestamp: new Date().toISOString()
      };

      localStorage.setItem(`apartment:${currentApartment}`, JSON.stringify(sigData));

      // Add notification
      const newNotif = {
        id: Date.now(),
        message: `דירה ${currentApartment} - ${fullName.trim()} חתם/ה`,
        time: new Date().toISOString()
      };
      const updatedNotifs = [...notifications, newNotif];
      localStorage.setItem('notifications', JSON.stringify(updatedNotifs));
      setNotifications(updatedNotifs);

      alert('✅ החתימה נשמרה!\n\nהמנהל קיבל התראה.');
      
      setView('login');
      setCurrentApartment(null);
      setFullName('');
      setDate(new Date().toISOString().split('T')[0]);
      setEmail('');
      setPhone('');
      clearSig();
      await loadData();
    } catch (error) {
      alert('❌ שגיאה: ' + error.message);
    }
  };

  const apartments = Array.from({ length: 32 }, (_, i) => ({ id: i + 1 }));
  const getSig = (id) => signatures.find(s => s.apartmentId === id);
  const getLink = (id) => `${window.location.href.split('?')[0]}?apt=${id}`;
  const signedCount = signatures.length;
  const percentage = Math.round((signedCount / 32) * 100);

  const copyLink = async (id) => {
    const link = getLink(id);
    try {
      await navigator.clipboard.writeText(link);
      alert(`✅ לינק לדירה ${id} הועתק!\n\n${link}`);
    } catch {
      prompt('העתק:', link);
    }
  };

const downloadFinal = async () => {
    if (!pdfData) {
      alert('⚠️ יש להעלות מסמך PDF תחילה');
      return;
    }

    try {
      // Load the original PDF
      const pdfDoc = await PDFDocument.load(pdfData);
      
      // Add a new page for signatures
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      
      // Title
      const titleFontSize = 20;
      const titleText = 'רחבת הרב עוזיאל 4-14 - מסמך חתום';
      page.drawText(titleText, {
        x: width / 2 - 150,
        y: height - 50,
        size: titleFontSize,
        color: rgb(0.1, 0.4, 0.6)
      });
      
      // Date
      const dateText = `תאריך: ${new Date().toLocaleDateString('he-IL')}`;
      page.drawText(dateText, {
        x: 50,
        y: height - 90,
        size: 12,
        color: rgb(0, 0, 0)
      });
      
      // Statistics
      const statsText = `חתמו: ${signedCount}/32 (${percentage}%)`;
      page.drawText(statsText, {
        x: 50,
        y: height - 110,
        size: 14,
        color: rgb(0, 0, 0)
      });
      
      // Table headers
      let yPosition = height - 150;
      const lineHeight = 20;
      
      page.drawText('דירה', { x: 50, y: yPosition, size: 12, color: rgb(0, 0, 0) });
      page.drawText('שם מלא', { x: 120, y: yPosition, size: 12, color: rgb(0, 0, 0) });
      page.drawText('תאריך', { x: 250, y: yPosition, size: 12, color: rgb(0, 0, 0) });
      page.drawText('מייל', { x: 350, y: yPosition, size: 12, color: rgb(0, 0, 0) });
      page.drawText('טלפון', { x: 470, y: yPosition, size: 12, color: rgb(0, 0, 0) });
      
      yPosition -= lineHeight;
      
      // Draw a line under headers
      page.drawLine({
        start: { x: 50, y: yPosition },
        end: { x: width - 50, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0)
      });
      
      yPosition -= lineHeight;
      
      // Add signature data
      apartments.forEach(apt => {
        const sig = getSig(apt.id);
        if (sig) {
          page.drawText(String(apt.id), { x: 50, y: yPosition, size: 10, color: rgb(0, 0, 0) });
          page.drawText(sig.fullName || '—', { x: 120, y: yPosition, size: 10, color: rgb(0, 0, 0) });
          page.drawText(sig.date || '—', { x: 250, y: yPosition, size: 10, color: rgb(0, 0, 0) });
          page.drawText(sig.email || '—', { x: 350, y: yPosition, size: 10, color: rgb(0, 0, 0) });
          page.drawText(sig.phone || '—', { x: 470, y: yPosition, size: 10, color: rgb(0, 0, 0) });
          yPosition -= lineHeight;
        }
      });
      
      // Save and download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `מסמך_חתום_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      alert('✅ הקובץ המאוחד הורד בהצלחה! ✅ \n\nהPDF כולל את המסמך המקורי + דף עם החתימות [✅].');
      
    } catch (error) {
      console.error('Error creating unified PDF:', error);
      alert('⚠️ אירעה שגיאה ביצירת PDF מאוחד. נסה שנית.');
    }
  };

      const clearNotifications = async () => {
    localStorage.setItem('notifications', JSON.stringify([]));
    setNotifications([]);
  };

  // Login View
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">רחבת הרב עוזיאל 4-14</h1>
            <p className="text-gray-600 mt-2">כניסות זוגיות</p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
            <Lock className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-center mb-4">כניסת מנהל</h2>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="הזן סיסמת מנהל"
              className="w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
            />
            <button
              onClick={handleAdminLogin}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              התחבר כמנהל
            </button>
            <p className="text-xs text-gray-500 text-center mt-3">דמו: סיסמה = admin123</p>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">📋 אם קיבלת לינק לחתימה - לחץ עליו</p>
            <p>🏢 {signedCount}/32 דירות חתמו ({percentage}%)</p>
          </div>
        </div>
      </div>
    );
  }

  // Admin View
  if (view === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4" dir="rtl">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">רחבת הרב עוזיאל 4-14</h1>
                  <p className="text-sm text-gray-600">כניסות זוגיות - מנהל</p>
                </div>
              </div>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => {
                        alert(`📬 התראות (${notifications.length}):\n\n` + 
                          notifications.map(n => `• ${n.message}\n  ${new Date(n.time).toLocaleString('he-IL')}`).join('\n\n'));
                        clearNotifications();
                      }}
                      className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
                    >
                      <Bell className="w-5 h-5" />
                      {notifications.length}
                    </button>
                  </div>
                )}
                {signedCount > 0 && (
                  <button
                    onClick={downloadFinal}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <Download className="w-5 h-5" />
                    הורד מסמך
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  <X className="w-5 h-5" />
                  יציאה
                </button>
              </div>
            </div>

            <div 
              className={`border-3 rounded-xl p-8 mb-6 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'} border-dashed`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className="text-lg font-semibold text-gray-700 mb-2 text-center">
                {isDragging ? '📥 שחרר כאן' : '📄 גרור PDF לכאן'}
              </p>
              <p className="text-sm text-gray-500 mb-4 text-center">או</p>
              <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} style={{display:'none'}} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="block mx-auto bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
              >
                בחר קובץ (מקס 5MB)
              </button>
              {pdfData && <p className="text-center text-green-600 mt-3 font-semibold">✅ קובץ הועלה</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
                <div className="text-3xl font-bold text-green-600">{signedCount}</div>
                <div className="text-sm text-gray-600">חתמו</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200">
                <Clock className="w-5 h-5 text-yellow-600 mb-2" />
                <div className="text-3xl font-bold text-yellow-600">{32 - signedCount}</div>
                <div className="text-sm text-gray-600">ממתינים</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <Users className="w-5 h-5 text-blue-600 mb-2" />
                <div className="text-3xl font-bold text-blue-600">32</div>
                <div className="text-sm text-gray-600">סה"כ</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                <FileText className="w-5 h-5 text-purple-600 mb-2" />
                <div className="text-3xl font-bold text-purple-600">{percentage}%</div>
                <div className="text-sm text-gray-600">השלמה</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>התקדמות</span>
                <span>{signedCount}/32</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all" style={{width: `${percentage}%`}} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4">סטטוס דירות</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {apartments.map(apt => {
                const sig = getSig(apt.id);
                return (
                  <div key={apt.id} className={`p-4 rounded-lg border-2 ${sig ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">דירה {apt.id}</span>
                      {sig ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-gray-400" />}
                    </div>
                    {sig ? (
                      <div className="text-sm text-gray-600">
                        <div className="font-semibold">{sig.fullName}</div>
                        <div className="text-xs">{sig.date}</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setSelectedAptForLink(apt.id);
                            setShowLinkModal(true);
                          }}
                          className="w-full bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                        >
                          <Link className="w-4 h-4 inline mr-1" />
                          קבל הוראות
                        </button>
                        <button
                          onClick={() => {
                            setCurrentApartment(apt.id);
                            setView('sign');
                          }}
                          className="w-full bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-sm"
                        >
                          <Eye className="w-4 h-4 inline mr-1" />
                          דמו חתימה
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {showLinkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowLinkModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-3xl w-full" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between mb-4">
                <h2 className="text-xl font-bold">לינק לחתימה - דירה {selectedAptForLink}</h2>
                <button onClick={() => setShowLinkModal(false)}><X className="w-6 h-6" /></button>
              </div>
              
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-5 mb-5">
                <p className="font-bold text-yellow-900 mb-3 text-lg">⚠️ חשוב: הלינק לא יעבד אוטומטית</p>
                <p className="text-yellow-800 text-sm mb-3">
                  מכיוון שזו אפליקציה בתוך Claude, הלינק לא יוביל ישירות לאפליקציה. 
                  במקום זה, תצטרך לשלוח הוראות לבעל הדירה:
                </p>
                <div className="bg-white p-4 rounded border-2 border-yellow-300">
                  <p className="font-bold mb-2">📱 טקסט לשליחה בוואטסאפ/מייל:</p>
                  <div className="bg-gray-50 p-3 rounded text-sm" style={{direction: 'rtl'}}>
                    שלום לבעל דירה {selectedAptForLink}!<br/><br/>
                    
                    אנא חתום על מסמך הדיירים:<br/><br/>
                    
                    1️⃣ היכנס ללינק: {getLink(selectedAptForLink)}<br/>
                    2️⃣ במסך שיפתח, גלול מטה ולחץ על "בדוק חתימה" על דירה {selectedAptForLink}<br/>
                    3️⃣ קרא את המסמך, מלא פרטים וחתום<br/><br/>
                    
                    תודה!
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-300 rounded p-4 mb-4">
                <p className="text-sm mb-2 font-semibold text-blue-900">🔗 הלינק לאפליקציה:</p>
                <div className="bg-white p-3 rounded border text-sm break-all font-mono select-all">
                  {getLink(selectedAptForLink)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const message = `שלום לבעל דירה ${selectedAptForLink}!\n\nאנא חתום על מסמך הדיירים:\n\n1️⃣ היכנס ללינק: ${getLink(selectedAptForLink)}\n2️⃣ במסך שיפתח, גלול מטה ולחץ על "בדוק חתימה" על דירה ${selectedAptForLink}\n3️⃣ קרא את המסמך, מלא פרטים וחתום\n\nתודה!`;
                    navigator.clipboard.writeText(message).then(() => {
                      alert('✅ ההודעה המלאה הועתקה!\nכעת הדבק בוואטסאפ או במייל');
                    }).catch(() => {
                      prompt('העתק את הטקסט הזה:', message);
                    });
                  }}
                  className="bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
                >
                  <Copy className="w-4 h-4 inline ml-2" />
                  העתק הודעה מלאה
                </button>
                <button
                  onClick={() => { 
                    copyLink(selectedAptForLink); 
                  }}
                  className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  <Link className="w-4 h-4 inline ml-2" />
                  העתק רק לינק
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Sign View
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 p-4" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-3" />
              <h1 className="text-2xl font-bold">רחבת הרב עוזיאל 4-14</h1>
              <p className="text-blue-100 mt-1">כניסות זוגיות - חתימה על מסמך</p>
              <div className="inline-block bg-white text-blue-600 px-4 py-1 rounded-full mt-3 font-bold">
                דירה {currentApartment}
              </div>
            </div>
          </div>

          {/* PDF Viewer */}
          {pdfData ? (
            <div className="bg-gray-50 p-6 border-b-4 border-blue-200">
              <h2 className="text-xl font-bold text-gray-800 mb-3 text-center">📄 המסמך לחתימה</h2>
              <p className="text-sm text-gray-600 mb-4 text-center">גלול למטה כדי לקרוא את כל המסמך לפני החתימה</p>
              <div className="border-4 border-blue-400 rounded-lg overflow-hidden shadow-lg bg-white">
                <iframe 
                  src={pdfData} 
                  className="w-full" 
                  style={{ height: '600px' }}
                  title="PDF Document"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">💡 טיפ: אם המסמך לא נטען, רענן את הדף</p>
            </div>
          ) : (
            <div className="bg-yellow-50 border-b-4 border-yellow-300 p-6">
              <div className="text-center">
                <FileText className="w-16 h-16 text-yellow-600 mx-auto mb-3" />
                <p className="text-yellow-800 font-semibold text-lg">📋 טרם הועלה מסמך</p>
                <p className="text-yellow-700 text-sm mt-2">המנהל עדיין לא העלה את המסמך לחתימה. נא לחכות.</p>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="p-6">
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-5 mb-6">
              <h3 className="font-bold text-blue-900 mb-3 text-lg flex items-center gap-2">
                <CheckCircle className="w-6 h-6" />
                הנחיות למילוי הטופס
              </h3>
              <ol className="text-sm text-blue-800 space-y-2 mr-5">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>קרא את המסמך בקפידה (גלול למעלה)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>מלא את שמך המלא ותאריך (שדות חובה)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">4.</span>
                  
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">5.</span>
                  <span>לחץ על הכפתור הירוק "שמור חתימה"</span>
                </li>
              </ol>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  שם מלא <span className="text-red-600 text-lg">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg"
                  placeholder="לדוגמה: ישראל ישראלי"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">
                  תאריך <span className="text-red-600 text-lg">*</span>
                </label>
                <input
                type="text"
                                placeholder="DD/MM/YYYY"
                                                pattern="\d{2}/\d{2}/\d{4}"
                                                                maxLength="10"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="050-1234567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-800 mb-3">
                  חתימה דיגיטלית <span className="text-red-600 text-lg">*</span>
                </label>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 mb-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                      ✍️
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 mb-1">איך לחתום?</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• <strong>במחשב:</strong> משוך עם העכבר בתיבה הכחולה</li>
                        <li>• <strong>בנייד/טאבלט:</strong> צייר עם האצבע על המסך</li>
                        <li>• חתום בצורה טבעית כמו שאתה חותם בדרך כלל</li>
                        <li>• לא מרוצה? לחץ "נקה חתימה" והתחל מחדש</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border-4 border-blue-500 rounded-xl bg-white shadow-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={1200}
                    height={300}
                    className="w-full touch-none border-4 border-gray-800 bg-white rounded-lg shadow-md"
                    style={{ touchAction: 'none', cursor: 'crosshair' }}
                    onMouseDown={startDraw}
                    onMouseMove={doDraw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={doDraw}
                    onTouchEnd={endDraw}
                  />
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={clearSig}
                    className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    נקה חתימה
                  </button>
                  {hasSignature && (
                    <span className="text-green-600 font-semibold flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      חתימה נוספה ✓
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={saveSig}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-5 rounded-xl hover:from-green-700 hover:to-green-800 font-bold text-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <CheckCircle className="w-7 h-7" />
                  שמור חתימה ושלח למנהל
                </button>
                <p className="text-xs text-gray-500 text-center mt-3">
                  לאחר השליחה, המנהל יקבל התראה שחתמת על המסמך
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


export default ApartmentSignatureApp;










