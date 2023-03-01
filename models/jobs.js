const mongoose=require('mongoose')
const validator=require('validator')
const slugify=require('slugify')
const geoCoder = require('../utils/geocoder')

const jobSchema=mongoose.Schema({
    title:{
        type:String,
        required:[true,'Please enter job title'],
        trim:true,
        maxlength:[100,'job title cannot exceeds 100 characters']
    },
    slug:String,
    description:{
        type:String,
        required:[true,'Please enter job description'],
        maxlength:[1000,'job description cannot exceeds 100 characters']
    },
    email:{
        type:String,
        validate:[validator.isEmail,'Please enter valid email']
    },
    address:{
        type:String,
        required:[true,'Please add an address']
    },
    location:{
        type:{
            type:String,
            enum:['point']
        },
        coordinates:{
            type:[Number],
            index:'2dsphere'
        },
        formattedAddress:String,
        city:String,
        state:String,
        zipcode:String,
        country:String
    },
    company:{
        type:String,
        required:[true,'Please add company name'],
    },
    industry:{
        type:[String],
        required:[true,"Please enter industry for this job."],
        enum:{
            values:['Business','Information Technology','Banking','Education/Training','Telecommunication','Others'],
            message:'Please select correct options for industry'
        }
    },
    jobType:{
        type:String,
        required: [true,"Please enter job type."],
        enum:{
            values:[
                'Permanent',
                'Contract',
                'Internship',
            ],
            message:'Please select correct option for job type'
        }
    },
    minEducation:{
        type:String,
        required:[true,"Please specify minimum education for this job."],
        enum:{
            values:['Bachelores','Masters','Phd'],
            message:'Please select correct option for education'
        }
    },
    positions:{
        type:Number,
        default:1
    },
    experiance:{
        type:String,
        required:[true,"Please enter experiance required for this job."],
        enum:{
            values:[
                'Fresher',
                '1 year-2 years',
                '2 years-5 years',
                '5 years+'
            ],
            message:"Please select correct option for experiance"
        }
    },
    salary:{
        type:Number,
        required:[true,'Please enexpected salary for this job'],
    
    },
    postingDate:{
        type:Date,
        default:Date.now
    },
    lastDate:{
        type:Date,
        default:new Date().setDate(new Date().getDate()+7)
    },
    applicantsApplied:{
        type:[Object],
        select:false
    },
    user:{
        type:mongoose.Schema.ObjectId,
        ref:'User',
        required:true
    }
})

//creating job slug before saving
jobSchema.pre('save',function(next){
    //creating slug before saving to DB
    this.slug=slugify(this.title,{lower:true})

    next();
})


// setting up location
jobSchema.pre('save',async function(next){
    const loc=await geoCoder.geocode(this.address)

    this.location={
        type:'point',
        coordinates:[loc[0].longitude,loc[0].latitude],
        formattedAddress:loc[0].formattedAddress,
        city:loc[0].city,
        state:loc[0].stateCode,
        zipcode:loc[0].zipcode,
        country:loc[0].countryCode
    }
})

//update location

jobSchema.pre('findOneAndUpdate', async function (next) {
     
    if (this._update.address) {
      const loc = await geoCoder.geocode(this._update.address);
   
      this._update.location = {
        type: 'point',
        coordinates: [loc[0].longitude, loc[0].latitude],
        formattedAddress: loc[0].formattedAddress,
        city: loc[0].city,
        state: loc[0].stateCode,
        zipcode: loc[0].zipcode,
        country: loc[0].countryCode
      };
    }
  });

module.exports =mongoose.model('Job',jobSchema)