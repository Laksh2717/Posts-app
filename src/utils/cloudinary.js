import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
// Ye file system ma bhi db jsi hi chije hai like isme bhi problems aa sakti hai isliye try catch use kro.

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;    // do not throw error.
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",    // automatically detect the type of resource.
    })
    // console.log("File is uploaded on cloudinary : ", response.url)
    fs.unlinkSync(localFilePath)   // remove file after successfull file upload.
    return response;   // Ham pura ka pura response hi retun kr dete hai user ko jo chaiye hoga wo usme se le lega. mostly url lega wo.
  } 
  catch (error) {
    // console.log(error)
    fs.unlinkSync(localFilePath)    // removes locally saved temporary file.
    return null;    // can also throw some error.
    // Lekin ab koi bhi is method ko use kr rha hai i.e. cloudinary method ko, to itna hame pata hai ki file local server pe to upload ho chuki hai, to matlab wo upload ho chuki hai, to hame kya krna chaiye for security purpose, us file ko server se hata dena chaiye, taki koi corrupted ya malicious file na reh jaaye server pe. Aur ham ye unlink process sync karayenge. 
  }
}

export default uploadOnCloudinary;

// File handling jo hai wo khud k server pe nhi ki jaati. Ham 3rd party services ko use krte hai. 

// Express-fileupload and multar dono almost same hi kaam krte hai but ab industry level ma jyada tar multar use ho rha hai.

// Ham kya krenge user se file upload karaenge, multer k through karayenge, cludinary k through nhi hota hai, cloudinary to ek service hai SDK hai, cloudinary appse file leti hai and apne server pe upload krti hai, ham kya krenge multer k use se user se file lenge and temperarily us file ko apne local server pe rkhenge, phir next step ma ham cludinary ka use krte hue ham us local storage se file lenge aur cludinary server pe upload kr denge. 

// Ye 2 step krne ki kyu jarurat hai ham directly multer se file leke cludinary pe upload nhi kr sakte. Ha ham kr sakte hai lekin production grade apps ma asa nhi hota, ham ye 2 step process hi krte hai.

// Fs ma basically kya hota hai ki files link and unlink hota hai, ham files ko fs se unlink kr dete hai is equivalent to file delete kr di.

// Hame cloudinary pe upload krne k liye file ka local path chaiye.