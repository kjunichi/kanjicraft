// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain } = require('electron')

const path = require('path')
const WebSocket = require('ws')
const appExp = require('express')()
const server = require('http').Server(appExp)
const uuid = require('uuid/v4')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// setblockコマンドリクエスト用JSON文字列を生成する関数
const setBlockCommand = (x, y, z, blockType) => {
  return JSON.stringify({
      "body": {
          "origin": {
              "type": "player"
          },
          "commandLine": `setblock ${x} ${y} ${z} ${blockType}`,
          "version": 1
      },
      "header": {
          "requestId": uuid(),
          "messagePurpose": "commandRequest",
          "version": 1,
          "messageType": "commandRequest"
      }
  });
}


const tpCommand = (sel, x, y, z) => {
  return JSON.stringify({
      "body": {
          "origin": {
              "type": "player"
          },
          "commandLine": `tp ${sel} ${x} ${y} ${z}`,
          "version": 1
      },
      "header": {
          "requestId": uuid(),
          "messagePurpose": "commandRequest",
          "version": 1,
          "messageType": "commandRequest"
      }
  });
}

const testforBlockCommand = (x, y, z, blockType) => {
  return JSON.stringify({
      "body": {
          "origin": {
              "type": "player"
          },
          "commandLine": `testforblock ${x} ${y} ${z} ${blockType}`,
          "version": 1
      },
      "header": {
          "requestId": uuid(),
          "messagePurpose": "commandRequest",
          "version": 1,
          "messageType": "commandRequest"
      }
  });
}

// ユーザー発言時のイベント登録用JSON文字列を生成する関数
const subscribePlayerChatEventCommand = () => {
  return JSON.stringify({
      "body": {
          "eventName": "PlayerMessage"
          //"eventName": "PlayerChat"
      },
      "header": {
          "requestId": uuid(), // UUID
          "messagePurpose": "subscribe",
          "version": 1,
          "messageType": "commandRequest"
      }
  });
}

const wss = new WebSocket.Server({server});

// マイクラ側からの接続時に呼び出される関数
wss.on('connection', socket => {
  console.log('user connected')

  const sleep = (time) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, time)
    })
  }

  const plotKanji = async (data) => {
    console.dir(data)
    
      const height = data.length
      for(let y = height; y>0; y--) {
        const line = data[height-y].split('')    
        for(let x = 0; x < line.length;x++) {
          if(line[x]==='1') {
            // 石ブロックを配置するリクエストを送信
            socket.send(setBlockCommand(`~${x}`, `~${y}`, '~1', 'stonebrick'))
          }
          await sleep(100)
        }
      }
    
  }

  ipcMain.on('kanji', (event, arg) => {
    console.log(arg) // prints "ping"s
    plotKanji(arg.res)
    event.reply('asynchronous-reply', 'pong')
  })
  

  // ユーザー発言時のイベントをsubscribe
  socket.send(subscribePlayerChatEventCommand());

  // 各種イベント発生時に呼ばれる関数
  socket.on('message', packet => {
      console.log('Message Event');
      console.log(packet);
      const res = JSON.parse(packet);

      // ユーザーが「build」と発言した場合だけ実行
      if (res.header.messagePurpose === 'event' && res.body.properties.Sender !== '外部') {
  
          if (res.body.eventName === 'PlayerMessage' && res.body.properties.Message.startsWith('build')) {
              console.log('start build');

              // 石ブロックを配置するリクエストを送信
              socket.send(setBlockCommand('~0', '~0', '~0', 'stonebrick'));
          
          }
          if (res.body.eventName === 'PlayerMessage' && res.body.properties.Message.startsWith('getPos')) {
              console.log('start getPos');
              // リクエストを送信
              socket.send(tpCommand('', '~0', '~0', '~0'));
          
          }
          if (res.body.eventName === 'PlayerMessage' && res.body.properties.Message.startsWith('bar')) {
              console.log('start bar');

              for(let i=0; i < 1000; i++) {
                  // 石ブロックを配置するリクエストを送信
                  socket.send(setBlockCommand('~0', `~-2`, `~${i}`, 'stonebrick'));
                  socket.send(setBlockCommand('~-1', `~-2`, `~${i}`, 'stonebrick'));
                  socket.send(setBlockCommand('~0', `~-1`, `~${i}`, 'golden_rail'));
              }
          }
          if (res.body.eventName === 'PlayerMessage' && res.body.properties.Message.startsWith('test')) {
              console.log('start test')
                  // 石ブロックを配置するリクエストを送信
              socket.send(testforBlockCommand('~0', `~-1`, `~0`, 'stonebrick'));
              
          }
          if (res.body.eventName === 'PlayerMessage' && res.body.properties.Message.startsWith('torus')) {
              console.log('start torus');

              const xmin = -3.0
              const xmax = 3.0
              const ymin = -3.0
              const ymax = 3.0
              const zmin = -3.0
              const zmax = 3.0
      
              const size=200
              
              xstep = ((xmax-xmin)*1.0/size+xmin)-((xmax-xmin)*0.0/size+xmin)
              ystep = ((ymax-ymin)*1.0/size+ymin)-((ymax-ymin)*0.0/size+ymin)
              zstep = ((zmax-zmin)*1.0/size+zmin)-((zmax-zmin)*0.0/size+zmin)
              const plist=[];
              for(let l=0; l < size; l++) {
                  for(let m=0; m < size; m++) {
                      for(let n=0; n < size; n++) {
                          const x = (xmax-xmin)*n/size+xmin
                          const y = (ymax-ymin)*m/size+ymin
                          const z = (zmax-zmin)*l/size+zmin

                          const func1 = (x,y,z) => {
                              const torus = (x,y,z,a,b) => {
                                  return (Math.sqrt(x**2+y**2)-a)**4+(z**4)-b
                              }
                              const sphere = (x,y,z,r) => {
                                  return x*x+y*y+z*z-r
                              }
                              const cylinder = (x,y,z,r) => {
                                  return (3*x)**2+(3*y)**2+(z+1)**18-r
                              }
                              return torus(x,y,z,2,0.01) * sphere(x,y,z,0.65) * cylinder(x,y,z,0.8) * cylinder(x,z,y,0.8)
                          }

                          const func2 = (xx,yy,zz) => {
                              return xx*xx+yy*yy+zz*zz-1.0
                          }

                          p1=func1(x,y,z)
                          p2=func1(x+xstep,y,z)
                          p3=func1(x-xstep,y,z)
                          p4=func1(x,y+ystep,z)	
                          p5=func1(x,y-ystep,z)
                          p6=func1(x,y,z+zstep)
                          p7=func1(x,y,z-zstep)
              
                          if ( !isFill(p2,p3,p4,p5,p6,p7) && p1 <= 0 ) {
                              // 石ブロックを配置するリクエストを送信
                              plist.push([n,l,m])    
                          }
                      }
                  }
              }

              let index = 0;
              const plot = () => {
                  //const[posx,posy,posz]=[49900,63,974]
                  const[posx,posy,posz]=[-size/2,0,-size/2]

                  const [n,l,m] = plist[index]
                  socket.send(setBlockCommand(`~${n+posx}`, `~${l+posy}`, `~${m+posz}`, 'glass'))//'glass')) //'stonebrick'));
                  index++
                  if(index<plist.length) {
                      setTimeout(plot,10)
                  }
                  
              }
              plot()
          }
      }
  })

})

server.listen(3000, () => {
  console.log('listening on *:3000');
})