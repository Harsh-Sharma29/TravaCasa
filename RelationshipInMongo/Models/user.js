const mongoose=require("mongoose");
const {Schema} =mongoose;



main()
.then(()=>console.log("connection successfull"))
.catch((err) => console.log(err));

async function main() {
    await mongoose.connect("mongodb://127.0.0.1:27017/relationship");
}

const userSchema =new Schema({
    username:String,
    addresses:[{
        // _id:false, //user id individual address ki hatane k liye ye use krte hai hum 
        location:String,
        city:String,
    },
],
});

const User = mongoose.model("User", userSchema);

const addUsers=async()=>{
    //one to few realtionship 
    const user1 = new User({
        username: "john_doe",
        addresses: [
            { location: "123 Main St", 
              city: "New York" },
            { location: "456 Elm St", 
              city: "Los Angeles" }
        ]
    });
    let result = await user1.save();
    console.log(result); 
}
addUsers();
