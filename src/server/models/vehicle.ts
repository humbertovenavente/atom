import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  brand: { type: String, required: true, index: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  mileage: { type: Number },
  color: { type: String },
  description: { type: String },
  doors: { type: Number },
  segment: { type: String, index: true },
  price: { type: Number, index: true },
  state: { type: String },
  city: { type: String },
  fuelType: { type: String },
  engine: { type: Number },
  transmission: { type: String },
  url: { type: String },
  quantity: { type: Number, default: 1 },
  embedding: { type: [Number], required: true },
});

export const Vehicle =
  mongoose.models['Vehicle'] ||
  mongoose.model('Vehicle', vehicleSchema);
