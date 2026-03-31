const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const pino = require("pino")
const axios = require("axios")
const qrcode = require("qrcode-terminal")

const prefix = "batman"

async function startBot(){

const { state, saveCreds } = await useMultiFileAuthState("./auth")

const sock = makeWASocket({
auth: state,
logger: pino({ level: "silent" })
})

sock.ev.on("creds.update", saveCreds)

sock.ev.on("connection.update", ({ qr }) => {
if(qr){
qrcode.generate(qr, { small: true })
}
})

// MESSAGE
sock.ev.on("messages.upsert", async ({ messages }) => {

const m = messages[0]
if(!m.message) return

const msg =
m.message.conversation ||
m.message.extendedTextMessage?.text

const from = m.key.remoteJid
const sender = m.key.participant || from

if(!msg) return

// STATUS VIEW
if(from === "status@broadcast"){
console.log("Status viewed")
}

// GROUP CONTROL
if(from.endsWith("@g.us")){

const group = await sock.groupMetadata(from)
const desc = group.desc || ""

// Anti Link
if(desc.includes("No link")){
if(msg.includes("http")){
await sock.sendMessage(from,{
text:"🚫 Link phal lo"
})

await sock.groupParticipantsUpdate(
from,
[sender],
"remove"
)
}
}

// Anti Spam
if(desc.includes("No spam")){
if(msg.length > 400){
await sock.sendMessage(from,{
text:"🚫 Spam phal lo"
})
}
}

// Admin Only
if(desc.includes("Admin only")){

const admins = group.participants
.filter(p => p.admin !== null)
.map(p => p.id)

if(!admins.includes(sender)){
return
}

}

}

// BATMAN AI
if(msg.toLowerCase().startsWith(prefix)){

const question = msg.slice(prefix.length).trim()

try{

const ai = await axios.get(
`https://api.popcat.xyz/chatbot?msg=${question}&owner=Madara&botname=BatmanMizo`
)

await sock.sendMessage(from,{
text: ai.data.response
})

}catch(e){
console.log(e)
}

}

// MENU
if(msg === "batman menu"){
await sock.sendMessage(from,{
text:
`🦇 BATMAN MIZO BOT

batman [question]
batman tagall
batman help
batman admin
`
})
}

// TAG ALL
if(msg === "batman tagall"){

let group = await sock.groupMetadata(from)
let members = group.participants

let text = "🦇 Tag All\n\n"

for(let mem of members){
text += `@${mem.id.split("@")[0]}\n`
}

await sock.sendMessage(from,{
text,
mentions: members.map(a => a.id)
})

}

})

// AUTO WELCOME
sock.ev.on("group-participants.update", async (data)=>{

if(data.action === "add"){
await sock.sendMessage(data.id,{
text:"🦇 Welcome to Batman Group"
})
}

})

}

startBot()
