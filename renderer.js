// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const { ipcRenderer } = require('electron')

ipcRenderer.on('asynchronous-reply', (event, arg) => {
  console.log(arg) // prints "pong"
})

const genFontData = (moji) => {
  const target = moji
  const fsize = 32
  const cs = document.getElementById("cs")
  cs.width = fsize
  cs.height = fsize + 2
  const ctx = cs.getContext("2d")
  ctx.font = `${fsize}px "UD Digi Kyokasho N-R"`
  ctx.textBaseline = "bottom"
  ctx.fillText(target, 0, fsize + 1);
  const simg = ctx.getImageData(0, 0, cs.width, cs.height)
  const img = document.createElement("img");
  img.src = cs.toDataURL("image/png");

  const cs2 = document.getElementById("cs2")
  cs2.width = cs.width * 4
  cs2.height = cs.height * 4
  const ctx2 = cs2.getContext("2d")

  ctx2.drawImage(img, 0, 0, cs2.width, cs2.height)

  const limage = ctx.getImageData(0, 0, cs.width, cs.height)

  let pidx = 0
  console.log(`${cs.width},${cs.height}`)
  let buf = []
  for (let y = 0; y < cs.height; y++) {

    let line = ""
    for (let x = 0; x < cs.width; x++) {
      if (limage.data[pidx + 3] > 100) {
        line += "1"
      } else {
        line += "0"
      }
      pidx += 4
    }
    console.log(`${line}`)
    buf.push(line)
  }
  const out = document.getElementById("out")
  out.value = buf.length + "\n"
  out.value += buf
  ipcRenderer.send('kanji', { res: buf })

}

const main = () => {
  const btn = document.getElementById("btn")
  //btn.innerHTML = "Gen"
  btn.addEventListener("click", () => {
    const moji = document.getElementById("moji").value
    genFontData(moji)
  }, false)
}

window.onload = main()