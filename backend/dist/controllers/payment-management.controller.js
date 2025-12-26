"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllOrgPayments = exports.verifyOrgPayment = exports.verifyNgoPayment = exports.getNgoPaymentDetails = exports.getNgoPayments = exports.confirmPayment = void 0;
const mongoose_1 = require("mongoose");
const response_1 = require("../utils/response");
/**
 * Donor confirms payment after completing external payment
 * POST /api/payments/confirm
 */
const confirmPayment = async (req, res) => {
    const { paymentId, donorProvidedReference } = req.body;
    if (!paymentId) {
        return res.status(400).json({ success: false, message: 'Payment ID is required' });
    }
    if (!mongoose_1.Types.ObjectId.isValid(paymentId)) {
        return res.status(400).json({ success: false, message: 'Invalid payment ID' });
    }
    // Find payment and verify ownership
    const payment = await Payment_model_1.PaymentModel.findById(paymentId);
    if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    // Verify payment belongs to the logged-in donor
    if (payment.donorId.toString() !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You can only confirm your own payments',
        });
    }
    // Prevent duplicate confirmations
    if (payment.paymentStatus !== 'PENDING') {
        return res.status(400).json({
            success: false,
            message: `Payment is already ${payment.paymentStatus.toLowerCase()}. Cannot confirm again.`,
        });
    }
    // Update payment with donor-provided reference if provided
    if (donorProvidedReference) {
        payment.donorProvidedReference = donorProvidedReference.trim();
    }
    // Payment remains PENDING until verified by NGO/Admin
    await payment.save();
    const updated = await Payment_model_1.PaymentModel.findById(paymentId)
        .populate('donorId', 'name email')
        .populate({
        path: 'donationId',
        select: 'donationCategory purpose description quantityOrAmount paymentDetails',
    });
    return (0, response_1.sendSuccess)(res, updated, 'Payment confirmation submitted. Waiting for verification.');
};
exports.confirmPayment = confirmPayment;
/**
 * Get all payments for NGO's donations
 * GET /api/ngo/payments
 */
const getNgoPayments = async (req, res) => {
    const ngoId = req.user.id;
    const { paymentStatus, donationId } = req.query;
    // Build filter
    const filter = { ngoId };
    if (paymentStatus) {
        filter.paymentStatus = paymentStatus;
    }
    if (donationId) {
        if (!mongoose_1.Types.ObjectId.isValid(donationId)) {
            return res.status(400).json({ success: false, message: 'Invalid donation id' });
        }
        // Verify this donation belongs to the NGO
        const donation = await Donation_model_1.DonationModel.findOne({ _id: donationId, ngoId });
        if (!donation) {
            return res.status(403).json({ success: false, message: 'You do not have access to this donation' });
        }
        filter.donationId = donationId;
    }
    const payments = await Payment_model_1.PaymentModel.find(filter)
        .populate('donorId', 'name email contactInfo')
        .populate({
        path: 'donationId',
        select: 'donationCategory purpose description quantityOrAmount paymentDetails',
    })
        .sort({ createdAt: -1 })
        .lean();
    return (0, response_1.sendSuccess)(res, { count: payments.length, payments }, 'Payments fetched successfully');
};
exports.getNgoPayments = getNgoPayments;
/**
 * Get payment details
 * GET /api/ngo/payments/:id
 */
const getNgoPaymentDetails = async (req, res) => {
    const { id } = req.params;
    const ngoId = req.user.id;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid payment id' });
    }
    const payment = await Payment_model_1.PaymentModel.findById(id)
        .populate('donorId', 'name email contactInfo')
        .populate({
        path: 'donationId',
        select: 'donationCategory purpose description quantityOrAmount paymentDetails',
    })
        .lean();
    if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    // Verify payment belongs to NGO's donation
    if (payment.ngoId.toString() !== ngoId) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You can only view payments for your own donations',
        });
    }
    return (0, response_1.sendSuccess)(res, payment, 'Payment details fetched successfully');
};
exports.getNgoPaymentDetails = getNgoPaymentDetails;
/**
 * NGO verifies payment for their own donation
 * PATCH /api/ngo/payments/:id/verify
 */
