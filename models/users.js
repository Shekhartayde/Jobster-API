const mongoose=require('mongoose')
const validator=require('validator')
const bcrypt=require('bcryptjs')
const jwt=require('jsonwebtoken')
const crypto=require("crypto")



const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,"Please enter your name."]
    },
    email:{
        type:String,
        required:[true,"Please enter your email."],
        unique:true,
        validate:[validator.isEmail,"Please enter valid email address."]
    },
    role:{
        type:String,
        enum:{
            values:['user','employer'],
            message:"Please select correct role"
        },
        default:'user'
    },
    password:{
        type:String,
        required:[true,"Please enter your password."],
        minLength:[8,"Password must have at least 8 characters."],
        select:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    resetPasswordToken:String,
    resetPasswordExpire:Date
},
{
    toJSON:{virtuals:true},
    toObject:{virtuals:true}
})

//Encrypting password before saving
userSchema.pre('save',async function(next){
    if(!this.isModified('password')){
        next()
    }
    this.password=await bcrypt.hash(this.password,10)
})

//return json web token

userSchema.methods.getJwtToken=function(){
    return jwt.sign({id:this._id},process.env.JWT_SECRET,{
        expiresIn:process.env.JWT_EXPIRES_TIME
    })

}

//compare user password in database password
userSchema.methods.comparePassword=async function(enteredPassword){
    return await bcrypt.compare(enteredPassword,this.password)
}


//Generate password reset token
userSchema.methods.getResetPasswordToken=function(){
    //Generate token
    const resetToken=crypto.randomBytes(20).toString('hex')

    //Hash and set resetPasswordToken

    this.resetPasswordToken=crypto
                                .createHash('sha256')
                                .update(resetToken)
                                .digest('hex')

    //set token expire time
    this.resetPasswordExpire=Date.now()+ 30*60*1000

    return resetToken

}

//show all jobs created by user using virtual
userSchema.virtual('jobsPublished',{
    ref:'Job',
    localField:'_id',
    foreignField:'user',
    justOne:false
})

module.exports=mongoose.model('User',userSchema)
