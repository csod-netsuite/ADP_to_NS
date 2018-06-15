define([], function () {

    /**
     * Reference for Company specific values
     *
     * @exports {} exports
     *
     * @copyright 2017 Cornerstone OnDemand
     * @author Chan Yi <cyi@csod.com>
     *
     * @NApiVersion 2.x
     * @NModuleScope SameAccount
     */
    var exports = {};
    
    var logEnable = true;

    const EXCLUDED_PAYCODE = ['5017', '5019'];

    var location = {
        'FR': '14',
        'IL': '15',
        'BE': '17',
        'NL': '19',
        'AT': '16',
        'NO': '30',
        'ES': '27',
        'CH': '20'
    };

    var currency = {
        'FR': '4',
        'IL': '5',
        'BE': '4',
        'NL': '4',
        'AT': '4',
        'NO': '17',
        'ES': '4',
        'CH': '15'
    };

    var subsidiary = {
        'FR': '11',
        'IL': '10',
        'BE': '56',
        'NL': '45',
        'AT': '58',
        'NO': '57',
        'ES': '8',
        'CH': '47'
    }

    var JE_HeaderFields = function(subsidiary, currency, location) {
        this.customForm = '106';
        this.subsidiary = subsidiary;
        this.custbodycash_use_category = '6';
        this.currency = currency;
        this.approved = false;
        this.location = location;
        this.lines = [];
    };

    exports.EXCLUDED_PAYCODE = EXCLUDED_PAYCODE;
    exports.location = location;
    exports.currency = currency;
    exports.subsidiary = subsidiary;
    exports.JE_HeaderFields = JE_HeaderFields;
    exports.logEnable = logEnable;
    return exports;
});
