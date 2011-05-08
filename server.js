(function() {
  if (typeof(Cavad) === 'undefined') {
    Cavad = {
      sendUserlist:sendUserlist,
      getCurrentTime:getCurrentTime,
      padZero:padZero
    };
  }

  Cavad = {
           http: require('http'),
           io: require('socket.io'),
           system: require('util'),
           XMLHttpRequest: require("./XMLHttpRequest").XMLHttpRequest,
          };

  Cavad.server = Cavad.http.createServer(function(req, res){
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('<h1>cavad socket server</h1>');
    res.end();
  });

  //非同期通信用
  Cavad.xhr = new Cavad.XMLHttpRequest();

  //node.js クライアントオブジェクト
  Cavad.client;

  //待ち受けポートの指定
  Cavad.server.listen(8080);

  //ソケットIOサーバをlisten
  Cavad.socket = Cavad.io.listen(Cavad.server);

  //クライアントのユーザーネーム(文字)とセッションID(数字)
  Cavad.usernameAndSessionId = [];
  //クライアントのユーザID(数字)とセッションID(数字)
  Cavad.useridAndSessionId = [];
  //クライアントに送信するjsonデータ
  Cavad.jsonSendData;
  //クライアントから受信するjsonデータ
  Cavad.jsonReceiveData;

  //クライアントからの接続要求ハンドラ
  Cavad.socket.on('connection', function(client) {
    Cavad.client = client;
  
    //クライアント側からのデータ受信ハンドラ
    client.on('message', function(message) {
      //データを受信できたら
      if (message) {
        Cavad.system.puts(message);
        //JSON文字列をJSONオブジェクトに変換
        Cavad.jsonReceiveData = JSON.parse(message);
        //受信したJSONデータのactionをチェック(正しいJSONデータを受信できている事を確認)
        if(Cavad.jsonReceiveData.data[0].action) {
          //受信したデータの種類によって処理を振り分ける
          switch (Cavad.jsonReceiveData.data[0].action) {
            //クライアントからの接続要求
            case 'connect_request':
              Cavad.xhr.open();
              //認証(渡されたアクセストークンでユーザ名を取得できるかどうか)
              Cavad.xhr.open('GET', 'https://graph.facebook.com/me?access_token=' + Cavad.jsonReceiveData.data[0].access_token);
              Cavad.xhr.send();
            break;
            //クライアントからのチャットメッセージ
            case 'send_message':
              Cavad.jsonSendData = {'data':[{
                                     //送信するメッセージの種類
                                     'action':'send_message',
                                     //ユーザネーム
                                     'user_name':Cavad.usernameAndSessionId[client.sessionId],
                                     //ユーザID
                                     'user_id':Cavad.useridAndSessionId[client.sessionId],
                                     //メッセージ
                                     'text':Cavad.jsonReceiveData.data[0].text,
                                     //時刻
                                     'date':getCurrentTime(),
                                     }]
                                   };
              Cavad.system.puts(JSON.stringify(Cavad.jsonSendData));
              client.send(JSON.stringify(Cavad.jsonSendData));
              client.broadcast(JSON.stringify(Cavad.jsonSendData));
            break;
          } // -End switch-
        } // -End アクションをチェック-
      } // -End データを受信できたら-
  }); // -End クライアントからのデータ受信ハンドラ-

  //クライアントから渡されたアクセストークンを使って認証する処理
  Cavad.xhr.onreadystatechange = function() {
    if (this.readyState == 4) {
      var JsonObject = JSON.parse(this.responseText);
      //渡されたアクセストークンでユーザ名を取得できた場合
      var name = JsonObject.id
      if (name) {
        //ユーザ名とセッションIDを連想配列に格納
        Cavad.usernameAndSessionId[client.sessionId] = JsonObject.name;
        
        //ユーザidとセッションIDを連想配列に格納
        Cavad.useridAndSessionId[client.sessionId] = JsonObject.id;

        //接続してきたクライアントにセッションIDとユーザーネームとユーザーIDを送信
        Cavad.jsonSendData = {'data':[{
                                 //送信するメッセージの種類
                                 'action':'connect_ok',
                                 //セッションID
                                 'session_id':client.sessionId,
                                 //facebookユーザネーム
                                 'user_name':Cavad.usernameAndSessionId[client.sessionId],
                                 //facebookユーザID
                                 'user_id':Cavad.useridAndSessionId[client.sessionId]
                                 }]
                             };
        client.send(JSON.stringify(Cavad.jsonSendData));
        Cavad.system.puts(JSON.stringify(Cavad.jsonSendData));
        
        //接続してきたクライアントと他のクライアントに接続したユーザーと接続メッセージを送信
        Cavad.jsonSendData = {'data':[{
                                 //送信するメッセージの種類
                                 'action':'user_connect',
                                 //ユーザネーム
                                 'user_name':Cavad.usernameAndSessionId[client.sessionId],
                                 //ユーザID
                                 'user_id':Cavad.useridAndSessionId[client.sessionId],
                                 //メッセージ
                                 'text':'が接続しました。',
                                 //時刻
                                 'date':getCurrentTime(),
                                 }]
                             };
        client.send(JSON.stringify(Cavad.jsonSendData));
        client.broadcast(JSON.stringify(Cavad.jsonSendData));
        
        sendUserlist();
      }
    }
  };

    //クライアント切断時のハンドラ
    client.on('disconnect', function() {
      //接続してきたクライアントと他のクライアントに接続したユーザーと接続メッセージを送信
      Cavad.jsonSendData = {'data':[{
                             //送信するメッセージの種類
                             'action':'user_disconnect',
                             //ユーザネーム
                             'user_name':Cavad.usernameAndSessionId[client.sessionId],
                             //ユーザID
                             'user_id':Cavad.useridAndSessionId[client.sessionId],
                             //メッセージ
                             'text':'が切断しました。',
                             //時刻
                             'date':getCurrentTime(),
                             }]
                           };
      client.send(JSON.stringify(Cavad.jsonSendData));
      client.broadcast(JSON.stringify(Cavad.jsonSendData));

      //ユーザ名とセッションIDを連想配列から削除
      delete Cavad.usernameAndSessionId[client.sessionId];        
      //ユーザidとセッションIDを連想配列から削除
      delete Cavad.useridAndSessionId[client.sessionId];

      sendUserlist();
    });


  }); // -クライアントからの接続要求ハンドラ-


  //接続中のユーザ一覧をクライアントに送信
  function sendUserlist() {
    var userlist = '';
    for (var i in Cavad.usernameAndSessionId) {
      userlist += '<div><a href="http://www.facebook.com/'
        + Cavad.useridAndSessionId[i]
        + '"><img src="https://graph.facebook.com/'
        + Cavad.useridAndSessionId[i]
        + '/picture" width="20" height="20">'
        + Cavad.usernameAndSessionId[i]
        + '</a></div>';
    };

    //接続してきたクライアントと他のクライアントに接続したユーザーと接続メッセージを送信
    Cavad.jsonSendData = {'data':[{
                           //送信するメッセージの種類
                           'action':'userlist_update',
                           //メッセージ
                           'userlist':userlist,
                           }]
                         };
    Cavad.client.send(JSON.stringify(Cavad.jsonSendData));
    Cavad.client.broadcast(JSON.stringify(Cavad.jsonSendData));
  };


  //現在時刻取得（yyyy/mm/dd hh:mm:ss）
  function getCurrentTime() {
    var now = new Date();
    var res = "" + now.getFullYear() + "/" + padZero(now.getMonth() + 1) + 
              "/" + padZero(now.getDate()) + " " + padZero(now.getHours()) + ":" + 
              padZero(now.getMinutes()) + ":" + padZero(now.getSeconds());
    return res;
  }

  //先頭ゼロ付加
  function padZero(num) {
    var result;
    if (num < 10) {
      result = "0" + num;
    } else {
      result = "" + num;
    }
    return result;
  }

// -end-
})();