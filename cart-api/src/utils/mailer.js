const nodemailer = require('nodemailer');

let transporter;

/**
 * Returns a local transporter (for dev preview only – does not actually send emails over the network)
 */
function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    streamTransport: true, // Keeps messages in-memory rather than sending
    newline: 'unix',
    buffer: true
  });

  return transporter;
}

/**
 * Sends an email and prints the rendered message to console
 */
async function sendMail({ to, subject, text, html }) {
  const tx = getTransporter();

  const info = await tx.sendMail({
    from: '"Cart App" <noreply@cart.app>',
    to,
    subject,
    text,
    html,
  });

  console.log('📧 --- Mail Preview ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('Message:');
  console.log(info.message.toString());
  console.log('-----------------------');
}

module.exports = { sendMail };
