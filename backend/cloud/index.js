const cloudinary = require("cloudinary").v2;


cloudinary.config({ 
  cloud_name: 'dimrh5r76', 
  api_key: '738896436135946', 
  api_secret: 'elXHNU_IM2Rns0mxJjd4uHjDy5s',
  secure: true
});

module.exports = cloudinary