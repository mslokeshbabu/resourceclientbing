var restify = require('restify');
var builder = require('botbuilder');
var Request = require('tedious').Request;
var Types = require('tedious').TYPES;
var email = require('./sendemail');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: 'c734e282-f433-4e96-bee0-1fdd51f9f343',
    appPassword: 'r36uO6vxkfyxJy6kinY4Nkq'
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//create LUIS recognizer that points at our model and add it as a root '/' dialog
var model = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/bd2a8c49-4154-4771-9127-2ac0f1e41e5e?subscription-key=8a6d7ac6787c4537aab3095d94985a35&timezoneOffset=0.0&verbose=true&q=';
var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer]});
bot.dialog('/', dialog);

// bot.dialog('/', [
//     function (session) {
//         var msg = new builder.Message(session)
//             .textFormat(builder.TextFormat.xml)
//             .attachments([
//                 new builder.HeroCard(session)
//                     .title("Welcome to Resource technical Bot")
//                     .subtitle("Smart resource management")
//                     .text("The smart resource management is a intelligent bot for PMs/SAs/TAs or TFS/Scheduler for resource management")
//                     .images([
//                         builder.CardImage.create(session, "http://www.theoldrobots.com/images26/gakk6.JPG")
//                     ])
//                     .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle"))
//             ]);
//         //session.endDialog(msg);
//     }
// ]);

// // // Add intent handlers
dialog.matches('StartActivity',[
    function (session, args, next){
        // get all the entities 
        session.send('Welcome! We are analyzing your message: \'%s\'', session.message.text);
        var ActivityType = builder.EntityRecognizer.findEntity(args.entities, 'ActivityType');
        var ActivityDuration = builder.EntityRecognizer.findEntity(args.entities, 'ActivityDuration');
        var CandidateType = builder.EntityRecognizer.findEntity(args.entities, 'candidatetype');
        var location = builder.EntityRecognizer.findEntity(args.entities, 'location');
        var technology = builder.EntityRecognizer.findEntity(args.entities, 'technology'); 

        var candidateprofile = session.dialogData.candidate = {
            ActivityType : ActivityType ? ActivityType.entity :null,
            ActivityDuration : ActivityDuration ? ActivityDuration.entity : null,
            CandidateType : CandidateType ? CandidateType.entity : null,
            location : location ? location.entity : null,
            technology : technology ? technology.entity : null
        }
        if (candidateprofile.location){
            console.log(candidateprofile.location);
        }
        
        if (!candidateprofile.technology){
            builder.Prompts.text(session, 'what technology candidate is required?');
        } else {
            next();
        }
    },
    function (session, results, next){
        var tech = session.dialogData.candidate;
        //get the duration
        if (results.response){
            tech.technology = results.response;
        }

        if (tech.technology && !tech.location) {
            builder.Prompts.text(session, 'what location candidate is required?');
        } else {
            next();
        }
    },
    function (session, results, next){
        var loc = session.dialogData.candidate;
        if (results.response){
            loc.location = results.response;
        }
        if (loc.location && loc.technology && !loc.ActivityDuration){
            builder.Prompts.text(session, 'when candidate is required (lead time) eg in 1 week, in 3 months?');
        } else {
            next();
        }

    },
    function (session, results){
        var duration = session.dialogData.candidate;
        if (results.response){
            duration.ActivityDuration = results.response;
        }
        if (duration.location && duration.technology && duration.ActivityDuration){
            duration.address = session.message.address;
            console.log("Initiate database connection");
            var Connection = require('tedious').Connection;  
            var config = {
                userName: 'ravi@mydb-ai-hack.database.windows.net',
                password: 'Nkdc@2018',
                server: 'mydb-ai-hack.database.windows.net',
                options: {
                    encrypt: true, 
                    database: 'MyDB-AI-Hack', 
                    rowCollectionOnRequestCompletion: true
                }
            };
            var connection = new Connection(config);
            connection.on('connect', function(err){
                if (err){
                    console.log('error in connecting ' + err);
                    return;
                }
                session.send('search for candidates in %s to be available with lead time ::%s', duration.location, duration.ActivityDuration);
                executeStatement();
            });

            function executeStatement(){
                var sqlstring = "SELECT * FROM dbo.Employees";
                req = new Request(sqlstring, function(err, rowCount, rows){
                    if (err){
                        console.log(err);
                    }
                    console.log(rowCount + ' rows');
                    session.send ('we are at 1 :: %s', rowCount);
                });

                var result = "";
                req.on('row',function(columns){
                    columns.forEach(function(element) {
                        if (element.value === null){
                            console.log('NULL');
                        } else {
                            result+= element.value + " ";
                        }
                    });
                    email.sendemail(result);
                    console.log(result); 
                    session.send('record: %s',result);
                    result = "";
                });
                req.on('doneInProc',function(rowCount, more){
                console.log(rowCount + ' rows returned');

                });
                connection.execSql(req);
            
            }
       
        }

    }
]);

dialog.matches('StopActivity', [
    function(session, args, next){
        session.send('Thanks for using the service. try searching resources any time: \'%s\'', session.message.text);
    }
]);

dialog.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. I can only search candidates."));