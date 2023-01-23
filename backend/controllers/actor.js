const Actor = require("../models/actor");
const cloudinary = require("cloudinary").v2;

cloudinary.config({ 
  cloud_name: 'dimrh5r76', 
  api_key: '738896436135946', 
  api_secret: 'elXHNU_IM2Rns0mxJjd4uHjDy5s',
  secure: true
});

exports.createActor = async (req, res) => {
  const { name, about, gender } = req.body;
  const { file } = req;

  const newActor = new Actor({ name, about, gender });
  const { secure_url, public_id } = await cloudinary.uploader.upload(file.path);

  newActor.avatar = { url: secure_url, public_id };
  await newActor.save();
  res.status(201).json(newActor);
};