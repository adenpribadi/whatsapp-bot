# WhatsApp Web API Bot

A simple bot built using [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js), Node.js, and Express to automate sending messages, files, and manage WhatsApp groups. The bot can be integrated with a REST API for easy interaction.

## Features

- Send messages to WhatsApp numbers and groups
- Upload and send files to WhatsApp contacts
- Manage WhatsApp groups by fetching a list of groups and sending messages to them
- Display QR code for WhatsApp Web login
- Simple key-based security for API usage

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/en/download/) (version 12 or higher)
- [npm](https://www.npmjs.com/get-npm) or [yarn](https://yarnpkg.com/)
- WhatsApp account

### Steps

1. Clone the repository:

    ```bash
    git clone https://github.com/adenpribadi/whatsapp-bot.git
    cd whatsapp-bot
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create an `uploads` directory for file uploads:

    ```bash
    mkdir uploads
    ```

4. Run the bot:

    ```bash
    node index.js
    ```

5. Visit `http://localhost:8011` in your browser to scan the QR code for WhatsApp Web login.

## API Endpoints

### 1. Get WhatsApp Groups

**URL:** `/groups`  
**Method:** `GET`  
**Description:** Fetches the list of WhatsApp groups the client is connected to.

**Response:**

```json
[
  {
    "groupName": "Group Name",
    "groupId": "group-id@c.us"
  }
]
```

### 2. Send Message to Group
URL: /sendGroup
Method: POST
Description: Sends a message to a WhatsApp group.

Body:
```json
{
  "group_id": "group-id@c.us",
  "message": "Hello Group",
  "key": "your-client-key"
}
```

### 3. Send Message to Number
URL: /sendMessage
Method: POST
Description: Sends a message to a specific WhatsApp number.

Body:
```json
{
  "number": "628123456789",
  "message": "Hello World!",
  "key": "your-client-key"
}
```

### 4. Send Files to Number
URL: /sendFiles
Method: POST
Description: Upload and send files to a specific WhatsApp number.

Form Data:

target_number: WhatsApp number (e.g. 628123456789)
files: Files to be sent

## Usage
Run the bot and scan the QR code displayed in the terminal.
After scanning, the bot will remain connected and you can start interacting with it via the API.
Use the appropriate API routes to send messages or files.

## File Structure
```plaintext
├── index.js         # Main file that runs the bot
├── public           # Static assets (CSS, images, etc.)
├── uploads          # Directory where uploaded files are temporarily stored
├── package.json     # Node.js dependencies and scripts
└── README.md        # Project documentation
```

## Dependencies
whatsapp-web.js - Library for interacting with WhatsApp Web.
express - Web framework for Node.js.
multer - Middleware for handling file uploads.
qrcode - Generate QR codes.
crypto - Library for generating secure keys.
License
This project is licensed under the MIT License. See the LICENSE file for details.

## Contact
For more information or if you're interested in this project:

Name: vzveda
Email: vzveda@gmail.com
