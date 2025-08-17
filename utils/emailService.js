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
                logoUrl: process.env.LOGO_URL || 'https://i.ibb.co/RGtZpS0q/fixpharmacy.png'
            }
        });
    }

    async sendOrderConfirmation(userEmail, orderDetails) {
        // Format pricing
        const subtotal = parseFloat(orderDetails.pricing.subtotal).toFixed(2);
        const deliveryFee = parseFloat(orderDetails.pricing.deliveryFee).toFixed(2);
        const tax = orderDetails.pricing.tax ? parseFloat(orderDetails.pricing.tax).toFixed(2) : 0;
        const totalAmount = parseFloat(orderDetails.pricing.total).toFixed(2);

        // Generate items HTML
        const itemsHTML = orderDetails.items.map(item => {
            const prescriptionBadge = item.prescriptionRequired 
                ? '<div style="margin-top: 4px;"><span class="prescription-badge">Rx Required</span></div>'
                : '';
            
            const purchaseTypeText = item.purchaseType === 'unit' ? 'Individual' : 'Package';
            
            return `
                <tr>
                    <td>
                        <div class="item-name">${item.productSnapshot.name}</div>
                        <div class="item-brand">${item.productSnapshot.brand}</div>
                        ${prescriptionBadge}
                    </td>
                    <td>
                        <span class="purchase-type">${purchaseTypeText}</span>
                    </td>
                    <td>${item.quantity}</td>
                    <td style="font-weight: 600;">Rs. ${parseFloat(item.totalPrice).toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        // Generate tax row if applicable
        const taxRow = tax > 0 ? `
            <tr>
                <td style="color: #666;">Tax</td>
                <td style="text-align: right;">Rs. ${tax}</td>
            </tr>
        ` : '';

        // Generate landmark info if available
        const landmarkInfo = orderDetails.deliveryAddress.landmark 
            ? `<small style="color: #666;">Near: ${orderDetails.deliveryAddress.landmark}</small><br>`
            : '';

        // Generate payment method text
        const paymentMethodText = orderDetails.payment.method === 'cod' 
            ? 'Cash on Delivery (COD)' 
            : orderDetails.payment.method.toUpperCase();

        // Generate COD note if applicable
        const codNote = orderDetails.payment.method === 'cod' 
            ? '<small style="color: #666;">Please keep exact change ready for delivery</small>'
            : '';

        // Generate prescription note if applicable
        const prescriptionNote = orderDetails.hasPrescriptionItems ? `
            <div class="important-note">
                <h4>📋 Prescription Required</h4>
                <p style="margin: 0; color: #856404;">
                    Your order contains prescription medicines. Our pharmacist will verify your prescription before dispatch. 
                    Delivery may be delayed if prescription verification is required.
                </p>
            </div>
        ` : '';

        // Create tracking URL
        const trackingUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/track/${orderDetails.orderNumber}`;
        
        // Format order date
        const orderDate = new Date(orderDetails.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Calculate estimated delivery (24 hours from now)
        const estimatedDelivery = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return this.sendEmail({
            to: userEmail,
            subject: `Order Confirmation - #${orderDetails.orderNumber} | FixPharmacy`,
            template: 'order-confirmation',
            variables: {
                userName: orderDetails.customer.isGuest 
                    ? orderDetails.customer.guestDetails.name 
                    : orderDetails.customer.user?.name || 'Valued Customer',
                orderNumber: orderDetails.orderNumber,
                itemsHTML: itemsHTML,
                itemCount: orderDetails.items.length,
                subtotal: subtotal,
                deliveryFee: deliveryFee,
                taxRow: taxRow,
                totalAmount: totalAmount,
                'deliveryAddress.name': orderDetails.deliveryAddress.name,
                'deliveryAddress.street': orderDetails.deliveryAddress.street,
                'deliveryAddress.area': orderDetails.deliveryAddress.area,
                'deliveryAddress.city': orderDetails.deliveryAddress.city,
                'deliveryAddress.phone': orderDetails.deliveryAddress.phone,
                landmarkInfo: landmarkInfo,
                paymentMethodText: paymentMethodText,
                codNote: codNote,
                prescriptionNote: prescriptionNote,
                trackingUrl: trackingUrl,
                orderDate: orderDate,
                estimatedDelivery: estimatedDelivery,
                appName: process.env.APP_NAME || 'FixPharmacy',
                logoUrl: process.env.LOGO_URL || 'https://i.ibb.co/RGtZpS0q/fixpharmacy.png',
                websiteUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
                supportEmail: process.env.SUPPORT_EMAIL || 'support@fixpharmacy.com',
                supportPhone: process.env.SUPPORT_PHONE || '+977-1-4445566'
            }
        });
    }

    async sendOrderStatusUpdate(userEmail, orderDetails, newStatus, statusNotes = '') {
        // Define status configurations
        const statusConfig = {
            pending: {
                title: 'Order Received',
                message: 'We have received your order and it is being processed.',
                icon: '📦',
                color: '#ff9800',
                bgColor: '#fff3e0'
            },
            prescription_verified: {
                title: 'Prescription Verified',
                message: 'Your prescription has been verified by our pharmacist.',
                icon: '✅',
                color: '#4caf50',
                bgColor: '#e8f5e8'
            },
            confirmed: {
                title: 'Order Confirmed',
                message: 'Your order has been confirmed and is being prepared.',
                icon: '✅',
                color: '#4caf50',
                bgColor: '#e8f5e8'
            },
            packed: {
                title: 'Order Packed',
                message: 'Your order has been packed and is ready for dispatch.',
                icon: '📦',
                color: '#2196f3',
                bgColor: '#e3f2fd'
            },
            out_for_delivery: {
                title: 'Out for Delivery',
                message: 'Your order is on its way! Our delivery partner will contact you soon.',
                icon: '🚛',
                color: '#ff9800',
                bgColor: '#fff3e0'
            },
            delivered: {
                title: 'Order Delivered',
                message: 'Your order has been successfully delivered. Thank you for choosing us!',
                icon: '🎉',
                color: '#4caf50',
                bgColor: '#e8f5e8'
            },
            cancelled: {
                title: 'Order Cancelled',
                message: 'Your order has been cancelled as requested.',
                icon: '❌',
                color: '#f44336',
                bgColor: '#ffebee'
            }
        };

        const config = statusConfig[newStatus] || statusConfig.pending;

        // Generate delivery info based on status
        let deliveryInfo = '';
        if (newStatus === 'out_for_delivery' || newStatus === 'delivered') {
            deliveryInfo = `
                <p style="margin: 5px 0; color: #555;">
                    <strong>Delivery Address:</strong> ${orderDetails.deliveryAddress.street}, ${orderDetails.deliveryAddress.area}, ${orderDetails.deliveryAddress.city}
                </p>
            `;
        }

        // Generate next steps info
        let nextStepsInfo = '';
        if (newStatus === 'out_for_delivery') {
            nextStepsInfo = `
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #1976d2;">📱 What's Next?</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #555;">
                        <li>Our delivery partner will contact you shortly</li>
                        <li>Please keep your phone accessible</li>
                        <li>Have exact change ready for COD orders</li>
                        <li>Ensure someone is available at the delivery address</li>
                    </ul>
                </div>
            `;
        } else if (newStatus === 'delivered') {
            nextStepsInfo = `
                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #2e7d32;">🙏 Thank You!</h4>
                    <p style="margin: 0; color: #555;">
                        We hope you're satisfied with your order. If you have any issues or feedback, 
                        please don't hesitate to contact our support team.
                    </p>
                </div>
            `;
        }

        // Create tracking URL
        const trackingUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/track/${orderDetails.orderNumber}`;
        
        // Format order date
        const orderDate = new Date(orderDetails.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return this.sendEmail({
            to: userEmail,
            subject: `Order Update: ${config.title} - #${orderDetails.orderNumber}`,
            template: 'order-status-update',
            variables: {
                userName: orderDetails.customer.isGuest 
                    ? orderDetails.customer.guestDetails.name 
                    : orderDetails.customer.user?.name || 'Valued Customer',
                orderNumber: orderDetails.orderNumber,
                statusText: config.title,
                statusTitle: config.title,
                statusMessage: statusNotes || config.message,
                statusIcon: config.icon,
                statusColor: config.color,
                statusBgColor: config.bgColor,
                orderDate: orderDate,
                totalAmount: parseFloat(orderDetails.pricing.total).toFixed(2),
                deliveryInfo: deliveryInfo,
                nextStepsInfo: nextStepsInfo,
                trackingUrl: trackingUrl,
                appName: process.env.APP_NAME || 'FixPharmacy',
                logoUrl: process.env.LOGO_URL || 'https://i.ibb.co/RGtZpS0q/fixpharmacy.png',
                websiteUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
                supportEmail: process.env.SUPPORT_EMAIL || 'support@fixpharmacy.com',
                supportPhone: process.env.SUPPORT_PHONE || '+977-1-4445566'
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