import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export const sendOtpEmail = async (email, otpCode) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Techaven OTP',
      text: `Your OTP is: ${otpCode}`,
      html: `<p>Your OTP is: <strong>${otpCode}</strong></p>`
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
};

export const sendInvitationEmail = async (email, { owner_name, shop_name, registration_link }) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: `You're invited to manage ${shop_name}`,
      text: `Hello ${owner_name},\n\nYou have been invited to manage the shop "${shop_name}".\nRegister here: ${registration_link}\n\nIf you did not expect this, you can ignore this email.`,
      html: `
        <p>Hello <strong>${owner_name}</strong>,</p>
        <p>You have been invited to manage the shop "<strong>${shop_name}</strong>".</p>
        <p><a href="${registration_link}">Click here to register</a></p>
        <p>If you did not expect this, you can ignore this email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Invitation email error:', error);
    return false;
  }
};

