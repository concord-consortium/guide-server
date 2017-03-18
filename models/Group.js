const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  id: String,
  challengeId: String,
  googleEcdMatrixId: String
});

const groupSchema = new mongoose.Schema({
  id: String,
  name: String,
  challenges: [challengeSchema]
}, { timestamps: true });

groupSchema.methods.replace = function(updatedGroup) {
      this.name = updatedGroup.name;
      if (updatedGroup.hasOwnProperty("challenges") && updatedGroup.challenges != null) {
        this.challenges = updatedGroup.challenges;

        for (let challenge of this.challenges) {
          if (challenge.id == "new") {
            challenge.id = mongoose.Types.ObjectId()
          }
        }
      } else {
        this.challenges = [];
      }
}

groupSchema.methods.clone = function() {
      var newGroup = Group.create();
      newGroup.name = this.name + " - copy";

      for (let challenge of this.challenges) {
        newGroup.challenges.push({
          id: mongoose.Types.ObjectId(),
          challengeId: challenge.challengeId,
          googleEcdMatrixId: challenge.googleEcdMatrixId
        });
      }

      return newGroup;
}

const Group = mongoose.model('Group', groupSchema);

Group.create = (name) => {
      group = new Group();
      group.id = mongoose.Types.ObjectId();
      group.name = name;
      group.challenges = [];

      return group;
}

module.exports = Group;
