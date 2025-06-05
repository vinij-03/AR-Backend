const mongoose = require("mongoose");

const modelFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  filePath: { type: String, required: true },
});

const ModelFile = mongoose.model("ModelFile", modelFileSchema);
module.exports = ModelFile;
