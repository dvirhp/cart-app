const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadTemp(localPath) {
  const res = await cloudinary.uploader.upload(localPath, {
    folder: "cart-app/test-receipts",
    resource_type: "image",
    overwrite: true,
    transformation: [
      { fetch_format: "jpg", quality: "auto:best" },
      { width: 1600, crop: "limit" },
      { effect: "sharpen" },
      { effect: "contrast:40" },
    ],
  });
  return res.secure_url;
}

module.exports = { uploadTemp };
