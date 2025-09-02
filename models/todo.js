const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
  todo: String,
  date:String,
  user: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

// Create model
const Todo = mongoose.model("Todo", todoSchema);

module.exports = Todo;
