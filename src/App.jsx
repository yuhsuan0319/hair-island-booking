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
    e.prevent
