const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

// ================= KONFIGURASI =================
const CONFIG = {
    port: process.env.PORT || 3000,
    telegram: {
        enabled: true,
        bot_token: "8730442462:AAG7qxsalOT_WJq7V8Mg-TAAZVh5DDyyGgc", 
        channel_id: "@perdichat_otp_channel"      
    }
};
// ===============================================

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname)));
app.use(express.json());

// --- BOT TELEGRAM SETUP ---
let bot;
if (CONFIG.telegram.enabled && CONFIG.telegram.bot_token) {
    try {
        bot = new TelegramBot(CONFIG.telegram.bot_token, { polling: false });
        console.log('✅ Telegram Bot Connected');
    } catch (e) { console.error('❌ Bot Error:', e.message); }
}

function sensorNomor(nomor) {
    const clean = nomor.replace(/\D/g, '');
    if (clean.length < 10) return clean;
    return clean.substring(0, 4) + 'XXXX' + clean.substring(clean.length - 5);
}

function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

app.post('/api/request-otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Nomor kosong' });

    const otp = generateOTP();
    if (!global.otpStore) global.otpStore = {};
    global.otpStore[phone] = { code: otp, time: Date.now() };

    if (bot) {
        const msg = `🔐 *OTP APK PERDI CHAT*\n\n━━━━━━━━━━━━━━━━━━━━━\n\n*KODE OTP :* \`${otp}\`\n\n*NOMER :* ${sensorNomor(phone)}\n\n━━━━━━━━━━━━━━━━━━━━━\n\n_Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}_`;
        try {
            await bot.sendMessage(CONFIG.telegram.channel_id, msg, { parse_mode: 'Markdown' });
            return res.json({ success: true, message: 'OTP terkirim ke Channel Telegram' });
        } catch (err) {
            return res.json({ success: true, message: 'Gagal kirim Telegram (Cek Log)', otp: otp });
        }
    } else {
        return res.json({ success: true, message: 'Mode Dev (Telegram mati)', otp: otp });
    }
});

app.post('/api/verify-otp', (req, res) => {
    const { phone, otp } = req.body;
    if (!global.otpStore || !global.otpStore[phone]) {
        return res.status(400).json({ success: false, message: 'OTP tidak ditemukan/kadaluarsa' });
    }
    if (global.otpStore[phone].code === otp) {
        delete global.otpStore[phone];
        return res.json({ success: true, message: 'Login Berhasil' });
    } else {
        return res.status(400).json({ success: false, message: 'OTP Salah' });
    }
});

io.on('connection', (socket) => {
    socket.on('join-room', (userId) => {
        socket.join(userId);
    });

    socket.on('send-message', (data) => {
        io.to(data.to).emit('receive-message', data);
    });
});

server.listen(CONFIG.port, '0.0.0.0', () => {
    console.log(`🚀 Perdi Chat berjalan di port ${CONFIG.port}`);
});
