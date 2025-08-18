const Order = require('../models/Order');
const emailService = require('../utils/emailService');

// Get all orders
// getAllOrders: filtering by user's email
exports.getAllOrders = async (req, res, next) => {
    try {
        let query = {};
        if (req.query.name) {
            query = { 'customer.user.name': req.query.name };
        }
        const orders = await Order.find(query)
            .populate('customer.user', 'name email phone')
            .populate('items.product', 'name brand')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        next(error);
    }
};


// Get a single order by order ID (Admin view)
exports.getOrderById = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate('customer.user', 'name email phone')
            .populate('items.product', 'name brand');
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        next(error);
    }
};

// Update order status and upload customer signature (Admin only)
exports.updateOrder = async (req, res, next) => {
    try {
        let {
            status,
            paymentStatus,
            amountPaid,
            paymentDate,
            deliveryPersonName,
            deliveryPersonContact,
            estimatedArrivalTime,
            prescriptionVerification,
            packingDetails,
            dispatchDetails,
            trackingNumber
        } = req.body;

        console.log('Update order request body:', req.body);

        // If prescriptionVerification is a JSON string (from FormData), parse it
        if (typeof prescriptionVerification === 'string') {
            try {
                prescriptionVerification = JSON.parse(prescriptionVerification);
            } catch (error) {
                console.error('Failed to parse prescriptionVerification:', error);
            }
        }

        // If packingDetails is a JSON string (from FormData), parse it
        if (typeof packingDetails === 'string') {
            try {
                packingDetails = JSON.parse(packingDetails);
            } catch (error) {
                console.error('Failed to parse packingDetails:', error);
            }
        }

        // If dispatchDetails is a JSON string (from FormData), parse it
        if (typeof dispatchDetails === 'string') {
            try {
                dispatchDetails = JSON.parse(dispatchDetails);
            } catch (error) {
                console.error('Failed to parse dispatchDetails:', error);
            }
        }

        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Handle prescription verification
        if (prescriptionVerification) {
            const { action, prescriptionId, notes, rejectionReason } = prescriptionVerification;
            console.log('Prescription verification:', prescriptionVerification);

            // Find the prescription in the order
            const prescription = order.prescriptions.id(prescriptionId);
            if (!prescription) {
                return res.status(404).json({
                    success: false,
                    message: "Prescription not found in order"
                });
            }

            if (action === 'approve') {
                prescription.verified = true;
                prescription.verifiedAt = new Date();
                prescription.verifiedBy = req.user.id; // Assuming auth middleware sets req.user
                if (notes) prescription.verificationNotes = notes;

                // Update overall prescription status
                const allPrescriptionsVerified = order.prescriptions.every(p => p.verified);
                if (allPrescriptionsVerified) {
                    order.prescriptionStatus = 'verified';
                }

                console.log('Prescription approved');
            } else if (action === 'reject') {
                prescription.verified = false;
                prescription.rejectionReason = rejectionReason;
                if (notes) prescription.verificationNotes = notes;

                // Update overall prescription status to rejected
                order.prescriptionStatus = 'rejected';

                console.log('Prescription rejected');
            }
        }

        // Handle packing details
        if (packingDetails) {
            console.log('Packing details:', packingDetails);

            // Store packing information
            order.packingDetails = {
                packedAt: packingDetails.packedAt ? new Date(packingDetails.packedAt) : new Date(),
                packedBy: req.user?.id,
                packedItems: packingDetails.packedItems,
                packingNotes: packingDetails.packingNotes,
                packageWeight: packingDetails.packageWeight,
                packageDimensions: packingDetails.packageDimensions,
                specialInstructions: packingDetails.specialInstructions,
                fragileItems: packingDetails.fragileItems || false,
                coldStorage: packingDetails.coldStorage || false
            };

            console.log('Order packed successfully');
        }

        // Handle dispatch details
        if (dispatchDetails) {
            console.log('Dispatch details:', dispatchDetails);

            // Store dispatch information
            order.dispatchDetails = {
                dispatchedAt: dispatchDetails.dispatchedAt ? new Date(dispatchDetails.dispatchedAt) : new Date(),
                dispatchedBy: req.user?.id,
                deliveryPersonName: dispatchDetails.deliveryPersonName,
                deliveryPersonPhone: dispatchDetails.deliveryPersonPhone,
                vehicleNumber: dispatchDetails.vehicleNumber,
                estimatedDeliveryTime: dispatchDetails.estimatedDeliveryTime ? new Date(dispatchDetails.estimatedDeliveryTime) : null,
                routeInstructions: dispatchDetails.routeInstructions,
                dispatchNotes: dispatchDetails.dispatchNotes,
                priorityDelivery: dispatchDetails.priorityDelivery || false,
                trackingNumber: dispatchDetails.trackingNumber
            };

            // Update legacy tracking number field
            order.trackingNumber = dispatchDetails.trackingNumber;

            // Update delivery information for backward compatibility
            // Ensure delivery object exists
            if (!order.delivery) {
                order.delivery = {};
            }
            if (!order.delivery.assignedTo) {
                order.delivery.assignedTo = {};
            }
            order.delivery.assignedTo.name = dispatchDetails.deliveryPersonName;
            order.delivery.assignedTo.phone = dispatchDetails.deliveryPersonPhone;
            if (dispatchDetails.estimatedDeliveryTime) {
                order.delivery.estimatedDeliveryTime = new Date(dispatchDetails.estimatedDeliveryTime);
            }

            console.log('Order dispatched successfully');
        }

        // Update tracking number if provided directly
        if (trackingNumber) {
            order.trackingNumber = trackingNumber;
        }

        // Store original status for email comparison
        const originalStatus = order.status;

        // Update status if provided
        if (status) {
            await order.updateStatus(status, req.user?.id, 'Status updated by admin');
        }

        // Update payment details if provided
        if (paymentStatus) {
            order.payment.status = paymentStatus;
        }
        if (amountPaid !== undefined) {
            // This might be used for tracking actual payment amount
            order.amountPaid = amountPaid;
        }
        if (paymentDate) {
            order.payment.paidAt = new Date(paymentDate);
        }

        // Update delivery details
        if (deliveryPersonName) {
            if (!order.delivery) order.delivery = {};
            if (!order.delivery.assignedTo) order.delivery.assignedTo = {};
            order.delivery.assignedTo.name = deliveryPersonName;
        }
        if (deliveryPersonContact) {
            if (!order.delivery) order.delivery = {};
            if (!order.delivery.assignedTo) order.delivery.assignedTo = {};
            order.delivery.assignedTo.phone = deliveryPersonContact;
        }
        if (estimatedArrivalTime) {
            if (!order.delivery) order.delivery = {};
            order.delivery.estimatedDeliveryTime = new Date(estimatedArrivalTime);
        }

        // Check what Multer captured
        console.log("req.file:", req.file);

        // If order is delivered and a file is provided, store path
        if (status === "delivered" && req.file) {
            order.customerSignature = `/uploads/clientSignatures/${req.file.filename}`;
        }

        await order.save();
        await order.populate('customer.user', 'name email phone');

        // Send status update email if status was changed
        if (status && status !== originalStatus) {
            console.log(`=== ADMIN EMAIL NOTIFICATION DEBUG ===`);
            console.log(`Status changed from ${originalStatus} to ${status}`);
            console.log(`Order ID: ${order._id}`);
            console.log(`Order Number: ${order.orderNumber}`);
            try {
                const customerEmail = order.customer.user?.email ||
                    order.customer.guestDetails?.email;
                console.log(`Customer email: ${customerEmail}`);
                console.log(`Customer user object:`, order.customer.user);
                console.log(`Customer guest details:`, order.customer.guestDetails);

                if (customerEmail) {
                    console.log(`Sending ${status} email to ${customerEmail}...`);
                    await emailService.sendOrderStatusUpdate(customerEmail, order, status, '');
                    console.log(`✅ Status update email sent to ${customerEmail} for order ${order.orderNumber} - Status: ${status}`);
                } else {
                    console.log(`❌ No customer email found - cannot send notification`);
                }
            } catch (emailError) {
                console.error('❌ Error sending status update email:', emailError);
                // Don't fail the update if email fails
            }
        } else {
            console.log(`No status change detected - Original: ${originalStatus}, New: ${status}`);
        }

        res.status(200).json({
            success: true,
            message: "Order updated successfully",
            data: order,
        });
    } catch (error) {
        console.error('Update order error:', error);
        next(error);
    }
};