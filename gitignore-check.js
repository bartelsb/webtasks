var nodemailer = require('nodemailer@2.5.0');

module.exports = function(context, callback) {
		
	var payload = context.data;
	var ignoreFileList = [];
  
	if (!payload.commits) {
		console.log("No commits.");
		callback("Push event didn't contain any commits.");
		return;
	}
  
	if (!context.secrets.email) {
		console.log("No email was provided.");
		callback("No email was provided when this webtask was created. Pleas" +
			"e create the webtask again and provide a valid email address.");
		return;
	}
	
	if (!context.secrets.password) {
		console.log("No password was provided.");
		callback("No password was provided when this webtask was created. Pl" +
			"ease create the webtask again and provide a valid password.");
		return;
	}
	
	for (var i = 0; i < payload.commits.length; i++) {
		
		var curCommit = payload.commits[i];
		
		for (var j = 0; j < curCommit.added.length; j++) {
			if (curCommit.added[j].search(/[.]gitignore/i) > -1) {
				addToList(curCommit.added[j], ignoreFileList);
			}
		}
		
		for (var j = 0; j < curCommit.modified.length; j++) {
			if (curCommit.modified[j].search(/[.]gitignore/i) > -1) {
				addToList(curCommit.modified[j], ignoreFileList);
			}
		}
	}

	if(ignoreFileList.length > 0) {
		var emailText = generateEmailText(payload, ignoreFileList);
		sendEmail(context, emailText);
	}
	
	callback(null, ignoreFileList);
}


/** HELPER FUNCTIONS **/
function sendEmail(context, emailText) {
		
	var transporter = nodemailer.createTransport({
		service: 'Gmail',
		auth: {
			user: context.secrets.email,
			pass: context.secrets.password
		}
	});
	
	var mailOptions = {
		from: context.secrets.email, 
		to: context.secrets.email,
		subject: 'webtask - git rules may need to be rerun',
		text: emailText
	};
	
	transporter.sendMail(mailOptions, function(error, info){
		if(error){
			console.log('Message not sent: ' + error);
		}else{
			console.log('Message sent: ' + info.response);
		};
	});
}

function addToList(filename, ignoreFileList) {
	console.log(filename + " has been added/modified!");
	ignoreFileList[ignoreFileList.length] = filename;
}

function generateEmailText(payload, ignoreFileList) {
	var emailText = "The following files were modified in your most recent " +
		"commit to " + payload.repository.full_name + ":";
	for (var i = 0; i < ignoreFileList.length; i++) {
		emailText += "\n\t" + ignoreFileList[i];
	}
	return emailText += "\n\nThe names of these files indicate that they may" +
		" be used to ignore certain files when making commits to your Git re" +
		"pository. You may need to re-apply the rules in these files. You ca" +
		"n do so by committing all pending changes and then running the foll" +
		"owing Git commands:\n\tgit rm -r --cached .\n\tgit add .\n\tgit com" +
		"mit -m 'reapplying gitignore rules'\n\n-webtask";
}