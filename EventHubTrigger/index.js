const devo = require("@devo/nodejs-sdk");
const utils = require("./util");
const config = require("./config.json");
const sizeof = require("object-sizeof");

module.exports = async function (context, eventHubMessages) {

    context.log(`JavaScript eventhub trigger function called`);

    let ca = utils.getCertificate(context, 'CA');
    let cert = utils.getCertificate(context, 'Cert');
    let key = utils.getCertificate(context, 'Key');

    let events = 0;
    let events_size = 0;
    let zone = utils.formatRegion(config.zone);
    let senders = {};
    let default_opt = {
        host: config.host,
        port: config.port,
        ca: ca,
        cert: cert,
        key: key
    };
    let options = {
        "AuditLogs": `cloud.azure.ad.audit.${zone}`,
        "SignInLogs": `cloud.azure.ad.signin.${zone}`,
        "Delete": `cloud.azure.activity.events.${zone}`,
        "Action": `cloud.azure.activity.events.${zone}`,
        "Write": `cloud.azure.activity.events.${zone}`,
        "Administrative": `cloud.azure.activity.events.${zone}`,
        "ServiceHealth": `cloud.azure.activity.events.${zone}`,
        "ResourceHealth": `cloud.azure.activity.events.${zone}`,
        "Alert": `cloud.azure.activity.events.${zone}`,
        "Autoscale": `cloud.azure.activity.events.${zone}`,
        "Security": `cloud.azure.activity.events.${zone}`,
        "Recommendation": `cloud.azure.activity.events.${zone}`,
        "Policy": `cloud.azure.activity.events.${zone}`,
        "default": `my.app.azure.losteventhublogs`
    };
    let dlogs = utils.devoLogs(default_opt);

    // Initialize the senders
    for (let opt in options) {
        let conf = Object.assign({}, default_opt);
        conf["tag"] = options[opt];
        senders[opt] = devo.sender(conf);
    };

    eventHubMessages.forEach(msg => {

        let message = {};
        try {
            message = JSON.parse(msg);
        } catch {
            context.error('JSON parser error. msg is not an object');
        }

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
