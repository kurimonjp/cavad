(function() {
  if (typeof(Cavad) === 'undefined') {
    Cavad = {
      fblogin:fblogin,
      inputboxenter:inputboxenter,
      pushmessage:pushmessage
    };
  }
  //セッションID
  Cavad.sessionId;
  //ユーザネーム
  Cavad.userName;
  //ユーザID
  Cavad.userId;
  //サーバに送信するjsonデータ
  Cavad.jsonSendData;
  //サーバから受信するjsonデータ
  Cavad.jsonReceiveData;

  Cavad.socket = new io.Socket(null, {port: 8080});
  Cavad.socket.connect();

  // ページロード完了後の処理
  $(function() {
    // ソケットサーバ接続
    Cavad.socket.on('connect', function(message) {
    });
    // ソケットサーバ切断
    Cavad.socket.on('disconnect', function(message) {
      $('#serverstatus').css('background','#FF6A6A').html('<span>Server Disconnected.(※リロードして下さい※)</span>');
    });
    // facebookへのログイン&認証&セッション情報の取得
    fblogin();
  });

  // facebookへのログイン&認証&セッション情報の取得
  function fblogin() {
    // ログインステータスの取得
    FB.getLoginStatus(function(response) {  
      if (response.session) {  // セッションが取れた時
        // ソケットサーバにアクセストークンを送信
        Cavad.jsonSendData = {'data':[{
                               //送信するメッセージの種類
                               'action':'connect_request',
                               //セッションID
                               'access_token':response.session.access_token
                               }]
                             };
        Cavad.socket.send(JSON.stringify(Cavad.jsonSendData));      
      } else {
        // セッションが取れない時はFBの認証ページへリダイレクトする
        var url = 'https://www.facebook.com/dialog/oauth';
        url += '?client_id=' + '150894444976816'; // アプリケーションID
        url += '&redirect_uri=http://kurimon.com/cavad/'; // 認証後に帰ってくるURL
        url += '&display=page'; // 認証画面をページ出すかポップアップで出すか
        url += '&scope=' + 'user_about_me,read_stream,publish_stream'; // 必要な権限
        parent.location.href = url;
      }
    });
  }

  //データ受信ハンドラ
  Cavad.socket.on('message', function(message) {
    //データを受信できたら
    if(message) {
      //JSON文字列をJSONオブジェクトに変換
      Cavad.jsonReceiveData = JSON.parse(message);
      //受信したJSONデータのactionをチェック(正しいJSONデータを受信できている事を確認)
      if(Cavad.jsonReceiveData.data[0].action) {
        //受信したデータの種類によって処理を振り分ける
        switch (Cavad.jsonReceiveData.data[0].action) {
          //ソケットサーバからのメッセージ(接続OK)
          case 'connect_ok':
            //ソケットサーバから受信したセッションID
            Cavad.sessionId = Cavad.jsonReceiveData.data[0].session_id;
            //ソケットサーバから受信したユーザネーム
            Cavad.userName = Cavad.jsonReceiveData.data[0].user_name;
            //ソケットサーバから受信したユーザID
            Cavad.userId = Cavad.jsonReceiveData.data[0].user_id;
            //配列の初期化
            var html = [];
              html.push('<span>Server Connected.(id:');
              html.push(Cavad.userName);
              html.push(')</span>');
            //ステータス画面に接続完了メッセージを表示(例:Server Connected.(id:tanaka taro))  
            $('#serverstatus').css('background','#A2CD5A').html(html.join(''));
          break;
            
          //ソケットサーバからのメッセージ(だれかが接続した)
          case 'user_connect':
          //ソケットサーバからのメッセージ(だれかが接続した)
          case 'user_disconnect':
          //ソケットサーバからのメッセージ(だれかが何か言った)
          case 'send_message':
            //ソケットサーバから受信したユーザID
            Cavad.userId = Cavad.jsonReceiveData.data[0].user_id;  
            //ソケットサーバから受信したユーザネーム
            Cavad.userName = Cavad.jsonReceiveData.data[0].user_name;          
            //ソケットサーバから受信したチャットメッセージ
            Cavad.chatText = Cavad.jsonReceiveData.data[0].text;
            //ソケットサーバから受信した時刻
            Cavad.date = Cavad.jsonReceiveData.data[0].date; 
            
            //ソケットサーバから受信したデータを画面に反映
            $('#updates').prepend(makeHTML(
                                     Cavad.userId, 
                                     Cavad.userName, 
                                     Cavad.chatText, 
                                     Cavad.date
                                     ));
          break;
          
          case 'userlist_update':
          //ソケットサーバからのメッセージ(現在CHに接続しているユーザのリスト)
            Cavad.userList = Cavad.jsonReceiveData.data[0].userlist;
            $('#peoples').html(Cavad.userList);
          break;
          
          default:
          break;
        };
      };
    };
    
    //$("#updates").prepend(sendmessage[0] + " " + sendmessage[1] + " " + sendmessage[2] + '<br>');
  });

  function makeHTML(userid, username, text, timestamp) {
    var html = [];
    html.push('<div class="update">');
    html.push('<div class="upic">');
    html.push('<a href="http://www.facebook.com/profile.php?id=' + userid + '">');
    html.push('<img class="userimg" src="https://graph.facebook.com/' + userid + '/picture" width="50" height="50">');
    html.push('</a>');
    html.push('</div><!-- end upic -->');
    html.push('<div class="ucontent">');
    html.push('<div class="utitle">');
    html.push('<div class="uname">');
    html.push('<a href="http://www.facebook.com/profile.php?id=' + userid + '">' + username + '</a>');
    html.push('</div><!-- end uname -->');
    html.push('<div class="uinfo">');
    html.push('<span class="pin"></span>');
    html.push('<span class="utime">' + timestamp + '</span>');
    html.push('</div><!-- end uinfo -->');
    html.push('</div><!-- end utitle -->');
    html.push('<div class="ustatus">');
    html.push('<span class="utext">' + text + '</span>');
    html.push('</div><!-- end ustatus -->');
    html.push('</div><!-- end ucontent -->');
    html.push('</div><!-- end update-->');
    return html.join('');
  }

  //inputboxでEnterが押された時、ソケットサーバにメッセージをpushする処理
  function inputboxenter(code) {
    //エンターキー押下なら
    if (13 == code) {
      //ソケットサーバにメッセージをpush
      pushmessage();
    }
  }

  //ソケットサーバにメッセージをpushする処理
  function pushmessage() {
    //inputboxが空なら
    if ($('#pushtext').val() == '') {
      //何もしない
    } else {
      //変数にinputboxの値を格納
      pushtext = $('#pushtext').val();
      //inputboxの内容を消去
      $('#pushtext').val('');
      //サーバーにメッセージをpush
      Cavad.jsonSendData = {'data':[{
                               //送信するメッセージの種類
                               'action':'send_message',
                               //セッションID
                               'session_id':Cavad.sessionId,
                               //送信するテキストデータ
                               'text':pushtext
                               }]
                           };
      // console.log(Cavad.jsonSendData.data[0].text);
      // console.log(JSON.stringify(Cavad.jsonSendData));
      Cavad.socket.send(JSON.stringify(Cavad.jsonSendData));
    }
  }
// -end-
})();