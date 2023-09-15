const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  score:Number,
  roomName:String
});
const User = mongoose.model('User', userSchema);
