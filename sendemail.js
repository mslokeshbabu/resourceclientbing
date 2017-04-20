module.exports = {

   sendemail: function (body){

            const nodemailer = require ('nodemailer');
            console.log('Inside sendemail body');

            // create reusable transporter object using the default SMTP transport
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'gayathridevi.raghunath@gmail.com',
                    pass: ''
                }

            });

            // setup email data with unicode symbols
            let mailOptions = {
                    from: 'gayathridevi.raghunath@gmail.com', // sender address
                    to: 'm.s.lokeshbabu@accenture.com', // list of receivers
                    subject: 'Hello !', // Subject line
                    text: body // plain text body
            };
                            // send mail with defined transport object
            transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.log(error);
                    }
                    console.log('Message %s sent: %s', info.messageId, info.response);
            });     

            
    }
};