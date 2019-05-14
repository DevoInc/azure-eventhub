const devo = require("@devo/nodejs-sdk");
const fs = require("fs");
const utils = require("./util");
const config = require("./config.json");
const sizeof = require("object-sizeof");

module.exports = async function (context, eventHubMessages) {
    context.log(`JavaScript eventhub trigger function called for message array ${eventHubMessages}`);
    let events = 0;
    let events_size = 0;
    let zone = utils.formatRegion(config.zone);
    let senders = {};
    let default_opt = {
        host: config.host,
        port: config.port,
        ca: fs.readFileSync(__dirname+"/certs/chain.crt"),
        cert: fs.readFileSync(__dirname+"/certs/mydomain.crt"),
        key: fs.readFileSync(__dirname+"/certs/mydomain.key")
    };
    let options = {
        "AuditLogs": `cloud.azure.ad.audit.${zone}`,
        "SignInLogs": `cloud.azure.ad.signin.${zone}`,
        "Delete": `cloud.azure.activity.events.${zone}`,
        "Action": `cloud.azure.activity.events.${zone}`,
        "Write": `cloud.azure.activity.events.${zone}`,
        "default": `my.app.azure.losteventhublogs`
    };
    let dlogs = utils.devoLogs(default_opt);

    // Initialize the senders
    for (let opt in options) {
        let conf = Object.assign({}, default_opt);
        conf["tag"] = options[opt];
        senders[opt] = devo.sender(conf);
    };

    eventHubMessages.forEach(message => {
        if (message.constructor !== Object || (message.constructor === Object && !message["records"] )) {
            // Unknown records
            senders["default"].send(JSON.stringify(message));
            dlogs.sendLog("Sent unknown event");
        } else {
            // Sent events to cloud
            for (let m of message.records) {
                events_size += sizeof(m);
                if (options[m.category]){
                    senders[m.category].send(m);
                } else {
                    senders["default"].send(m);
                }
                events += 1;
            }
            // send the stats
            dlogs.sendStats(events, events_size);
        }
    });

    context.done();
};
