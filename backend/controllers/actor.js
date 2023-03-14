const { isValidObjectId } = require("mongoose");
const {sendError, uploadImageToCloud} = require("../utils/helper");
const actor = require("../models/actor");
const Actor = require("../models/actor");
const cloudinary = require("../cloud/index")

exports.createActor = async (req, res) => {
  const { name, about, gender } = req.body;
  const { file } = req;

  const newActor = new Actor({ name, about, gender });

  if(file){
    const { url, public_id } =uploadImageToCloud(file.path)
  newActor.avatar = { url, public_id };
  }
  await newActor.save();
  res.status(201).json({id: newActor._id, name, about ,gender, avatar: newActor.avatar?.url});
};

exports.updateActor = async (req, res) => {
  const { name, about, gender } = req.body;
  const { file } = req;
  const { actorId } = req.params;

  if (!isValidObjectId(actorId)) return sendError(res, "Invalid Request");
  const actor = await Actor.findById(actorId);
  
  if (!actor) return sendError(res, "Invalid Request, record not found!");

  const public_id = actor.avatar?.public_id;

  if (public_id && file) {
    const { result } = await cloudinary.uploader.destroy(public_id);

    if (result !== "ok") {
      return sendError(res, "Could not remove image from cloud!");
    }
  }

  if(file){
    const { url, public_id } =uploadImageToCloud(file.path)
    actor.avatar = { url, public_id };
    }
    actor.name = name;
    actor.gender = gender;
    actor.about = about;

    await actor.save();
    res.status(201).json({id: actor._id, name, about ,gender, avatar: actor.avatar?.url});
    
    
};

exports.removeActor = async (req, res) => {
  const { actorId } = req.params;
  if (!isValidObjectId(actorId)) return sendError(res, "Invalid Request");

  const actor = await Actor.findById(actorId);
  
  if (!actor) return sendError(res, "Invalid Request, record not found!");
  const public_id = actor.avatar?.public_id;

  if (public_id) {
    const { result } = await cloudinary.uploader.destroy(public_id);

    if (result !== "ok") {
      return sendError(res, "Could not remove image from cloud!");
    }
  }

  await Actor.findByIdAndDelete(actorId);
  res.json({message: "Record deleted successfully!"})

};

exports.searchActor = async (req, res) => {
  const { query } = req;
  const result = await Actor.find({ $text: { $search: `"${query.name}"` } });

  res.json(result);
};

exports.getLatestActors = async(req,res)=>{
 const result = await Actor.find().sort({createrAt: '-1'}).limit(12);
 res.json(result)
};
exports.getSingleActor = async(req,res)=>{
  const {id} = req.params;

  if (!isValidObjectId(id)) return sendError(res, "Invalid Request");

  const actor = await Actor.findById(id);
  if(!actor) return sendError(res, "Actor not found", 404)
  res.json(actor);
}
