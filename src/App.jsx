import React, { useState, useEffect } from 'react';

export default function App() {
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [liffReady, setLiffReady] = useState(false);

  const [serviceItem, setServiceItem] = useState('質感剪髮');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentHour, setAppointmentHour] = useState('14');
  const [appointmentMinute, setAppointmentMinute] = useState('00');
  const [remark, setRemark] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 營業時間：10 點 ～ 20 點
  const hours = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
  // 分鐘：每 30 分鐘一格
  const minutes = ['00', '30'];

  // 自動載入並初始化 LINE LIFF 抓取使用者名稱
  useEffect(() => {
    const initLiff = async () => {
      try {
        if (!window.liff) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        await window.liff.init({ liffId: '2012650134-fNn1I0l8' });
        setLiffReady(true);

        if (window.liff.isLoggedIn()) {
          const profile = await window.liff.getProfile();
          setUserName(profile.displayName);
          setUserId(profile.userId);
        } else {
          window.liff.login();
        }
      } catch (err) {
        console.error('LIFF 初始化失敗:', err);
        setLiffReady(true);
      }
    };

    initLiff();
  }, []);

  // 送出表單並觸發 Google Apps Script LINE 推播
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appointmentDate) {
      alert('請選擇預約日期');
      return;
    }

    const fullTime = `${appointmentHour}:${appointmentMinute}`;
    setIsSubmitting(true);
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbzz6sxxZ-pArV_MJ2yypT6gUuMaZQEmXXM597ayfQcJIlWuYvAYISavd4MGR4cytpw0/exec';

    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: userName || 'LINE 貴賓',
          userId: userId,
          serviceItem: serviceItem,
          appointmentDate: appointmentDate,
          appointmentTime: `${appointmentDate} ${fullTime}`,
          remark: remark || '無'
        })
      });
    } catch (error) {
      console.error('發送預約通知失敗:', error);
    }

    setIsSubmitting(false);
    setSubmitted(true);
  };

  // 統一所有輸入與選擇欄位的樣式，確保左右邊界與高度 100% 齊平
  const fieldStyle = {
    display: 'block',
    width: '100%',
    height: '46px',
    padding: '0 14px',
    borderRadius: '10px',
    border: '1px solid #dcd6cd',
    fontSize: '15px',
    color: '#2c2c2c',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
    outline: 'none',
    margin: 0
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4a453e',
    marginBottom: '6px'
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fdfbf7', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box' }}>
      <style>{`
        input[type="date"] {
          -webkit-appearance: none;
          appearance: none;
          min-width: 100%;
          max-width: 100%;
        }
        input[type="date"]::-webkit-date-and-time-value {
          text-align: left;
          margin: 0;
        }
        .select-wrapper {
          position: relative;
          width: 100%;
        }
        .select-wrapper::after {
          content: "▾";
          font-size: 14px;
          color: #888888;
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', padding: '32px 24px', borderRadius: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)', border: '1px solid #eae6df', textAlign: 'center', boxSizing: 'border-box' }}>
        
        {/* 品牌標題 */}
        <h1 style={{ fontSize: '24px', color: '#2c2c2c', margin: '0 0 6px 0', letterSpacing: '1.5px', fontWeight: '700' }}>髮嶼 HAIR ISLAND</h1>
        <p style={{ fontSize: '13px', color: '#888888', margin: '0 0 20px 0' }}>專屬頭皮養護與美髮預約</p>

        {/* LINE 使用者歡迎橫幅 */}
        <div style={{ backgroundColor: '#f5f2eb', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', width: '100%', boxSizing: 'border-box' }}>
          <span style={{ fontSize: '14px', color: '#4a453e', fontWeight: '600' }}>
            {userName ? `歡迎回來，${userName} 貴賓！` : (liffReady ? '歡迎光臨，貴賓！' : '正在讀取 LINE 帳號資訊...')}
          </span>
        </div>

        {submitted ? (
          <div>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>✨</div>
            <h2 style={{ fontSize: '20px', color: '#2c2c2c', margin: '0 0 16px 0' }}>預約資訊已送出！</h2>
            
            <div style={{ fontSize: '14px', color: '#555555', lineHeight: '1.9', marginBottom: '24px', textAlign: 'left', backgroundColor: '#faf8f5', padding: '16px 20px', borderRadius: '12px', border: '1px solid #f0ece4', boxSizing: 'border-box' }}>
              謝謝 <strong>{userName || '貴賓'}</strong>，我們已收到您的預約申請：<br />
              📌 預約項目：<strong>{serviceItem}</strong><br />
              📅 預約日期：<strong>{appointmentDate}</strong><br />
              ⏰ 預約時間：<strong>{appointmentHour}:{appointmentMinute}</strong><br />
              💬 備註事項：<strong>{remark || '無'}</strong>
            </div>

            <button 
              onClick={() => { setSubmitted(false); setRemark(''); }}
              style={{ width: '100%', height: '46px', backgroundColor: '#f0ece4', color: '#4a453e', border: '1px solid #dcd6cd', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxSizing: 'border-box' }}
            >
              修改預約內容
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}>
            
            {/* 1. 預約項目 */}
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={labelStyle}>選擇預約項目</label>
              <div className="select-wrapper">
                <select 
                  value={serviceItem}
                  onChange={(e) => setServiceItem(e.target.value)}
                  style={fieldStyle}
                >
                  <option value="質感剪髮">質感剪髮</option>
                  <option value="精油頭皮養護">精油頭皮養護</option>
                  <option value="精油頭皮養護 + 質感剪髮">精油頭皮養護 + 質感剪髮</option>
                  <option value="經典質感染髮">經典質感染髮</option>
                  <option value="日系溫塑燙髮">日系溫塑燙髮</option>
                  <option value="深度放鬆洗護專案">深度放鬆洗護專案</option>
                </select>
              </div>
            </div>

            {/* 2. 預約日期 */}
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={labelStyle}>選擇預約日期</label>
              <input 
                type="date" 
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                style={fieldStyle}
              />
            </div>

            {/* 3. 預約時間（時 / 分 兩欄並排滾動選擇） */}
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={labelStyle}>選擇預約時間</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                
                {/* 左欄：小時 */}
                <div className="select-wrapper" style={{ flex: 1 }}>
                  <select 
                    value={appointmentHour}
                    onChange={(e) => setAppointmentHour(e.target.value)}
                    style={fieldStyle}
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>{h} 時</option>
                    ))}
                  </select>
                </div>

                <span style={{ fontWeight: 'bold', color: '#4a453e', fontSize: '16px' }}>:</span>

                {/* 右欄：分鐘（00 / 30） */}
                <div className="select-wrapper" style={{ flex: 1 }}>
                  <select 
                    value={appointmentMinute}
                    onChange={(e) => setAppointmentMinute(e.target.value)}
                    style={fieldStyle}
                  >
                    {minutes.map((m) => (
                      <option key={m} value={m}>{m} 分</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* 4. 備註事項 */}
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label style={labelStyle}>備註事項（選填）</label>
              <textarea 
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="例如：希望加強肩頸放鬆、特殊髮況說明..."
                rows="3"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #dcd6cd',
                  fontSize: '15px',
                  color: '#2c2c2c',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                  resize: 'none',
                  outline: 'none',
                  margin: 0,
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* 送出按鈕 */}
            <button 
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '6px',
                width: '100%',
                height: '48px',
                backgroundColor: isSubmitting ? '#7a7a7a' : '#2c2c2c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                letterSpacing: '1px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxSizing: 'border-box'
              }}
            >
              {isSubmitting ? '預約傳送中...' : '確認送出預約'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
