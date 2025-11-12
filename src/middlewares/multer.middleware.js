import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

const upload = multer({ storage });

export default upload;

// Jo file haina wo multer k pass hi hota hai, req to hai hi hamare pass, jo user se req aa rhi hai, file ka access hame aur mil jaata hai jisme saari files hoti hai, req.body ma json data hota hai file nhi hoti hai, isliye multer use krte hai.

// Wo storage method, aapko local path return krta hai.

// Cb matlab callback.

// Ham ya to disk ma store kr sakte hai ya memory ma, but large files upload hone pr memory bhar jaayegi isliye disk ma store krte hai.