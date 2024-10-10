const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const qrcodeImage = require('qrcode');
const express = require('express');
const crypto = require('crypto'); // Library untuk menghasilkan key acak
const app = express();
const port = 8011;

// Serve static files (for CSS, images, etc.)
app.use(express.static('public'));

let qrCodeString = ''; // Variabel untuk menyimpan QR code string
let isClientReady = false; // Variabel untuk melacak status koneksi
let clientKey = ''; // Variabel untuk menyimpan key client setelah berhasil register

// Initialize WhatsApp Client
const client = new Client({
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', qr => {
  // Generate and save QR code string
  qrCodeString = qr;
  isClientReady = false; // QR code berubah, berarti belum terhubung
  // Generate and display the QR code in the terminal
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp Client is ready!');
  isClientReady = true; // Koneksi berhasil, tidak perlu QR code lagi
});

// Route to send a message via GET request
app.get('/send', (req, res) => {
  const number = req.query.number;
  const message = req.query.message;
  const key = req.query.key; // Tambahkan query parameter untuk key

  if (!number || !message || !key) {
    return res.status(400).send('Please provide number, message, and key query parameters');
  }

  // Validasi key
  if (key !== clientKey) {
    return res.status(403).send('Invalid key provided');
  }

  const chatId = number + '@c.us';

  client.sendMessage(chatId, message).then(response => {
    if (response.id.fromMe) {
      console.log(`Message successfully sent to ${number}`);
      res.status(200).send(`Message sent to ${number}: ${message}`);
    }
  }).catch(err => {
    console.error('Failed to send message: ', err);
    res.status(500).send('Failed to send message');
  });
});

// Route for landing page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WhatsApp Bot</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="container">
          <h1>Welcome to WhatsApp Bot</h1>
          <p>This bot allows you to send messages via WhatsApp Web API.</p>
          <a href="/register" class="btn">Scan QR Code to Connect</a>
          <p>Once connected, you can use this bot to send messages by using the appropriate routes.</p>

          <div class="contact-info">
            <h2>Contact Me</h2>
            <p>If you're interested in this project or need more information, feel free to contact:</p>
            <p><strong>Name:</strong> vzveda</p>
            <p><strong>Email:</strong> vzveda@gmail.com</p>
          </div>

          <div class="footer">Powered by Node.js & WhatsApp Web API</div>
        </div>
      </body>
    </html>
  `);
});

// Route to display the QR code as an image, with auto-refresh
app.get('/register', (req, res) => {
  if (isClientReady) {
    // Jika klien WhatsApp sudah terhubung, ambil informasi klien
    const clientInfo = client.info;
    const clientNumber = clientInfo.wid.user; // Ambil nomor user
    const clientName = clientInfo.pushname; // Ambil nama user

    // Generate random key for this client
    if (clientKey == '') {
      clientKey = crypto.randomBytes(16).toString('hex'); // Buat key acak
    
      // Kirim pesan ke klien setelah terhubung
      const chatId = clientNumber + '@c.us'; // Format nomor dengan @c.us
      const message = `Hello ${clientName}, welcome! Your key is: ${clientKey}`;

      client.sendMessage(chatId, message).then(response => {
        console.log(`Message sent to ${clientName} (${clientNumber}): ${message}`);
      }).catch(err => {
        console.error('Failed to send message: ', err);
      });
    }

    // Tampilkan pesan sukses koneksi beserta informasi klien
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WhatsApp Bot</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div class="container">
          <h1>WhatsApp Client is connected!</h1>
          <p>You can now send messages via WhatsApp.</p>
          <pre>Use by: ${clientName} (${clientNumber})</pre> <!-- Menampilkan objek dengan format yang rapi -->
        </div>
      </body>
    </html>
    `);
  } else if (qrCodeString) {
    // Generate QR code image if client is not connected yet
    qrcodeImage.toDataURL(qrCodeString, (err, url) => {
      if (err) {
        return res.status(500).send('Failed to generate QR code');
      }
      // Display the QR code as an image in the browser with auto-refresh every 10 seconds
      res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>WhatsApp Bot</title>
          <link rel="stylesheet" href="/style.css">
        </head>
        <body>
          <div class="container">
            <h1>Scan the QR Code to register:</h1>
            <img src="${url}" />
            <p>QR Code refreshes automatically until connected.</p>
            <script>
              setTimeout(function(){
                window.location.reload(1);
              }, 10000); // Refresh the page every 10 seconds
            </script>
          </div>
        </body>
      </html>
      `);
    });
  } else {
    res.send('QR Code is not available yet. Please wait.');
  }
});


// Start Express Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Get Message
//client.on('message', message => {
//  console.log(`Message received: ${message.body}`);
//});

// Initialize WhatsApp Client
client.initialize();

