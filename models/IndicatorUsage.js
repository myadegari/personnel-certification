import mongoose from 'mongoose';

const IndicatorUsageSchema = new mongoose.Schema({
  // A reference to the main indicator pattern (e.g., 'CERT-Y<year>-D<deputy>')
  indicator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Indicator',
    required: true,
  },
  // The specific number that was used (e.g., 42)
  number: {
    type: Number,
    required: true,
  },
  // A reference to the enrollment this number was assigned to.
  // Absent for bulk-issued guest certificates (sparse unique index on this
  // field must not see null values — only present values are indexed).
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
  },
  // A reference to the guest certificate (for bulk-issued certificates
  // issued to persons without an account in the system).
  guestCertificate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuestCertificate',
  },
  // The full, human-readable certificate ID (e.g., '40501020042')
  fullCertificateId: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Ensures that a number is never used more than once for the same indicator pattern
IndicatorUsageSchema.index({ indicator: 1, number: 1 }, { unique: true });
// An enrollment can have at most one certificate; sparse so guest certs
// (which have no enrollment) don't collide on null.
IndicatorUsageSchema.index({ enrollment: 1 }, { unique: true, sparse: true });

export default mongoose.models.IndicatorUsage || mongoose.model('IndicatorUsage', IndicatorUsageSchema);