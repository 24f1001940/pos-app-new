const nodemailer = require('nodemailer');

const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const tx = getTransporter();

  if (!tx || !to) {
    return false;
  }

  await tx.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    text,
    html,
  });

  return true;
}

module.exports = {
  sendEmail,
};
