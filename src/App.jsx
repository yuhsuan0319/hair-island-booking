import React, { useEffect, useState } from 'react';
import liff from '@line/liff';

function App() {
  const [displayName, setDisplayName] = useState('');
  const [statusMessage, setStatusMessage] = useState('正在連線到 LINE...');

  useEffect(() => {
    // 這裡之後要換成你在 LINE Developers 拿到的 LIFF ID
    const LIFF_ID = "2012650134-fNn1I0l8"; 

    if (LIFF_ID === "YOUR_LIFF_ID") {
      setStatusMessage('請先填入你的 LIFF ID 才能正常運作喔！');
      return;
    }

    liff.init({ liffId: LIFF_ID })
      .then(() => {
        if (liff.isLoggedIn()) {
          liff.getProfile().then(profile => {
            setDisplayName(profile.displayName);
            setStatusMessage('成功取得您的 LINE 身分！');
          });
        } else {
          liff.login(); // 若未登入則引導登入 LINE
        }
      })
      .catch((err) => {
        setStatusMessage(`初始化失敗: ${err}`);
      });
  }, []);

  return (
    <div style={{ padding: '32px', fontFamily: 'sans-serif', textAlign: 'center', backgroundColor: '#f9f8f6', minHeight: '100vh' }}>
      <h2 style={{ color: '#4a3b32', letterSpacing: '2px' }}>髮嶼 HAIR ISLAND</h2>
      <p style={{ color: '#666', marginTop: '16px' }}>{statusMessage}</p>
      {displayName && (
        <div style={{ marginTop: '20px', padding: '16px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: '18px', color: '#333' }}>歡迎回來，**{displayName}** 貴賓！</p>
        </div>
      )}
    </div>
  );
}

export default App;