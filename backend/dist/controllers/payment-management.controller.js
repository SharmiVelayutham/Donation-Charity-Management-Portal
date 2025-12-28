"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllOrgPayments = exports.verifyOrgPayment = exports.verifyNgoPayment = exports.getNgoPaymentDetails = exports.getNgoPayments = exports.confirmPayment = void 0;
const mongoose_1 = require("mongoose");
const response_1 = require("../utils/response");
const confirmPayment = async (req, res) => {
    const { paymentId, donorProvidedReference } = req.body;
    if (!paymentId) {
        return res.status(400).json({ success: false, message: 'Payment ID is required' });
    }
    if (!mongoose_1.Types.ObjectId.isValid(paymentId)) {
        return res.status(400).json({ success: false, message: 'Invalid payment ID' });
    }
    const payment = await Payment_model_1.PaymentModel.findById(paymentId);
    if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (payment.donorId.toString() !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You can only confirm your own payments',
        });
    }
    if (payment.paymentStatus !== 'PENDING') {
        return res.status(400).json({
            success: false,
            message: `Payment is already ${payment.paymentStatus.toLowerCase()}. Cannot confirm again.`,
        });
    }
    if (donorProvidedReference) {
        payment.donorProvidedReference = donorProvidedReference.trim();
    }
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
const getNgoPayments = async (req, res) => {
    const ngoId = req.user.id;
    const { paymentStatus, donationId } = req.query;
    const filter = { ngoId };
    if (paymentStatus) {
        filter.paymentStatus = paymentStatus;
    }
    if (donationId) {
        if (!mongoose_1.Types.ObjectId.isValid(donationId)) {
            return res.status(400).json({ success: false, message: 'Invalid donation id' });
        }
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
    if (payment.ngoId.toString() !== ngoId) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You can only view payments for your own donations',
        });
    }
    return (0, response_1.sendSuccess)(res, payment, 'Payment details fetched successfully');
};
exports.getNgoPaymentDetails = getNgoPaymentDetails;
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
    const payment = await Payment_model_1.PaymentModel.findById(id);
    if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (payment.ngoId.toString() !== ngoId) {
        return res.status(403).json({
            success: false,
            message: 'Forbidden: You can only verify payments for your own donations',
        });
    }
    if (payment.paymentStatus !== 'PENDING') {
        return res.status(400).json({
            success: false,
            message: `Payment is already ${payment.paymentStatus.toLowerCase()}. Cannot verify again.`,
        });
    }
    payment.paymentStatus = paymentStatus;
    payment.verifiedByRole = 'NGO';
    payment.verifiedById = new mongoose_1.Types.ObjectId(ngoId);
    payment.verifiedAt = new Date();
    await payment.save();
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
    const payment = await Payment_model_1.PaymentModel.findById(id);
    if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    if (payment.paymentStatus !== 'PENDING') {
        return res.status(400).json({
            success: false,
            message: `Payment is already ${payment.paymentStatus.toLowerCase()}. Cannot verify again.`,
        });
    }
    payment.paymentStatus = paymentStatus;
    payment.verifiedByRole = 'ADMIN';
    payment.verifiedById = new mongoose_1.Types.ObjectId(adminId);
    payment.verifiedAt = new Date();
    await payment.save();
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
