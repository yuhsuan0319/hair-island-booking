import React, { useState } from 'react';

export default function App() {
  const [clientName, setClientName] = useState('');
  const [serviceItem, setServiceItem] = useState('精油頭皮養護 + 質感剪髮');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // 這裡可以串接你的 Google Apps Script 網頁應用程式網址來發送預約資料
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fdfbf7', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #eae6df' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', color: '#2c2c2c', margin: '0 0 8px 0' }}>髮嶼 HAIR ISLAND</h1>
          <p style={{ fontSize: '14px', color: '#7a7a7a', margin: '0' }}>專屬質感沙龍・線上預約系統</p>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <h3 style={{ color: '#2b580c', marginBottom: '12px' }}>預約資訊已送出！</h3>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>
              感謝您的預約，管理者已收到您的通知，我們將盡快為您確認檔期！
            </p>
            <button 
              onClick={() => setSubmitted(false)}
              style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#2c2c2c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              再次預約
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#444', marginBottom: '6px' }}>客戶姓名</label>
              <input 
                type="text" 
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="請輸入您的姓名"
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#444', marginBottom: '6px' }}>預約服務項目</label>
              <select 
                value={serviceItem}
                onChange={(e) => setServiceItem(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', backgroundColor: '#fff', boxSizing: 'border-box' }}
              >
                <option value="精油頭皮養護 + 質感剪髮">精油頭皮養護 + 質感剪髮</option>
                <option value="經典質感染髮">經典質感染髮</option>
                <option value="日系溫塑燙髮">日系溫塑燙髮</option>
                <option value="深度放鬆洗護專案">深度放鬆洗護專案</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#444', marginBottom: '6px' }}>預約時間</label>
              <input 
                type="datetime-local" 
                required
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <button 
              type="submit"
              style={{ marginTop: '12px', padding: '12px', backgroundColor: '#2c2c2c', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              確認送出預約
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
