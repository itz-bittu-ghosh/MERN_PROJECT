const mongoose = require("mongoose");


const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  date: {
    type: Date,
    default: new Date,
  },
  // todos:[
  //   {
  //     type: mongoose.Schema.Types.ObjectId,
  //     ref: "Todo"
  //   }
  // ],
});

// Create model
const User = mongoose.model("User", userSchema);

module.exports = User;
