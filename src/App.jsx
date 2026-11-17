// 當 Google 試算表被新增預約資料時，自動發送 LINE 通知給管理者
function sendLineNotification(e) {
  // 填入你的管理員 LINE User ID (從 LINE Developers 或後台取得的 U 開頭字串)
  var adminUserId = "請在這裡填入你的U開頭管理員ID"; 
  
  // 你的 LINE Messaging API Channel Access Token
  var CHANNEL_ACCESS_TOKEN = "EFC8arpJuVDqQR34qBK8Ae5SlxRFHaW13caLcJUbS2TOaGObt9C5Ra7xsHYdauHW6p8jQu6RFPz7X+0LIZmWccZZJDb3XVFPjvm5wGRyzVLI+hYrl3b8FLAbBt1Bq7inI1FrXEvMYkhh/scnbAsu6wdB04t89/1O/w1cDnyilFU=";
  
  var url = "https://api.line.me/v2/bot/message/push";
  
  // 想要推播給管理者的訊息內容
  var message = "📢 【髮嶼 HAIR ISLAND】有新的預約或訊息進來囉！請至管理後台查看。";
  
  var payload = {
    "to": adminUserId,
    "messages": [
      {
        "type": "text",
        "text": message
      }
    ]
  };
  
  var options = {
    "method": "post",
    "headers": {
      "Content-Type": "application/json; charset=UTF-8",
      "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN
    },
    "payload": JSON.stringify(payload)
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch (error) {
    Logger.log("推播失敗: " + error.toString());
  }
}
