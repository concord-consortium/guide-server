const Student = require('../models/Student');
const Concept = require('../models/Concept');

/**
 * GET /
 * Session page.
 */
exports.index = (req, res) => {
  const studentId = req.params.studentId;
  if (!studentId) {
    return res.redirect(process.env.BASE_PATH + 'students');
  }

  Student.findOne({ 'id': studentId }).exec()
    .then((student) => {
      if (req.query.view == "json") {
          res.render('json', {
          title: 'Student JSON',
          json: JSON.stringify(student, undefined, 2)
        });
      } else {
        res.render('student', {
          title: 'Student',
          student: student,
          concepts: Concept.getAll()
        });
      }
    })
    .catch((err) => {
      console.error(err);
      req.flash('errors', { msg: 'Unable to load student. ' + err.toString()});
      return res.redirect(process.env.BASE_PATH + 'students');
    });
};

exports.reset = (req, res) => {
  if (req.body.studentId) {
    var studentId = req.body.studentId;
    console.info("Reset student model: " + studentId);
    Student.findOne({ 'id': studentId }).exec()
      .then((student) => {
        console.info("Save student: " + studentId);
        return student.reset();
      })
      .then(() => {
        return res.redirect(process.env.BASE_PATH + 'student/' + studentId);
      })
      .catch((err) => {
        console.error(err);
        req.flash('errors', { msg: 'Unable to reset student. ' + err.toString()});
        return res.redirect(process.env.BASE_PATH + 'students');
      });
  }
}