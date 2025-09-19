import mongoose from 'mongoose';

const IndicatorSchema = new mongoose.Schema({
  pattern: {
    type: String,
    required: true,
    unique: true, // Each pattern must be unique
  },
  lastNumber: {
    type: Number,
    required: true,
    default: 99, // Starts at 99, so the first number generated is 100
  },
}, { timestamps: true });

export default mongoose.models.Indicator || mongoose.model('Indicator', IndicatorSchema);