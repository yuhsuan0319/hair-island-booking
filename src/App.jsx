import React, { useState, useEffect } from 'react';

export default function App() {
  const [userName, setUserName] = useState(''); // 預設留空，完全依賴 LINE 登入抓取
  const [serviceItem, setServiceItem] = useState('質感剪髮');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [remark, setRemark] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 自動透過 LINE LIFF 抓取登入的使用者名稱
  useEffect(() => {
    if (window.liff) {
      window.liff.init({ liffId: "2012650134-fNn1I0l8" })
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

  // 點擊送出時，串接 Google Apps Script 發送 LINE 預約推播通知
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userName) {
      alert('正在讀取您的 LINE 帳號，請稍候再試...');
      return;
    }
    if (!appointmentDate || !appointmentTime) {
      alert('請完整選擇預約日期與時間');
      return;
    }

    setIsSubmitting(true);
    const GAS_URL = "https://script.google.com/macros/s/AKfycbzz6sxxZ-pArV_MJ2yypT6gUuMaZQEmXXM597ayfQcJIlWuYvAYISavd4MGR4cytpw0/exec";

    try {
      await fetch(GAS_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: userName,
          serviceItem: serviceItem,
          appointmentTime: `${appointmentDate} ${appointmentTime}`,
          remark: remark || "無"
        })
      });
    } catch (error) {
      console.error("發送通知失敗", error);
    }

    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fdfbf7', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#ffffff', padding: '36px 28px', borderRadius: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid #eae6df', textAlign: 'center', boxSizing: 'border-box' }}>
        
        {/* 標題與副標 */}
        <h1 style={{ fontSize: '26px', color: '#2c2c2c', margin: '0 0 6px 0', letterSpacing: '1px' }}>髮嶼 HAIR ISLAND</h1>
        <p style={{ fontSize: '13px', color: '#888888', margin: '0 0 20px 0' }}>專屬頭皮養護與美髮預約</p>

        {/* 歡迎回來橫幅 */}
        <div style={{ backgroundColor: '#f5f2eb', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', display: 'inline-block', width: '100%', boxSizing: 'border-box' }}>
          <span style={{ fontSize: '14px', color: '#4a453e', fontWeight: '500' }}>
            {userName ? `歡迎回來，${userName} 貴賓！` : '正在讀取您的 LINE 身分...'}
          </span>
        </div>

        {submitted ? (
          <div>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>✨</div>
            <h2 style={{ fontSize: '20px', color: '#2c2c2c', margin: '0 0 16px 0' }}>預約資訊已送出！</h2>
            
            <div style={{ fontSize: '14px', color: '#555555', lineHeight: '1.8', marginBottom: '24px', textAlign: 'left', backgroundColor: '#faf8f5', padding: '16px 20px', borderRadius: '12px' }}>
              謝謝 <strong>{userName}</strong>，我們已收到您的預約申請：<br />
              📌 項目：<strong>{serviceItem}</strong><br />
              📅 日期：<strong>{appointmentDate}</strong><br />
              ⏰ 時間：<strong>{appointmentTime}</strong><br />
              💬 備註：<strong>{remark || '無'}</strong>
            </div>

            <button 
              onClick={() => { setSubmitted(false); setRemark(''); }}
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
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#444', marginBottom: '6px' }}>選擇預約日期</label>
              <input 
                type="date" 
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #dcd6cd', fontSize: '14px', backgroundColor: '#fff', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#444', marginBottom: '6px' }}>選擇預約時間（每30分鐘一格）</label>
              <select 
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #dcd6cd', fontSize: '14px', backgroundColor: '#fff', boxSizing: 'border-box' }}
              >
                <option value="">請選擇時段</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="10:30 AM">10:30 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="11:30 AM">11:30 AM</option>
                <option value="12:00 PM">12:00 PM</option>
                <option value="12:30 PM">12:30 PM</option>
                <option value="01:00 PM">01:00 PM</option>
                <option value="01:30 PM">01:30 PM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="02:30 PM">02:30 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="03:30 PM">03:30 PM</option>
                <option value="04:00 PM">04:00 PM</option>
                <option value="04:30 PM">04:30 PM</option>
                <option value="05:00 PM">05:00 PM</option>
                <option value="05:30 PM">05:30 PM</option>
                <option value="06:00 PM">06:00 PM</option>
                <option value="06:30 PM">06:30 PM</option>
                <option value="07:00 PM">07:00 PM</option>
                <option value="07:30 PM">07:30 PM</option>
                <option value="08:00 PM">08:00 PM</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#444', marginBottom: '6px' }}>備註事項（選填）</label>
              <textarea 
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="例如：指定設計師、希望加強頭皮按摩等..."
                rows="2"
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #dcd6cd', fontSize: '
