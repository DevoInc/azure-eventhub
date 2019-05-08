const devo = require('@devo/nodejs-sdk');
const dateFormat = require('dateformat');
const os = require("os");
const config = require('./config.json');

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
            if (config.send_logs === false) return;
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
            if (config.send_stats === false) return;
            message = {
                'time': dateFormat(new Date(), 'isoUtcDateTime'),
                'agent': 'azure-eventhub-function',
                'name': 'devo-function-app',
                'info': `${events} ${events_size}`
            };
            senders['stats'].send(JSON.stringify(message));
        }

        return this;
    },

    formatRegion: function(region) {
        let slugify = function(string) {
            const a = 'àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœøṕŕßśșțùúüûǘẃẍÿź·/_,:;';
            const b = 'aaaaaaaaceeeeghiiiimnnnooooooprssstuuuuuwxyz------';
            const p = new RegExp(a.split('').join('|'), 'g');
            return string.toString().toLowerCase()
                .replace(/\s+/g, '-')
                .replace(p, c => b.charAt(a.indexOf(c)))
                .replace(/&/g, '-and-')
                .replace(/[^\w\-]+/g, '')
                .replace(/\-\-+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '')
        };
        return slugify(region);
    }
}
