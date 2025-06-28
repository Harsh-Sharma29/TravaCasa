const mongoose=require("mongoose");
const {Schema} =mongoose;



main()
.then(()=>console.log("connection successfull"))
.catch((err) => console.log(err));

async function main() {
    await mongoose.connect("mongodb://127.0.0.1:27017/relationship");
}

const userSchema =new Schema({
    username :String,
    email:String
});

const postSchema = new Schema({
    content: String,
    likes:Number,
    user: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
});

const User = mongoose.model("User", userSchema);
const Post = mongoose.model("Post", postSchema);
const addData = async () => {
    // Create a new user
    let user = new User({
        username: "john_doe",
        email: "john@example.com"
    });
    await user.save();

    // Create a new post referencing the user
    let post = new Post({
        content: "This is a sample post",
        likes: 0,
        user: user._id
    });
    await post.save();

    console.log("User and post added successfully");
};

// Call the function to add data
addData();