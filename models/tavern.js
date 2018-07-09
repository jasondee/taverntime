var mongoose = require("mongoose");

var tavernSchema = new mongoose.Schema({
   name: String,
   price: String,
   image: String,
   description: String,
   author:  {
       id: {
          type: mongoose.Schema.Types.ObjectId,
       },
       username: String
      },
   comments: [
       {
           type:mongoose.Schema.Types.ObjectId,
           ref: "Comment"
       }
   ]
});

module.exports = mongoose.model("Tavern", tavernSchema);