import React, { useState, useEffect } from 'react';

export default function App() {
  const [userName, setUserName] = useState('鄭宇軒Peter'); 
  const [serviceItem, setServiceItem] = useState('質感剪髮');
  const [appointmentDate, setAppointmentDate] = useState(''); // 預設留空讓使用者選擇
  const [submitted, setSubmitted] = useState(false);

  // 自動透過 LINE LIFF 抓取登入的使用者名稱
  useEffect(() => {
    if (window.liff) {
      window.liff.init({ liffId: "你的LIFF_ID" })
        .then(() => {
          if (window.liff.isLoggedIn()) {
            window.liff.getProfile().then(profile => {
              setUserName(profile.displayName);
            }).catch(err => console.log('取得 LINE 個人檔案失敗', err));
          } else {
            window.liff.login();
          }
        })
        .catch(err => console.log('LIFF 初始化失敗', err));
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!appointmentDate) {
      alert('請選擇預約日期與時間');
      return;
    }
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fdfbf7', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#ffffff', padding: '36px 28px', borderRadius: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid #eae6df', textAlign: 'center' }}>
        
        {/* 標題與副標 */}
        <h1 style={{ fontSize: '26px', color: '#2c2c2c', margin: '0 0 6px 0', letterSpacing: '1px' }}>髮嶼 HAIR ISLAND</h1>
        <p style={{ fontSize: '13px', color: '#888888', margin: '0 0 20px 0' }}>專屬頭皮養護與美髮預約</p>

        {/* 歡迎回來橫幅 */}
        <div style={{ backgroundColor: '#f5f2eb', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', display: 'inline-block', width: '100%', boxSizing: 'border-box' }}>
          <span style={{ fontSize: '14px', color: '#4a453e', fontWeight: '500' }}>歡迎回來，{userName} 貴賓！</span>
        </div>

        {submitted ? (
          <div>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>✨</div>
            <h2 style={{ fontSize: '20px', color: '#2c2c2c', margin: '0 0 16px 0' }}>預約資訊已送出！</h2>
            
            <div style={{ fontSize: '14px', color: '#555555', lineHeight: '1.8', marginBottom: '24px', textAlign: 'left', backgroundColor: '#faf8f5', padding: '16px 20px', borderRadius: '12px' }}>
              謝謝 <strong>{userName}</strong>，我們已收到您的預約申請：<br />
              📌 項目：<strong>{serviceItem}</strong><br />
              📅 日期：<strong>{appointmentDate.replace('T', ' ')}</strong>
            </div>

            <button 
              onClick={() => setSubmitted(false)}
              style={{ width: '100%', padding: '12px', backgroundColor: '#f0ece4', color: '#4a453e', border: '1px solid #dcd6cd', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
            >
              修改預約內容
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#444', marginBottom: '6px' }}>選擇預約項目</label>
              <select 
                value={serviceItem}
                onChange={(e) => setServiceItem(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #dcd6cd', fontSize: '14px', backgroundColor: '#fff', boxSizing: 'border-box' }}
              >
                <option value="質感剪髮">質感剪髮</option>
                <option value="精油頭皮養護">精油頭皮養護</option>
                <option value="經典質感染髮">經典質感染髮</option>
                <option value="日系溫塑燙髮">日系溫塑燙髮</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#444', marginBottom: '6px' }}>選擇預約日期與時間</label>
              {/* 改用 datetime-local 讓手機與電腦都能直接點擊跳出選單 */}
              <input 
                type="datetime-local" 
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #dcd6cd', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#fff' }}
              />
            </div>

            <button 
              type="submit"
              style={{ marginTop: '8px', width: '100%', padding: '14px', backgroundColor: '#2c2c2c', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              確認送出預約
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
