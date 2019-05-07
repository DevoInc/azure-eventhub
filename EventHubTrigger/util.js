const devo = require('@devo/nodejs-sdk');
const dateFormat = require('dateformat');
const os = require("os");

module.exports = {
    devoLogs: function (devo_sender) {
        let senders = {};
        let tables = {
            'stats': `devo.agent.stats`,
            'out': `devo.agent.out`
        };

        /**
         * Initialize the senders
         */
        for (let opt in tables) {
            let conf = Object.assign({}, devo_sender);
            conf['tag'] = tables[opt];
            senders[opt] = devo.sender(conf);
        };

        /**
         * Send custom logs to devo.agent.out table
         */
        this.sendLog = function(log) {
            message = {
                'time': dateFormat(new Date(), 'isoUtcDateTime'),
                'agent': 'azure-eventhub-function',
                'level': 'INFO',
                'name': 'devo-function-app',
                'info': log
            }
            senders['out'].send(JSON.stringify(message));
        };

        /**
         * Send stats to devo.agent.stats table
         */
        this.sendStats = function(events, events_size) {
            message = {
                'time': dateFormat(new Date(), 'isoUtcDateTime'),
                'agent': 'azure-eventhub-function',
                'name': 'devo-function-app',
                'info': `${events} ${events_size}`
            };
            senders['stats'].send(JSON.stringify(message));
        }

        return this;
    }
}
