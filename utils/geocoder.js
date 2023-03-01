// access config file
const  dotenv=require('dotenv') // req dotenv package
//setting env file variables
dotenv.config({path:'./config/config.env'})


const nodeGeocoder=require('node-geocoder')
// console.log(GEOCODER_PROVIDER)
const options={
    provider:process.env.GEOCODER_PROVIDER,
    httpAdapter:'https',
    apiKey:process.env.GEOCODER_API_KEY,
    formatter:null
}

const geoCoder=nodeGeocoder(options)

module.exports=geoCoder