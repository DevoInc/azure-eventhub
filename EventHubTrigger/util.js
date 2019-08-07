const devo = require("@devo/nodejs-sdk");
const dateFormat = require("dateformat");
const config = require("./config.json");

module.exports = {
    devoLogs: function (devoSender) {
        let senders = {};
        let tables = {
            "stats": `devo.agent.stats`,
            "out": `devo.agent.out`
        };

        /**
         * Initialize the senders
         */
        for (let opt in tables) {
            let conf = Object.assign({}, devoSender);
            conf["tag"] = tables[opt];
            senders[opt] = devo.sender(conf);
        };

        /**
         * Send custom logs to devo.agent.out table
         */
        this.sendLog = function(log) {
            if (config.send_logs === false) return;
            message = {
                "time": dateFormat(new Date(), "isoUtcDateTime"),
                "agent": "azure-eventhub-function",
                "level": "INFO",
                "name": "devo-function-app",
                "info": log
            }
            senders["out"].send(JSON.stringify(message));
        };

        /**
         * Send stats to devo.agent.stats table
         */
        this.sendStats = function(events, events_size) {
            if (config.send_stats === false) return;
            message = {
                "time": dateFormat(new Date(), "isoUtcDateTime"),
                "agent": "azure-eventhub-function",
                "name": "devo-function-app",
                "info": `${events} ${events_size}`
            };
            senders["stats"].send(JSON.stringify(message));
        }

        return this;
    },

    formatRegion: function(region) {
        let slugify = function(string) {
            const a = "àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœøṕŕßśșțùúüûǘẃẍÿź·/_,:;";
            const b = "aaaaaaaaceeeeghiiiimnnnooooooprssstuuuuuwxyz------";
            const p = new RegExp(a.split("").join("|"), "g");
            return string.toString().toLowerCase()
                .replace(/\s+/g, "-")
                .replace(p, c => b.charAt(a.indexOf(c)))
                .replace(/&/g, "-and-")
                .replace(/[^\w\-]+/g, "")
                .replace(/\-\-+/g, "-")
                .replace(/^-+/, "")
                .replace(/-+$/, "")
        };
        return slugify(region);
    },

    _getBuffCert: function(cert){
        cert = cert.replace(/\s/g, '\n');
        cert = cert.replace(/-----BEGIN\nCERTIFICATE-----/g, '-----BEGIN CERTIFICATE-----\n');
        cert = cert.replace(/-----END\nCERTIFICATE-----/g, '-----END CERTIFICATE-----\n');
        cert = cert.replace(/-----BEGIN\nRSA\nPRIVATE\nKEY-----/g, '-----BEGIN RSA PRIVATE KEY-----\n');
        cert = cert.replace(/-----END\nRSA\nPRIVATE\nKEY-----/g, '-----END RSA PRIVATE KEY-----\n');
        return Buffer.from(cert, 'utf8');
    },

    getCertificate: function(context, cert_type) {
        if (!['CA', 'Key', 'Cert'].includes(cert_type))
            throw `${cert_type} not valid. Must be one of: [CA, Cert, Key]`;

        if (`${cert_type}_in_KV` in config && config[`${cert_type}_in_KV`]) {
            context.log(`checking ${cert_type} in Key Vault`);
            let env_name = `domain${cert_type}`;
            if (env_name in process.env ){
                return this._getBuffCert(process.env[env_name]);
            }
            throw `${env_name} is not defined in the enviroment process. It must be declared.`;
        } else {
            context.log(`checking ${cert_type} in File`);
            let file_name = (cert_type === 'CA') ? 'chain' : config.domain_name;
            let file_ext = (cert_type === 'Key') ? 'key' : 'crt';
            let file_path = __dirname+`/certs/${file_name}.${file_ext}`;
            context.log(`reading file ${file_path}`);
            try {
                return fs.readFileSync(file_path);
            } catch(err) {
                throw `Can't open file ${file_name}.${file_ext}. ${err}`;
            }
        }
    }
}
