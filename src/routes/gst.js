const express = require('express');
const { body, validationResult } = require('express-validator');
const gstService = require('../services/gstService');

const router = express.Router();

// Calculate GST
router.post('/calculate', [
  body('amount').isNumeric().withMessage('Amount is required'),
  body('gstRate').optional().isNumeric().withMessage('GST rate must be a number'),
  body('isInterState').optional().isBoolean().withMessage('isInterState must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, gstRate = 18, isInterState = false } = req.body;
    const gstDetails = gstService.calculateGST(amount, gstRate, isInterState);

    res.json({
      success: true,
      data: gstDetails,
      country: 'India',
      currency: 'INR'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'GST calculation failed',
      error: error.message
    });
  }
});

// Get GST rates
router.get('/rates', (req, res) => {
  try {
    const rates = gstService.getGSTRates();
    res.json({
      success: true,
      data: rates,
      country: 'India'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch GST rates',
      error: error.message
    });
  }
});

// Validate GST number
router.post('/validate', [
  body('gstNumber').notEmpty().withMessage('GST number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { gstNumber } = req.body;
    const isValid = gstService.validateGSTNumber(gstNumber);

    res.json({
      success: true,
      data: {
        gstNumber,
        isValid,
        message: isValid ? 'Valid GST number' : 'Invalid GST number format'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'GST validation failed',
      error: error.message
    });
  }
});

module.exports = router;
