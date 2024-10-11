const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const multer = require('multer');
const qrcode = require('qrcode-terminal');
const qrcodeImage = require('qrcode');
const express = require('express');
const crypto = require('crypto'); // Library untuk menghasilkan key acak
const app = express();
const port = 8011;

// Configure multer storage to keep the original filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Destination folder
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Use the original filename
  }
});

// Use the configured storage in multer
const getFile = multer({ storage }).array('files'); // Allow multiple files;

// Serve static files (for CSS, images, etc.)
app.use(express.static('public'));
// Use middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Endpoint untuk mendapatkan daftar group ID
app.get('/groups', async (req, res) => {
  console.log('Checking if client is ready...');
  
  if (!isClientReady) {
    console.log('Client is not ready');
    return res.status(500).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Fetching chats...');
    const chats = await client.getChats();
    console.log('Chats fetched successfully.');

    const groups = chats
      .filter(chat => chat.isGroup) // Filter hanya grup
      .map(chat => ({
        groupName: chat.name,
        groupId: chat.id._serialized
      }));

    // Menampilkan grup name dan grup id di konsol
    console.log('Daftar Grup:');
    groups.forEach(group => {
      console.log(`Group Name: ${group.groupName}, Group ID: ${group.groupId}`);
    });

    res.json(groups); // Kirim respons dalam format JSON
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Endpoint untuk mengirim pesan ke grup menggunakan POST request
app.post('/sendGroup', async (req, res) => {
  const { group_id, message, key } = req.body; // Ambil parameter dari body

  // Validasi input
  if (!group_id || !message || !key) {
    return res.status(400).send('Missing parameters: group_id or message');
  }

  // Validasi key
  if (key !== clientKey) {
    return res.status(403).send('Invalid key provided');
  }

  // Cek apakah klien siap
  if (!isClientReady) {
    console.log('Client is not ready');
    return res.status(500).send('Unauthorized');
  }

  try {
    const startTime = Date.now();
    const chat = await client.getChatById(group_id);
    const endTime = Date.now();
    console.log(`Time taken to fetch chat: ${endTime - startTime} ms`);

    await chat.sendMessage(message);
    res.status(200).send(`Message sent to group ${group_id}: ${message}`);
  } catch (error) {
    console.error('Error sending message to group:', error);
    res.status(500).send('Error sending message to group');
  }
});

// Route to send a message via GET request
app.post('/sendMessage', (req, res) => {
  const { number, message, key } = req.body; // Ambil parameter dari body

  // Validasi input
  if (!number || !message || !key) {
    return res.status(400).send('Please provide number, message, and key in the request body');
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


// Endpoint to handle send files
app.post('/sendFiles', (req, res) => {
  getFile(req, res, async (err) => {
    if (isClientReady) {
      if (err) {
        console.log(err)
        return res.status(500).json({ error: 'Error uploading files.' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const targetNumber = req.body.target_number; // Get target number from form data

      // Use Promise.all to send all images
      const results = await Promise.all(
        req.files.map(file => sendFileToTarget(file.path, targetNumber))
      );

      // Cleanup: Remove files after sending
      req.files.forEach(file => fs.unlinkSync(file.path));

      if (results.every(result => result)) {
        res.status(200).json({ message: 'File sent successfully!' });
      } else {
        res.status(500).json({ error: 'Failed to send some images.' });
      }
    } else {
      res.status(500).json({ error: 'Unauthorized' });
    }
  });
});

// Function to send the image via WhatsApp
async function sendFileToTarget(filePath, targetNumber) {
  try {
    const media = MessageMedia.fromFilePath(filePath);
    await client.sendMessage(`${targetNumber}@c.us`, media);
    console.log('Image sent successfully!');
    return true;
  } catch (error) {
    console.error('Failed to send image:', error);
    return false;
  }
}


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

          <a href="/docs" class="btn">Documentation</a>
          <pre style='padding: 20px 0px 10px 0px;'>Use by: ${clientName} (${clientNumber})</pre> <!-- Menampilkan objek dengan format yang rapi -->
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

// Route for API documentation
app.get('/docs', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Documentation - WhatsApp Bot</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          h1 {
            text-align: center;
            color: #333;
          }
          h2 {
            color: #444;
            border-bottom: 2px solid #ddd;
            padding-bottom: 5px;
          }
          p, pre, ul {
            color: #555;
          }
          ul {
            padding-left: 20px;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 14px;
            color: #999;
          }
          .code-block {
            background-color: #f1f1f1;
            padding: 10px;
            border-radius: 5px;
            font-family: 'Courier New', Courier, monospace;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>WhatsApp Bot API Documentation</h1>

          <h2>Endpoints:</h2>

          <h3>1. Send Message</h3>
          <p>Send a text message to a specific number.</p>
          <ul>
            <li><strong>Method:</strong> POST</li>
            <li><strong>URL:</strong> /sendMessage</li>
            <li><strong>Body:</strong></li>
            <pre class="code-block">
{
  "number": "1234567890",
  "message": "Hello!",
  "key": "your-client-key"
}
            </pre>
          </ul>

          <h3>2. Send Message to Group</h3>
          <p>Send a message to a WhatsApp group using group ID.</p>
          <ul>
            <li><strong>Method:</strong> POST</li>
            <li><strong>URL:</strong> /sendGroup</li>
            <li><strong>Body:</strong></li>
            <pre class="code-block">
{
  "group_id": "group-id",
  "message": "Hello, group!",
  "key": "your-client-key"
}
            </pre>
          </ul>

          <h3>3. Get Groups</h3>
          <p>Get a list of all WhatsApp groups the client is part of.</p>
          <ul>
            <li><strong>Method:</strong> GET</li>
            <li><strong>URL:</strong> /groups</li>
          </ul>

          <h3>4. Send Files</h3>
          <p>Upload and send files to a specific number.</p>
          <ul>
            <li><strong>Method:</strong> POST</li>
            <li><strong>URL:</strong> /sendFiles</li>
            <li><strong>Form Data:</strong></li>
            <pre class="code-block">
{
  "target_number": "1234567890",
  "files": [file1, file2, ...],
  "key": "your-client-key"
}
            </pre>
          </ul>

          <h3>5. Register Client</h3>
          <p>Display QR code for WhatsApp client registration.</p>
          <ul>
            <li><strong>Method:</strong> GET</li>
            <li><strong>URL:</strong> /register</li>
          </ul>

          <div class="footer">
            <p>&copy; 2024 WhatsApp Bot - Powered by Node.js & WhatsApp Web API</p>
          </div>
        </div>
      </body>
    </html>
  `);
});



// Start Express Server
app.listen(port, () => { console.log(`Server is running on http://localhost:${port}`) });

// Get Message
//client.on('message', message => {
//  console.log(`Message received: ${message.body}`);
//});

// when disconnet
client.on('disconnected', (reason) => {
  console.log('WhatsApp Web disconnected!', reason);
  if (reason === 'CONFLICT' || reason === 'UNPAIRED' || reason === 'UNPAIRED_IDLE') {
    console.log('WhatsApp session is no longer valid.');
  }
  clientKey = ''
  isClientReady = false; // QR code berubah, berarti belum terhubung
  client.destroy();
  client.initialize();
});

// Initialize WhatsApp Client
client.initialize();

