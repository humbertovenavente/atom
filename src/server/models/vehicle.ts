import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  marca: { type: String, required: true, index: true },
  modelo: { type: String, required: true },
  año: { type: Number, required: true },
  kilometraje: { type: Number },
  color: { type: String },
  descripcion: { type: String },
  puertas: { type: Number },
  segmento: { type: String, index: true },
  precio: { type: Number, index: true },
  estado: { type: String },
  ciudad: { type: String },
  tipoCombustible: { type: String },
  motor: { type: Number },
  transmision: { type: String },
  url: { type: String },
  cantidad: { type: Number, default: 1 },
  embedding: { type: [Number], required: true },
});

export const Vehicle =
  mongoose.models['Vehicle'] ||
  mongoose.model('Vehicle', vehicleSchema);
