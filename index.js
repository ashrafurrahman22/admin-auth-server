const express = require("express")
const cors = require("cors")
const { application } = require("express")
require("dotenv").config()
const jwt = require("jsonwebtoken")
const port = process.env.PORT || 5000
const app = express()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

// middleware
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ruqu1o2.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



const run = async()=> {
    try {
       await client.connect()
       console.log("Database connected");

    //  ===================  COLLECTIONS======================

    const userCollection = client.db("admin-auth").collection("users");

    const verifyAdmin = async(req,res,next)=> {
        const requester = req.decoded.email
        const requesterData = await userCollection.findOne({email:requester})
        if(requesterData.role === "admin"){
        next()
        }else{
          res.status(403).send("unAuthorize access")
        }
      }

      app.put("/users/:email",async(req,res)=> {
        const email = req.params.email
        const data= req.body

        const query = {email:email}
        const options = {upsert:true}
        const docs = {
            $set:{
                email:data.email,
                name:data.name,
               
            }
        }

        const result = await userCollection.updateOne(query,docs,options)
        const token = jwt.sign({ email:email }, process.env.JWT_SECRET);
        console.log(result);
        res.send({result,token})
    })

    app.get("/users",verify,async(req,res)=> {
        const data = await userCollection.find().toArray()
        res.send(data)
    })
    app.get("/users/:email",verify,async(req,res)=> {
        const email = req.params.email
        const query = {email:email}
        const data = await userCollection.findOne(query)
        const isAdmin = data.role === "admin"
        res.send({admin:isAdmin,data:data})
    })

    app.patch("/users/:email",verify,verifyAdmin,async(req,res)=> {
        const email = req.params.email
        const data = req.body
        const query = {email:email}
        const docs = {$set:{role:data.role}}
        const result = await userCollection.updateOne(query,docs)
        res.send(result)
        console.log(result);
    })


    app.delete("/users/:id",verify,verifyAdmin,async(req,res)=> {
        const id = req.params.id
        const result = await userCollection.deleteOne({_id:ObjectId(id)})
        res.send(result)
        
    })

    app.put("/maketoken/:email",(req,res)=> {
        const token = jwt.sign({ email:email }, process.env.JWT_SECRET);
        res.send({token})
    })

} finally{

}

}
run().catch(console.dir)

app.get("/",(req,res)=> {
res.send("hello from home")
})


app.listen(port,()=> {
console.log("server is running on port no 5000");
})



function verify(req,res,next){
const header = req.headers.authorization


if(!header){
   return res.send({message:"unauthorize access"})
}
const token = header.split(" ")[1]
jwt.verify(token, process.env.JWT_SECRET, function(err, decoded) {
    if(err){
        return res.status(403).send({message:"forbidded access"})
    }
    req.decoded = decoded
    next()
  });
}