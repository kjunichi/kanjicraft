// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')

const path = require('path')
const WebSocket = require('ws')
const appExp = require('express')()
const server = require('http').Server(appExp)
const uuid = require('uuid/v4')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

const createWindow = () => {
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
    mainWindow.loadFile('init.html')

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
    })
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
    })
}

// ユーザー発言時のイベント登録用JSON文字列を生成する関数
const subscribePlayerChatEventCommand = () => {
    return JSON.stringify({
        "body": {
            "eventName": "PlayerMessage"
        },
        "header": {
            "requestId": uuid(), // UUID
            "messagePurpose": "subscribe",
            "version": 1,
            "messageType": "commandRequest"
        }
    })
}

const wss = new WebSocket.Server({ server });

// マイクラ側からの接続時に呼び出される関数
wss.on('connection', socket => {
    const myPos = {x:0,y:0,z:0}
    console.log('user connected')

    mainWindow.loadFile('index.html')

    const sleep = (time) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve()
            }, time)
        })
    }

    const plotKanji = async (data) => {
        console.dir(data)

        socket.send(tpCommand('', '~0', '~0', '~0'))
        await sleep(1000)
        const height = data.length
        for (let y = height; y > 0; y--) {
            const line = data[height - y].split('')
            for (let x = 0; x < line.length; x++) {
                if (line[x] === '1') {
                    // 石ブロックを配置するリクエストを送信
                    socket.send(setBlockCommand(`${myPos.x + x}`, `${myPos.y + y}`, `${myPos.z}`, 'stonebrick'))
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
    socket.send(subscribePlayerChatEventCommand())

    // 各種イベント発生時に呼ばれる関数
    socket.on('message', packet => {
        console.log('Message Event')
        console.log(packet);
        const res = JSON.parse(packet);

        if (res.header.messagePurpose === 'commandResponse' && res.body.destination != null) {
            myPos.x = res.body.destination.x|0
            myPos.y = res.body.destination.y|0
            myPos.z = res.body.destination.z|0
        }
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
        }
    })

})

server.listen(3000, () => {
    console.log('listening on *:3000');
})