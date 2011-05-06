var http = require('http'),
    io = require('socket.io');
server = http.createServer(function(req, res){
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('<h1>サンプルサーバ</h1>');
    res.end();
});
server.listen(8080);
 
var socket = io.listen(server);
var sys = require('util');
var XMLHttpRequest = require("./XMLHttpRequest").XMLHttpRequest;
var xhr = new XMLHttpRequest();

var username_and_sessionid = [];

var chatlogs = [];

socket.on('connection', function(client) {
  //クライアント側からmessage受信ハンドラ
  client.on('message', function(message) {
    if (message) {

      //XSS対策
      message = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
      sendmessage = message.split(";");
      
      //受信データの種類によって処理を振り分ける
      switch (sendmessage[0]) {
        //クライアントからの接続要求
        case 'connection':
          //認証(渡されたアクセストークンでユーザ名を取得できるかどうか)
          xhr.open('GET', 'https://graph.facebook.com/me?access_token=' + sendmessage[1]);
          xhr.send();
          break;
        //すべてのクライアントに受信したメッセージを送信
        case 'sendmessage':
          //チャットログを保存
          chatlogs.unshift('sendmessage;;' + username_and_sessionid[sendmessage[1]] + ';' + sendmessage[3] + ';' + getCurrentTime());
          if (chatlogs.length > 20) {
            chatlogs.pop();
          }
          client.send('sendmessage;;' + username_and_sessionid[sendmessage[1]] + ';' + sendmessage[3] + ';' + getCurrentTime());
          client.broadcast('sendmessage;;' + username_and_sessionid[sendmessage[1]] + ';' + sendmessage[3] + ';' + getCurrentTime());
          //デバック用
          sys.puts(chatlogs.length);
        default:
          break;
      }
    }
  });

  xhr.onreadystatechange = function() {
    if (this.readyState == 4) {
      var JsonObject = JSON.parse(this.responseText);
      //渡されたアクセストークンでユーザ名を取得できた場合
      if (JsonObject.username) {
        //ユーザ名とセッションIDを連想配列に格納
        username_and_sessionid[client.sessionId] = JsonObject.username;
        
        //接続したクライアントにセッションIDとユーザーネームを送信
        client.send('connectionok;' + client.sessionId + ';' + JsonObject.username);

        //接続したクライアントに最近の過去ログを送信
        for (var i = 0;i < chatlogs.length; i ++){
          client.send(chatlogs[chatlogs.length - i]);
        }

        //すべてのクライアントに接続したユーザーと接続メッセージを送信
        client.send('userconnect;' + client.sessionId + ';' + JsonObject.username + '; が接続しました。;' + getCurrentTime());
        client.broadcast('userconnect;' + client.sessionId + ';' + JsonObject.username + '; が接続しました。;' + getCurrentTime());
        
        sendUserlist();
      }
    }
  };

  //クライアント切断時のハンドラ
  client.on('disconnect', function() {
    //ユーザネームが取得できた時だけ切断メッセージをブロードキャストする
    if( username_and_sessionid[client.sessionId] != undefined ) {
      client.broadcast('userdisconnect;' + client.sessionId + ';' + username_and_sessionid[client.sessionId] + '; <strong>が切断しました。</strong>;' + getCurrentTime());
      sys.puts('userdisconnect;' + client.sessionId + ';' + username_and_sessionid[client.sessionId] + '; <strong>が切断しました。</strong>;' + getCurrentTime());
    }
    delete username_and_sessionid[client.sessionId];
    sendUserlist();
  });

  //接続中のユーザ一覧をクライアントに送信
  function sendUserlist() {
    var userlist = '';
    for(var i in username_and_sessionid){
      userlist += '<div><a class="nojs" href="http://www.facebook.com/' + username_and_sessionid[i] + '"><img src="https://graph.facebook.com/' + username_and_sessionid[i] + '/picture" width="20" height="20">' + username_and_sessionid[i] + '</a></div>';
    }
    client.send('userlist;;;;' + getCurrentTime() + ';' + userlist);
    client.broadcast('userlist;;;;' + getCurrentTime() + ';' + userlist);
  }
});

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

