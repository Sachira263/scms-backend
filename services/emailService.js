const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateEBillPDF = (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('SCMS Canteen', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('School Canteen Management System', { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#6366F1');
    doc.moveDown(1);

    doc.fontSize(16).font('Helvetica-Bold').text('E-BILL / INVOICE', { align: 'center' });
    doc.moveDown(1);

    const orderId = order._id.toString();
    const shortId = orderId.substring(orderId.length - 6).toUpperCase();

    doc.fontSize(11).font('Helvetica');
    doc.text(`Order ID: #${shortId}`);
    doc.text(`Date: ${new Date(order.orderDate).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })}`);
    doc.text(`Customer: ${order.studentId?.name || 'N/A'}`);
    doc.text(`Email: ${order.studentId?.email || 'N/A'}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Payment: ${order.paymentStatus}`);
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E5E7EB');
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('#', 50, tableTop, { width: 30 });
    doc.text('Item', 80, tableTop, { width: 220 });
    doc.text('Qty', 300, tableTop, { width: 60, align: 'center' });
    doc.text('Price', 360, tableTop, { width: 90, align: 'right' });
    doc.text('Total', 450, tableTop, { width: 95, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E5E7EB');
    doc.moveDown(0.5);

    // Table rows
    doc.font('Helvetica').fontSize(10);
    order.products.forEach((item, index) => {
      const y = doc.y;
      const productName = item.productId?.name || 'Product';
      const quantity = item.quantity;
      const price = item.price;
      const total = quantity * price;

      doc.text(`${index + 1}`, 50, y, { width: 30 });
      doc.text(productName, 80, y, { width: 220 });
      doc.text(`${quantity}`, 300, y, { width: 60, align: 'center' });
      doc.text(`Rs. ${price.toFixed(2)}`, 360, y, { width: 90, align: 'right' });
      doc.text(`Rs. ${total.toFixed(2)}`, 450, y, { width: 95, align: 'right' });
      doc.moveDown(0.8);
    });

    doc.moveDown(0.5);
    doc.moveTo(350, doc.y).lineTo(545, doc.y).stroke('#6366F1');
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(13);
    doc.text(`Total Amount: Rs. ${order.totalAmount.toFixed(2)}`, 300, doc.y, {
      width: 245, align: 'right',
    });

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#E5E7EB');
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9).fillColor('#8B949E');
    doc.text('Thank you for your order!', { align: 'center' });
    doc.text('This is a computer-generated invoice. No signature required.', { align: 'center' });

    doc.end();
  });
};

const sendOrderCompletionEmail = async (order) => {
  try {
    const studentEmail = order.studentId?.email;
    const studentName = order.studentId?.name || 'Student';

    if (!studentEmail) {
      console.log('No student email found, skipping email');
      return false;
    }

    const orderId = order._id.toString();
    const shortId = orderId.substring(orderId.length - 6).toUpperCase();
    const pdfBuffer = await generateEBillPDF(order);

    const mailOptions = {
      from: `"SCMS Canteen" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: `Order #${shortId} Completed - E-Bill`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0D1117;color:#fff;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#6366F1,#8B5CF6);padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:24px;color:white;">🎉 Order Completed!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your order is ready for pickup</p>
          </div>
          <div style="padding:30px;">
            <p style="color:#C9D1D9;font-size:15px;">Hi <strong style="color:white;">${studentName}</strong>,</p>
            <p style="color:#8B949E;font-size:14px;">Your order <strong style="color:#6366F1;">#${shortId}</strong> has been completed.</p>
            <div style="background:#161B22;border:1px solid #30363D;border-radius:12px;padding:20px;margin:20px 0;">
              <h3 style="margin:0 0 12px;color:white;font-size:16px;">Order Summary</h3>
              ${order.products.map(item => `
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #21262D;">
                  <span style="color:#C9D1D9;">${item.productId?.name || 'Product'} x${item.quantity}</span>
                  <span style="color:#8B5CF6;font-weight:bold;">Rs. ${(item.quantity * item.price).toFixed(2)}</span>
                </div>
              `).join('')}
              <div style="display:flex;justify-content:space-between;padding:12px 0 0;margin-top:8px;">
                <span style="color:white;font-weight:bold;font-size:16px;">Total</span>
                <span style="color:#10B981;font-weight:bold;font-size:16px;">Rs. ${order.totalAmount.toFixed(2)}</span>
              </div>
            </div>
            <p style="color:#8B949E;font-size:13px;">📎 E-Bill PDF is attached to this email.</p>
            <p style="color:#8B949E;font-size:13px;">Payment: <strong style="color:${order.paymentStatus === 'Paid' ? '#10B981' : '#EF4444'};">${order.paymentStatus}</strong></p>
          </div>
          <div style="background:#161B22;padding:20px;text-align:center;border-top:1px solid #30363D;">
            <p style="margin:0;color:#484F58;font-size:11px;">SCMS - School Canteen Management System</p>
          </div>
        </div>
      `,
      attachments: [{
        filename: `SCMS_Bill_${shortId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order completion email sent to ${studentEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error.message);
    return false;
  }
};

const sendOrderStatusEmail = async (order, newStatus) => {
  try {
    const studentEmail = order.studentId?.email;
    const studentName = order.studentId?.name || 'Student';
    if (!studentEmail) return false;

    const orderId = order._id.toString();
    const shortId = orderId.substring(orderId.length - 6).toUpperCase();

    const statusConfig = {
      'Confirmed': { emoji: '✅', title: 'Order Confirmed!', color: '#3B82F6', message: 'Your order is being prepared.' },
      'Cancelled': { emoji: '❌', title: 'Order Cancelled', color: '#EF4444', message: 'Your order has been cancelled.' },
    };

    const info = statusConfig[newStatus];
    if (!info) return false;

    await transporter.sendMail({
      from: `"SCMS Canteen" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: `Order #${shortId} - ${info.title}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0D1117;color:#fff;border-radius:16px;overflow:hidden;">
          <div style="background:${info.color};padding:30px;text-align:center;">
            <h1 style="margin:0;font-size:24px;color:white;">${info.emoji} ${info.title}</h1>
          </div>
          <div style="padding:30px;">
            <p style="color:#C9D1D9;">Hi <strong>${studentName}</strong>,</p>
            <p style="color:#8B949E;">${info.message}</p>
            <p style="color:#8B949E;">Order: <strong style="color:#6366F1;">#${shortId}</strong></p>
            <p style="color:#8B949E;">Total: <strong style="color:#10B981;">Rs. ${order.totalAmount.toFixed(2)}</strong></p>
          </div>
          <div style="background:#161B22;padding:20px;text-align:center;border-top:1px solid #30363D;">
            <p style="margin:0;color:#484F58;font-size:11px;">SCMS - School Canteen Management System</p>
          </div>
        </div>
      `,
    });

    console.log(`Status email (${newStatus}) sent to ${studentEmail}`);
    return true;
  } catch (error) {
    console.error('Status email failed:', error.message);
    return false;
  }
};

module.exports = { sendOrderCompletionEmail, sendOrderStatusEmail, generateEBillPDF };



