/**
 * CSOD_ADP_Lib_Ref.js
 * @NApiVersion 2.x
 * @NModuleScope Public
 */

define(['N/record'], function (record) {

    /**
     * Reference for Company specific values
     *
     * @exports {} exports
     *
     * @copyright 2017 Cornerstone OnDemand
     * @author Chan Yi <cyi@csod.com>
     *
     */
    var exports = {};
    
    var logEnable = true;

    const EXCLUDED_PAYCODE = ['5017', '5019'];
    
    /**
     * IMPORTANTE!!
     * UPDATE THESE LISTS AFTER ADMIN ADDS COUNTRY CODE TO 
     * CSOD ADP COUNTRY CODE
     */

    var location = {
        'FR': '14',
        'IL': '15',
        'BE': '17',
        'NL': '19',
        'AT': '16',
        'NO': '30',
        'ES': '27',
        'CH': '20',
        'HK': '43',
        'SG': '42',
        'PL': '40',
        'AU': '11',
        'NZ': '34',
        'IN': '9',
        'DE': '10',
        'SE': '23',
        'FIN': '35'
    };

    var currency = {
        'FR': '4',
        'IL': '5',
        'BE': '4',
        'NL': '4',
        'AT': '4',
        'NO': '17',
        'ES': '4',
        'CH': '15',
        'HK': '16',
        'SG': '9',
        'PL': '22',
        'AU': '7',
        'NZ': '12',
        'IN': '6',
        'DE': '4',
        'SE': '10',
        'FIN': '4'
    };

    var subsidiary = {
        'FR': '11',
        'IL': '10',
        'BE': '56',
        'NL': '45',
        'AT': '58',
        'NO': '57',
        'ES': '8',
        'CH': '47',
        'HK': '41',
        'SG': '60',
        'PL': '49',
        'AU': '32',
        'NZ': '18',
        'IN': '7',
        'DE': '12',
        'SE': '46',
        'FIN': '59'
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
