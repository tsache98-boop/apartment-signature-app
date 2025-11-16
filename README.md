# 🏢 מערכת חתימות דיגיטלית - רחבת הרב עוזיאל 4-14

אפליקציית React לאיסוף חתימות דיגיטליות מ-32 דירות בבניין.

## 📋 תיאור הפרויקט

מערכת ניהול חתימות דיגיטלית המאפשרת:
- ✍️ חתימה דיגיטלית על Canvas
- 📄 הצגת PDF למשתמשים לפני חתימה
- 👨‍💼 ממשק ניהול למנהל הבניין
- 📊 מעקב אחר התקדמות החתימות (X/32)
- 🔔 התראות על חתימות חדשות
- 📥 הורדת מסמך HTML מלא עם כל החתימות
- 🔗 יצירת לינקים ייחודיים לכל דירה

## 🚀 טכנולוגיות

- React 18
- Vite (Build tool)
- Tailwind CSS
- Lucide React Icons
- Canvas API לחתימות
- Local Storage API

## 📦 התקנה

```bash
# שכפל את הפרויקט
git clone https://github.com/tsache98-boop/apartment-signature-app.git
cd apartment-signature-app

# התקן dependencies
npm install

# הרץ בפיתוח
npm run dev

# בנה לפרודקשן
npm run build
```

## 🌐 פריסה ל-GitHub Pages

הפרויקט כבר כולל קובץ Workflow שמבצע Build ופריסה אוטומטית ל-GitHub Pages בכל דחיפה ל-main.

1. ודא שקובץ ה-PDF (`form.pdf`) יושב בתיקיית `public/` ברפוזיטורי לפני ה-Push.
2. ב-GitHub, עבור ל-**Settings → Pages** ובחר את הסביבה `GitHub Pages` (ה-Workflow ייצור אותה אוטומטית בהרצה הראשונה).
3. כל Push ל-main יפעיל את הקובץ `.github/workflows/deploy.yml`, יבנה את האפליקציה עם בסיס נתיב מותאם (`/${repo}/`) ויפרסם את התוכן ל-`gh-pages`.
4. קבל את ה-URL מתוך ה-Logs או מ-Settings → Pages, לדוגמה: `https://<user>.github.io/<repo>/`.

> אם אתה מעתיק את הפרויקט לרפוזיטורי אחר, אין צורך בשינויים ידניים – ה-Workflow מייצר בעצמו את בסיס הנתיב המתאים לפי שם הרפוזיטורי.

## 📁 מבנה הפרויקט

```
apartment-signature-app/
├── src/
│   ├── App.jsx          # הקומפוננטה הראשית
│   ├── main.jsx         # Entry point
│   └── index.css        # Tailwind styles
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── README.md           # Documentation
```

## 🔑 תכונות עיקריות

### למנהל:
- העלאת PDF לחתימה
- צפייה בסטטוס כל 32 הדירות
- יצירת לינקים לחתימה לכל דירה
- הורדת מסמך סופי עם כל החתימות
- התראות בזמן אמת

### לדיירים:
- צפייה במסמך PDF
- מילוי פרטים אישיים
- חתימה דיגיטלית על Canvas
- אישור וש