const verifyNgoPayment = async (req, res) => {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    const ngoId = req.user.id;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid payment id' });
    }
    if (!paymentStatus || !['SUCCESS', 'FAILED'].includes(paymentStatus)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid payment status. Must be SUCCESS or FAILED',
        });
    }
    // Find payment and verify ownership
    const payment = await Payment_model_1.PaymentModel.findById(id);
    if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    // Verify payment belongs to NGO's donation
    if (payment.ngoId.toString() !== ngoId) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You can only verify payments for your own donations',
        });
    }
    // Cannot verify already verified payments
    if (payment.paymentStatus !== 'PENDING') {
        return res.status(400).json({
            success: false,
            message: `Payment is already ${payment.paymentStatus.toLowerCase()}. Cannot verify again.`,
        });
    }
    // Update payment status
    payment.paymentStatus = paymentStatus;
    payment.verifiedByRole = 'NGO';
    payment.verifiedById = new mongoose_1.Types.ObjectId(ngoId);
    payment.verifiedAt = new Date();
    await payment.save();
    // If payment successful, update donation status
    if (paymentStatus === 'SUCCESS') {
        const donation = await Donation_model_1.DonationModel.findById(payment.donationId);
        if (donation && donation.status === 'PENDING') {
            donation.status = 'CONFIRMED';
            await donation.save();
        }
    }
    const updated = await Payment_model_1.PaymentModel.findById(id)
        .populate('donorId', 'name email contactInfo')
        .populate({
        path: 'donationId',
        select: 'donationCategory purpose description quantityOrAmount paymentDetails',
    });
    return (0, response_1.sendSuccess)(res, updated, `Payment marked as ${paymentStatus.toLowerCase()}`);
};
exports.verifyNgoPayment = verifyNgoPayment;
/**
 * Organization Admin verifies any payment
 * PATCH /api/org/payments/:id/verify
 */
const verifyOrgPayment = async (req, res) => {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    const adminId = req.user.id;
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid payment id' });
    }
    if (!paymentStatus || !['SUCCESS', 'FAILED'].includes(paymentStatus)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid payment status. Must be SUCCESS or FAILED',
        });
    }
    // Find payment
    const payment = await Payment_model_1.PaymentModel.findById(id);
    if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    // Cannot verify already verified payments
    if (payment.paymentStatus !== 'PENDING') {
        return res.status(400).json({
            success: false,
            message: `Payment is already ${payment.paymentStatus.toLowerCase()}. Cannot verify again.`,
        });
    }
    // Update payment status
    payment.paymentStatus = paymentStatus;
    payment.verifiedByRole = 'ADMIN';
    payment.verifiedById = new mongoose_1.Types.ObjectId(adminId);
    payment.verifiedAt = new Date();
    await payment.save();
    // If payment successful, update donation status
    if (paymentStatus === 'SUCCESS') {
        const donation = await Donation_model_1.DonationModel.findById(payment.donationId);
        if (donation && donation.status === 'PENDING') {
            donation.status = 'CONFIRMED';
            await donation.save();
        }
    }
    const updated = await Payment_model_1.PaymentModel.findById(id)
        .populate('donorId', 'name email contactInfo')
        .populate({
        path: 'donationId',
        select: 'donationCategory purpose description quantityOrAmount paymentDetails',
    });
    return (0, response_1.sendSuccess)(res, updated, `Payment marked as ${paymentStatus.toLowerCase()}`);
};
exports.verifyOrgPayment = verifyOrgPayment;
/**
 * Get all payments (Organization Admin)
 * GET /api/org/payments
 */
const getAllOrgPayments = async (req, res) => {
    const { paymentStatus, ngoId, donationId } = req.query;
    const filter = {};
    if (paymentStatus) {
        filter.paymentStatus = paymentStatus;
    }
    if (ngoId) {
        if (!mongoose_1.Types.ObjectId.isValid(ngoId)) {
            return res.status(400).json({ success: false, message: 'Invalid NGO id' });
        }
        filter.ngoId = ngoId;
    }
    if (donationId) {
        if (!mongoose_1.Types.ObjectId.isValid(donationId)) {
            return res.status(400).json({ success: false, message: 'Invalid donation id' });
        }
        filter.donationId = donationId;
    }
    const payments = await Payment_model_1.PaymentModel.find(filter)
        .populate('donorId', 'name email contactInfo')
        .populate('ngoId', 'name email contactInfo')
        .populate({
        path: 'donationId',
        select: 'donationCategory purpose description quantityOrAmount paymentDetails',
    })
        .sort({ createdAt: -1 })
        .lean();
    return (0, response_1.sendSuccess)(res, { count: payments.length, payments }, 'All payments fetched successfully');
};
exports.getAllOrgPayments = getAllOrgPayments;
