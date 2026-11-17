import React, { useState, useEffect } from 'react';
import liff from '@line/liff';

function App() {
  const [displayName, setDisplayName] = useState('');
  const [service, setService] = useState('質感剪髮');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // 初始化 LIFF 抓取 LINE 使用者身分
  useEffect(() => {
    liff.init({ liffId: '2012650134-fNn1I0l8' })
      .then(() => {
        if (!liff.isLoggedIn()) {
          liff.login();
        } else {
          liff.getProfile().then(profile => {
            setDisplayName(profile.displayName);
          });
        }
      })
      .catch((err) => {
        console.error('LIFF 初始化失敗', err);
        setDisplayName('訪客 (測試中)');
      });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date) {
      alert('請選擇預約日期！');
      return;
    }

    // 組合要發送的預約明細文字
    const messageText = `✨ 【髮嶼 HAIR ISLAND 預約明細】 ✨\n` +
      `👤 貴賓姓名：${displayName}\n` +
      `✂️ 預約項目：${service}\n` +
      `📅 預約日期：${date}\n` +
      `⏰ 預約時段：${time}\n` +
      `📝 備註需求：${note || '無'}\n` +
      `----------------------------\n` +
      `預約已送出，請將此明細傳送給設計師確認！`;

    // 使用 LINE 標準文字分享協定，直接強制啟動手機 LINE 的分享選單
    const encodedText = encodeURIComponent(messageText);
    const lineShareUrl = `https://line.me/R/msg/text/?${encodedText}`;

    // 顯示成功畫面
    setSubmitted(true);

    // 延遲一點點時間自動跳轉到 LINE 分享頁面讓用戶發送
    setTimeout(() => {
      window.location.href = lineShareUrl;
    }, 800);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9f8f6', padding: '20px', fontFamily: 'sans-serif', color: '#333' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        
        {/* 標題區 */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', letterSpacing: '1px', color: '#2c2c2c' }}>髮嶼 HAIR ISLAND</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>專屬頭皮養護與美髮預約</p>
          {displayName && (
            <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f4f1ea', borderRadius: '8px', fontSize: '14px', display: 'inline-block' }}>
              歡迎回來，<strong>{displayName}</strong> 貴賓！
            </div>
          )}
        </div>

        {!submitted ? (
          /* 預約表單 */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* 選擇服務項目 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>選擇服務項目</label>
              <select 
                value={service} 
                onChange={(e) => setService(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', backgroundColor: '#fff' }}
              >
                <option value="質感剪髮">質感剪髮 (約 60 分鐘)</option>
                <option value="頭皮養護療程">奢華頭皮養護療程 (約 90 分鐘)</option>
                <option value="時尚染髮">時尚質感染髮 (約 120 分鐘)</option>
                <option value="溫塑燙髮">日系溫塑燙髮 (約 180 分鐘)</option>
              </select>
            </div>

            {/* 選擇日期 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>預約日期</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', boxSizing: 'border-box' }}
                required
              />
            </div>

            {/* 選擇時段 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>預約時段</label>
              <select 
                value={time} 
                onChange={(e) => setTime(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '15px', backgroundColor: '#fff' }}
              >
                <option value="10:00">10:00 上午</option>
                <option value="13:00">13:00 下午</option>
                <option value="15:30">15:30 下午</option>
                <option value="18:00">18:00 晚上</option>
              </select>
            </div>

            {/* 備註 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>備註需求 (選填)</label>
              <textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：想指定設計師、或有頭皮敏感狀況等..."
                rows="3"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {/* 送出按鈕 */}
            <button 
              type="submit"
              style={{ 
                backgroundColor: '#2c2c2c', 
                color: '#fff', 
                padding: '12px', 
                borderRadius: '8px', 
                border: 'none', 
                fontSize: '16px', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              確認送出預約
            </button>
          </form>
        ) : (
          /* 預約成功完成畫面 */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✨</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#2c2c2c' }}>正在導向 LINE 發送預約明細...</h3>
            <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
              謝謝 <strong>{displayName}</strong>，頁面即將帶您將預約單傳送至聊天室！
            </p>
            <button 
              onClick={() => setSubmitted(false)}
              style={{ 
                backgroundColor: '#f4f1ea', 
                color: '#333', 
                padding: '10px 20px', 
                borderRadius: '8px', 
                border: '1px solid #ddd', 
                fontSize: '14px', 
                cursor: 'pointer' 
              }}
            >
              返回修改預約
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
