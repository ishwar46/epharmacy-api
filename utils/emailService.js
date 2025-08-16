const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

class EmailService {
    constructor() {
        // Debug environment variables


        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async loadTemplate(templateName, variables = {}) {
        try {
            const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
            let template = await fs.readFile(templatePath, 'utf8');

            // Replace variables in template
            Object.keys(variables).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                template = template.replace(regex, variables[key]);
            });

            return template;
        } catch (error) {
            console.error('Error loading email template:', error);
            throw new Error('Failed to load email template');
        }
    }

    async sendEmail({ to, subject, template, variables = {}, attachments = [] }) {
        try {
            const html = await this.loadTemplate(template, variables);

            const mailOptions = {
                from: `${process.env.APP_NAME || 'FixPharmacy'} <${process.env.SMTP_USER}>`,
                to,
                subject,
                html,
                attachments
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`Email sent successfully to ${to}: ${result.messageId}`);
            return result;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    async sendWelcomeEmail(userEmail, userName) {
        return this.sendEmail({
            to: userEmail,
            subject: 'Welcome to FixPharmacy!',
            template: 'welcome',
            variables: {
                userName: userName,
                appName: process.env.APP_NAME || 'FixPharmacy',
                supportEmail: process.env.SUPPORT_EMAIL || 'support@fixpharmacy.com',
                websiteUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
                logoUrl: process.env.LOGO_URL || 'https://via.placeholder.com/200x60/4A90E2/white?text=FixPharmacy'
            }
        });
    }

    async sendOrderConfirmation(userEmail, orderDetails) {
        return this.sendEmail({
            to: userEmail,
            subject: `Order Confirmation - #${orderDetails.orderNumber}`,
            template: 'order-confirmation',
            variables: {
                userName: orderDetails.userName,
                orderNumber: orderDetails.orderNumber,
                totalAmount: orderDetails.totalAmount,
                items: orderDetails.items,
                deliveryAddress: orderDetails.deliveryAddress,
                appName: process.env.APP_NAME || 'FixPharmacy'
            }
        });
    }

    async sendPasswordReset(userEmail, resetToken, userName) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

        return this.sendEmail({
            to: userEmail,
            subject: 'Password Reset Request',
            template: 'password-reset',
            variables: {
                userName: userName,
                resetUrl: resetUrl,
                appName: process.env.APP_NAME || 'FixPharmacy',
                supportEmail: process.env.SUPPORT_EMAIL || 'support@fixpharmacy.com'
            }
        });
    }
}

module.exports = new EmailService();