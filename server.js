var http = require('http'),
    io = require('socket.io'),
 
server = http.createServer(function(req, res){
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write('<h1>サンプルサーバ</h1>');
    res.end();
});
server.listen(8080);
 
var socket = io.listen(server);

socket.on('connection', function(client){
  //クライアント側からmessage受信ハンドラ
  client.on('message', function(message) {

    if(message){

      //XSS対策
      message = message.replace("<", "&lt;");
      message = message.replace(">", "&gt;");
      sendmessage = message.split(",")
        
      //発言者のID
      responseid = '<img class="profileimg" src="https://graph.facebook.com/' + sendmessage[0] + '/picture" />'

      //発言者の名前
      responsename = '<a href="http://www.facebook.com/profile.php?id=' + sendmessage[0] + '" target="_blank">' + sendmessage[1] + '</a>'
    
      //発言された文字
      responsemessage = sendmessage[2];
    
      client.send(responseid + "," + responsename + "," + responsemessage);//自分のブラウザへ
      client.broadcast(responseid + "," + responsename + "," + responsemessage);//他のブラウザへ
    }
  });

  //クライアント切断時のハンドラ
  client.on('disconnect', function(){})
  
});

