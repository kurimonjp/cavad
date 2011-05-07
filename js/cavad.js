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
  Cavad.username;

  Cavad.socket = new io.Socket(null, {port: 8080});
  Cavad.socket.connect();

  // ページロード完了後の処理
  $(function() {
    // ソケットサーバ接続
    Cavad.socket.on('connect', function(message) {
    });
    // ソケットサーバ切断
    Cavad.socket.on('disconnect', function(message) {
      $('#serverstatus').css('background','#FF6A6A').html('<span>Server Disconnected.(※リロードして下さい)</span>');
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
        Cavad.socket.send('connection' + ';' + response.session.access_token + ';');      
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
    var sendmessage = message.split(';');
    if (sendmessage[0]) {
      switch (sendmessage[0]) {
        //ソケットサーバからの接続OKメッセージ
        case 'connectionok':
          //ソケットサーバから渡されたセッションIDを格納
          Cavad.sessionId = sendmessage[1];
          //ソケットサーバから渡されたユーザネームを格納
          Cavad.username = sendmessage[2];
          
          var html = [];
          html.push('<span>Server Connected.(id:');
          html.push(Cavad.username);
          html.push(')</span>');
          $('#serverstatus').css('background','#A2CD5A').html(html.join(''));
          break;
        case 'userconnect':
        case 'userdisconnect':
        case 'sendmessage':
          console.log(sendmessage);
          $('#updates').prepend(makeHTML(sendmessage[6], sendmessage[2], sendmessage[3], sendmessage[4]));
          break;
        case 'userlist':
          $('#peoples').html(sendmessage[5]);
          break;
        default:
          break;
      }
    } else {
    }
    //$("#updates").prepend(sendmessage[0] + " " + sendmessage[1] + " " + sendmessage[2] + '<br>');
  });

  function makeHTML(userid, username, text, timestamp) {
    var html = [];
    html.push('<div class="update">');
    html.push('<div class="upic">');
    html.push('<a class="nojs" href="http://www.facebook.com/profile.php?id=' + userid + '">');
    html.push('<img class="userimg" src="https://graph.facebook.com/' + userid + '/picture" width="50" height="50">');
    html.push('</a>');
    html.push('</div><!-- end upic -->');
    html.push('<div class="ucontent">');
    html.push('<div class="utitle">');
    html.push('<div class="uname">');
    html.push('<a class="nojs" href="http://www.facebook.com/profile.php?id=' + userid + '">' + username + '</a>');
    html.push('</div><!-- end uname -->');
    html.push('<div class="uinfo">');
    html.push('<span class="pin"></span>');
    html.push('<span class="utime" ct="1304492441">' + timestamp + '</span>');
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
    if ($('#pushtext').val() == "") {
      //何もしない
    } else {
      //変数にinputboxの値を格納
      pushtext = $('#pushtext').val();
      //inputboxの内容を消去
      $('#pushtext').val("");
      //サーバーにメッセージをpush
      Cavad.socket.send('sendmessage;' + Cavad.sessionId + ";;" + pushtext);
    }
  }
})();