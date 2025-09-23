class GSTService {
  // Calculate GST for Indian transactions
  calculateGST(amount, gstRate = 18, isInterState = false) {
    const taxableAmount = amount / (1 + gstRate / 100);
    const gstAmount = amount - taxableAmount;
    
    let cgst = 0, sgst = 0, igst = 0;
    
    if (isInterState) {
      igst = gstAmount;
    } else {
      cgst = gstAmount / 2;
      sgst = gstAmount / 2;
    }
    
    return {
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      totalAmount: amount
    };
  }

  // Get GST rates for different product categories
  getGSTRates() {
    return {
      '0': 'Exempted',
      '5': '5% - Essential items',
      '12': '12% - Processed food, medicines',
      '18': '18% - Most goods and services',
      '28': '28% - Luxury items, sin goods'
    };
  }

  // Validate GST number format
  validateGSTNumber(gstNumber) {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gstNumber);
  }

  // Generate GST invoice data
  generateGSTInvoice(orderData, gstNumber) {
    const gstDetails = this.calculateGST(
      orderData.totalAmount, 
      orderData.gstRate || 18,
      orderData.isInterState || false
    );

    return {
      invoiceNumber: `INV-${Date.now()}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      gstNumber: gstNumber,
      ...gstDetails,
      items: orderData.items.map(item => ({
        ...item,
        gstAmount: (item.total * (item.gstRate || 18)) / 100,
        taxableAmount: item.total / (1 + (item.gstRate || 18) / 100)
      }))
    };
  }
}

module.exports = new GSTService();
