import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;    // can also throw some error.
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",    // automatically detect the type of resource.
    })
    console.log("File is uploaded on cloudinary : ", response.url)
    return response;
  } 
  catch (error) {
    fs.unlinkSync(localFilePath)    // removes locally saved temporary file.
    return null;    // can also throw some error.
    // Lekin ab koi bhi is method ko use kr rha hai i.e. cloudinary method ko, to itna hame pata hai ki file local server pe to upload ho chuki hai, to matlab wo upload ho chuki hai, to hame kya krna chaiye for security purpose, us file ko server se hata dena chaiye, taki koi corrupted ya malicious file na reh jaaye server pe. Aur ham ye unlink process sync karayenge. 
  }
}

export default uploadOnCloudinary;