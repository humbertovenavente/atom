import mongoose from 'mongoose';

const nodeConfigSchema = new mongoose.Schema({
  systemPrompt: { type: String, default: '' },
  temperature: { type: Number, default: 0.3 },
  botToken: { type: String, default: '' },  // Required for telegram node persistence
}, { _id: false });

const flowNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  data: {
    label: String,
    icon: String,
    color: String,
    config: { type: nodeConfigSchema, default: undefined },
  },
}, { _id: false });

const flowEdgeSchema = new mongoose.Schema({
  id: String,
  source: String,
  target: String,
  animated: Boolean,
}, { _id: false });

const flowSchema = new mongoose.Schema({
  flowId: { type: String, unique: true, required: true },
  nodes: [flowNodeSchema],
  edges: [flowEdgeSchema],
  nodeConfigs: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const Flow = mongoose.models['Flow'] || mongoose.model('Flow', flowSchema);
