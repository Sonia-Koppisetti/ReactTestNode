const MeetingHistory = require('../../model/schema/meeting')
const mongoose = require('mongoose');

const add = async (req, res) => {
   try {
           const { agenda,attendes, attendesLead, location, related, dateTime, notes, createBy} = req.body;
           if (attendes && !attendes.every(id => mongoose.Types.ObjectId.isValid(id))) {
               res.status(400).json({ error: 'Invalid assignTo value' });
           }
           if (attendesLead && !attendes.every(id => mongoose.Types.ObjectId.isValid(id))) {
               res.status(400).json({ error: 'Invalid assignToLead value' });
           }
           const meetingData = { agenda, location, related, dateTime, notes, createBy, timestamp: new Date() };
   
           if (attendes) {
               meetingData.attendes = attendes;
           }
           if (attendesLead) {
               meetingData.attendesLead = attendesLead;
           }
           const result = new MeetingHistory(meetingData);
           console.log("result", result)
           await result.save();
           res.status(200).json(result);
       } catch (err) {
           console.error('Failed to create meeting:', err);
           res.status(400).json({ error: 'Failed to create meeting : ', err });
       }
}

const index = async (req, res) => {
    query = req.query;
        query.deleted = false;
        if (query.createBy) {
            query.createBy = new mongoose.Types.ObjectId(query.createBy);
        }
    
        try {
            let result = await MeetingHistory.aggregate([
                { $match: query },
                {
                    $lookup: {
                        from: 'Contacts',
                        localField: 'attendes',
                        foreignField: '_id',
                        as: 'attendes'
                    }
                },
                {
                    $lookup: {
                        from: 'Leads', // Assuming this is the collection name for 'leads'
                        localField: 'attendesLead',
                        foreignField: '_id',
                        as: 'attendesLead'
                    }
                },
                {
                    $lookup: {
                        from: 'User',
                        localField: 'createBy',
                        foreignField: '_id',
                        as: 'users'
                    }
                },
                { $unwind: { path: '$users', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$contact', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$Lead', preserveNullAndEmptyArrays: true } },
                { $match: { 'users.deleted': false } },
                {
                    $addFields: {
                        createdByName: '$users.username',
                    }
                },
                { $project: { users: 0, contact: 0, Lead: 0 } },
            ]);
            res.send(result);
        } catch (error) {
            console.error("Error:", error);
            res.status(500).send("Internal Server Error");
        }
}

const view = async (req, res) => {
    try {
            console.log(req.params.id)
            let response = await MeetingHistory.findOne({ _id: req.params.id })
            if (!response) return res.status(404).json({ message: "no Data Found." })
            let result = await MeetingHistory.aggregate([
                { $match: { _id: response._id } },
                
                {
                    $lookup: {
                        from: 'Contacts',
                        localField: 'attendes',
                        foreignField: '_id',
                        as: 'attendes'
                    }
                },
                {
                    $lookup: {
                        from: 'Leads', // Assuming this is the collection name for 'leads'
                        localField: 'attendesLead',
                        foreignField: '_id',
                        as: 'attendesLead'
                    }
                },
                {
                    $lookup: {
                        from: 'User',
                        localField: 'createBy',
                        foreignField: '_id',
                        as: 'users'
                    }
                },
                { $unwind: { path: '$contact', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$users', preserveNullAndEmptyArrays: true } },
                { $unwind: { path: '$Lead', preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        createdByName: '$users.username',
                    }
                },
                { $project: { contact: 0, users: 0, Lead: 0 } },
            ])
            res.status(200).json(result[0]);
    
        } catch (err) {
            console.log('Error:', err);
            res.status(400).json({ Error: err });
        }
}

const deleteData = async (req, res) => {
  try {
          const result = await MeetingHistory.findByIdAndUpdate(req.params.id, { deleted: true });
          res.status(200).json({ message: "Meeting Removed Successfully", result })
      } catch (err) {
          res.status(404).json({ message: "error", err })
      }
}

const deleteMany = async (req, res) => {
    try {
            const result = await MeetingHistory.updateMany({ _id: { $in: req.body } }, { $set: { deleted: true } });
    
            if (result?.matchedCount > 0 && result?.modifiedCount > 0) {
                return res.status(200).json({ message: "Meetings Removed successfully", result });
            }
            else {
                return res.status(404).json({ success: false, message: "Failed to remove Meetings" })
            }
    
        } catch (err) {
            return res.status(404).json({ success: false, message: "error", err });
        }
}

module.exports = { add, index, view, deleteData, deleteMany }