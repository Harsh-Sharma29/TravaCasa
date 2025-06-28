const mongoose = require('mongoose');
const {Schema} =mongoose;

//one to many ....ek dusre ko point krega aur jo dusra higa uske 
//andr bht kuchh hoga many form mein ek saath 4 5 ids like
main()
.then(()=>console.log("connection successfull"))
.catch((err) => console.log(err));

async function main() {
    await mongoose.connect("mongodb://127.0.0.1:27017/relationship");
}


const orderSchema = new Schema({
    product: String,
    price: Number,
});


const customerSchema = new Schema({
    name: String,
    age: Number,
    orders: [
        { 
            type: Schema.Types.ObjectId, 
            ref: "Order" 
        }
    ]
});



const Order =mongoose.model("Order",orderSchema);
const Customer =mongoose.model("Customer",customerSchema);

//populate isliye use krte hain object 
// id ki jgha object print krane k liye
const findCustomer = async () => {
    let result = await Customer.find({}).populate("orders");
    console.log("Customers with populated orders:", result[0]);// result mein zero dalne se object and ka bhi sb print ho jata hai 
};

// Uncomment to run the function
findCustomer();


const addCust = async () => {
    // Create new customer with the created orders
    let newCust = new Customer({
        name: "Alice Smith",
        age: 32,
    });

    let newOrder = new Order({
        item: "pizza",
        price :345
    });

    newCust.orders.push(newOrder);

    await newOrder.save();
    await newCust.save();
    console.log("Customer added");
};

const delCust =async() =>{
    let data = await Customer.findByIdAndDelete();
    console.log("All customers deleted:", data);
}

delCust();
// const addCustomer = async () => {
//     const order1 = await Order.create({ product: "Monitor", price: 300 });
//     const order2 = await Order.create({ product: "Keyboard", price: 100 });

//     const customer = new Customer({
//         name: "John Doe",
//         age: 28,
//         orders: [order1._id, order2._id]
//     });

//     let result = await customer.save();
//     console.log("Customer added:", result);
// };


// addCustomer();



// const addOrders =async()=>{
//     let res= await Order.insertMany([
//         { product: "Laptop", price: 1200 },
//         { product: "Phone", price: 800 },
//         { product: "Tablet", price: 500 }
//     ]);
//     console.log (res);
// }  ;

// addOrders();